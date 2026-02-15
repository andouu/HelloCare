"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HiMicrophone, HiStop } from "react-icons/hi";
import { motion, AnimatePresence } from "motion/react";
import { useStreamingTranscription } from "@/app/hooks/useStreamingTranscription";
import { useToolExecutor } from "@/app/hooks/useToolExecutor";
import { useAuth } from "@/lib/auth-context";
import {
  useUserMetadata,
  useUserData,
  useAppointments,
} from "@/lib/firestore";
import { Spinner } from "./Spinner";

type FabState = "idle" | "recording" | "processing" | "response";

const RESPONSE_DISMISS_MS = 5000;
const MAX_USER_TEXT_LENGTH = 60;

function buildDisplayTranscript(
  segments: Array<{ text: string }>,
  interim: string,
): string {
  const finals = segments.map((s) => s.text.trim()).filter(Boolean);
  const joinedFinals = finals.join(" ").trim();
  const interimTrimmed = interim.trim();
  if (!interimTrimmed) return joinedFinals;
  if (!joinedFinals) return interimTrimmed;

  const lowerFinals = joinedFinals.toLowerCase();
  const lowerInterim = interimTrimmed.toLowerCase();
  if (lowerFinals.endsWith(lowerInterim)) return joinedFinals;

  const lastFinal = finals[finals.length - 1] ?? "";
  const lowerLastFinal = lastFinal.toLowerCase();
  if (lowerInterim === lowerLastFinal) return joinedFinals;
  if (lowerInterim.startsWith(lowerLastFinal) && lowerLastFinal.length > 0) {
    const suffix = interimTrimmed.slice(lastFinal.length).trimStart();
    return suffix ? `${joinedFinals} ${suffix}` : joinedFinals;
  }

  return `${joinedFinals} ${interimTrimmed}`;
}

export function VoiceCommandFAB() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: userMetadata } = useUserMetadata();
  const userData = useUserData();
  const { appointments } = useAppointments();

  const [fabState, setFabState] = useState<FabState>("idle");
  const fabStateRef = useRef<FabState>("idle");
  const [userTranscript, setUserTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep ref in sync so the click handler always reads the latest state.
  fabStateRef.current = fabState;

  const { executeToolCall } = useToolExecutor();

  const {
    startRecording,
    stopRecording,
    isRecording,
    isStarting,
    isStopping,
    segments,
    interimTranscript,
    error: transcriptionError,
    tokenError,
    clearError,
    clearTranscript,
    isSupported,
    tokenStatus,
  } = useStreamingTranscription();

  // Build context for the voice-command API (same shape as chat context)
  const voiceContext = useMemo(
    () => ({
      userMetadata: userMetadata
        ? {
            id: userMetadata.id,
            firstName: userMetadata.firstName,
            lastName: userMetadata.lastName,
            email: userMetadata.email,
            preferredLanguage: userMetadata.preferredLanguage,
          }
        : null,
      healthNotes: userData.healthNotes.map((n) => ({
        id: n.id,
        date: n.date instanceof Date ? n.date.toISOString() : n.date,
        type: n.type,
        title: n.title,
        description: n.description,
      })),
      actionItems: userData.actionItems.map((a) => ({
        id: a.id,
        dueBy: a.dueBy instanceof Date ? a.dueBy.toISOString() : a.dueBy,
        type: a.type,
        title: a.title,
        description: a.description,
        status: a.status,
        priority: a.priority,
        medication: a.medication,
      })),
      sessionMetadata: userData.sessionMetadata.map((s) => ({
        id: s.id,
        date: s.date instanceof Date ? s.date.toISOString() : s.date,
        title: s.title,
        summary: s.summary,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        appointmentTime:
          a.appointmentTime instanceof Date
            ? a.appointmentTime.toISOString()
            : a.appointmentTime,
        scheduledOn:
          a.scheduledOn instanceof Date
            ? a.scheduledOn.toISOString()
            : a.scheduledOn,
      })),
    }),
    [userMetadata, userData.healthNotes, userData.actionItems, userData.sessionMetadata, appointments],
  );

  const canRecord = isSupported && tokenStatus === "ready";
  const liveTranscript = useMemo(
    () => buildDisplayTranscript(segments, interimTranscript),
    [segments, interimTranscript],
  );

  const scheduleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setFabState("idle");
      setUserTranscript("");
      setResponseText("");
    }, RESPONSE_DISMISS_MS);
  }, []);

  const handleFabClick = useCallback(async () => {
    // Read latest state from ref to avoid stale closures.
    const state = fabStateRef.current;

    // Ignore repeated clicks only while stop cleanup is in progress.
    if (isStopping) return;

    // Dismiss bubbles on tap
    if (state === "response") {
      setFabState("idle");
      setUserTranscript("");
      setResponseText("");
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      return;
    }

    if (state === "processing") return;

    if (state === "recording" || isRecording) {
      // Stop recording and process
      setFabState("processing");
      const snapshot = liveTranscript.trim();
      const transcript = ((await stopRecording()).trim() || snapshot).trim();

      if (!transcript) {
        setUserTranscript("");
        setResponseText("I didn't catch that. Please try again.");
        setFabState("response");
        scheduleDismiss();
        return;
      }

      setUserTranscript(transcript);

      try {
        const res = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, context: voiceContext }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error((errBody as { error?: string }).error ?? `Request failed (${res.status})`);
        }

        const data = (await res.json()) as {
          text: string;
          toolCalls: Array<{ toolName: string; args: unknown }>;
        };

        // Execute tool calls client-side
        for (const tc of data.toolCalls) {
          void executeToolCall(tc.toolName, tc.args);
        }

        // Show response
        const text = data.text || (data.toolCalls.length > 0 ? "Done." : "I didn't catch that.");
        setResponseText(text);
        setFabState("response");
        scheduleDismiss();
      } catch (err) {
        console.error("Voice command error:", err);
        setResponseText("Something went wrong. Please try again.");
        setFabState("response");
        scheduleDismiss();
      }
      return;
    }

    // Start recording
    clearError();
    clearTranscript();
    setUserTranscript("");
    setResponseText("");
    setFabState("recording");
    await startRecording();
  }, [isStopping, isRecording, stopRecording, liveTranscript, voiceContext, executeToolCall, clearError, clearTranscript, startRecording, scheduleDismiss]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (fabState !== "recording") return;
    const text = liveTranscript.trim();
    if (text) setUserTranscript(text);
  }, [fabState, liveTranscript]);

  useEffect(() => {
    if (!transcriptionError && !tokenError) return;
    const details = tokenError?.message ?? transcriptionError?.message;
    if (!details) return;
    if (fabState === "recording" || fabState === "processing") {
      setResponseText("Transcription failed. Please try again.");
      setFabState("response");
      scheduleDismiss();
    }
  }, [fabState, transcriptionError, tokenError, scheduleDismiss]);

  // Don't render on home page (ChatWidget already has its own mic) or if not logged in
  if (pathname === "/" || !user) return null;

  const isActive = fabState === "recording" || isStarting;

  return (
    <div className="fixed bottom-6 left-4 z-40 flex flex-col items-start gap-2">
      {/* Transcript + response bubbles */}
      <AnimatePresence>
        {(fabState === "recording" || fabState === "processing" || fabState === "response") && userTranscript && (
          <motion.div
            key="bubbles"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex max-w-[18rem] flex-col gap-1.5"
          >
            {/* User transcript (light bg, truncated) */}
            <div className="rounded-2xl bg-neutral-200 px-3 py-2 text-xs text-neutral-600 shadow">
              {userTranscript.length > MAX_USER_TEXT_LENGTH
                ? `…${userTranscript.slice(-MAX_USER_TEXT_LENGTH)}`
                : userTranscript}
            </div>

            {/* Model response or loading indicator */}
            {fabState === "processing" ? (
              <div className="flex items-center gap-2 rounded-2xl bg-neutral-800 px-3 py-2 text-sm text-neutral-400 shadow-lg">
                <Spinner size="sm" theme="amber" />
                <span>Thinking…</span>
              </div>
            ) : responseText ? (
              <div className="rounded-2xl bg-neutral-800 px-3 py-2.5 text-sm text-white shadow-lg">
                {responseText}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <button
        type="button"
        onClick={() => void handleFabClick()}
        disabled={!canRecord && fabState === "idle"}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          isActive
            ? "bg-red-500 text-white hover:bg-red-600"
            : fabState === "processing"
              ? "bg-neutral-400 text-white cursor-wait"
              : "bg-neutral-800 text-white hover:bg-neutral-700"
        } disabled:opacity-60 disabled:cursor-not-allowed`}
        aria-label={
          isActive ? "Stop voice command" : fabState === "processing" ? "Processing..." : "Voice command"
        }
      >
        {fabState === "processing" ? (
          <Spinner size="sm" theme="amber" />
        ) : isActive ? (
          <HiStop className="h-6 w-6" />
        ) : (
          <HiMicrophone className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
