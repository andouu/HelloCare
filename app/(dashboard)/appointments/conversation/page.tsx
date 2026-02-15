'use client';

import { useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TbArrowBackUp } from "react-icons/tb";
import { useStreamingTranscription } from "@/app/hooks/useStreamingTranscription";
import { VIEW_CARD_CLASS, VIEW_COMPONENTS } from "./views";
import { formatConversationDate, parseDateFromSearchParams, getTrailingWords } from "./utils";
import type { ConversationViewId } from "./types";
import { FULL_PAGE_VIEWS } from "./types";

const TRAILING_WORD_COUNT = 15;

export default function ConversationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentDate = parseDateFromSearchParams(searchParams);
  const dateLabel = formatConversationDate(appointmentDate);

  const [view, setView] = useState<ConversationViewId>("idle");
  const [summarySegments, setSummarySegments] = useState<string[]>([]);

  const {
    startRecording,
    stopRecording,
    isRecording,
    isStarting,
    isStopping,
    segments,
    interimTranscript,
    isSupported,
    tokenStatus,
    clearTranscript,
  } = useStreamingTranscription();

  const trailingWords = useMemo(
    () => getTrailingWords(segments, interimTranscript, TRAILING_WORD_COUNT),
    [segments, interimTranscript],
  );

  const canRecord = isSupported && tokenStatus === "ready";

  // ---- view transition handlers ----

  const handleStartRecording = useCallback(async () => {
    clearTranscript();
    await startRecording();
    setView("recording");
  }, [startRecording, clearTranscript]);

  const handleStopRecording = useCallback(async () => {
    let fullTranscript = "";
    try {
      fullTranscript = await stopRecording();
    } finally {
      setView("summary");
    }
    const text = fullTranscript.trim();
    if (text) {
      setSummarySegments((prev) => [...prev, text]);
    }
  }, [stopRecording]);

  const handleMarkCorrect = useCallback(() => setView("confirmed"), []);
  const handleMarkIncorrect = useCallback(() => setView("retry"), []);

  const handleRerecord = useCallback(() => {
    clearTranscript();
    setSummarySegments([]);
    setView("idle");
  }, [clearTranscript]);

  const handleContinueRecording = useCallback(() => {
    clearTranscript();
    setView("idle");
  }, [clearTranscript]);

  const handleDone = useCallback(() => setView("visitSummary"), []);

  const handleGoHome = useCallback(() => {
    router.push("/");
  }, [router]);

  // ---- view rendering ----

  function renderView() {
    switch (view) {
      case "idle":
        return (
          <VIEW_COMPONENTS.idle
            onStartRecording={handleStartRecording}
            canRecord={canRecord}
            isStarting={isStarting}
          />
        );
      case "recording":
        return (
          <VIEW_COMPONENTS.recording
            trailingWords={trailingWords}
            onStopRecording={handleStopRecording}
            isStopping={isStopping}
            canRecord={canRecord}
          />
        );
      case "summary":
        return (
          <VIEW_COMPONENTS.summary
            segments={summarySegments}
            onMarkCorrect={handleMarkCorrect}
            onMarkIncorrect={handleMarkIncorrect}
          />
        );
      case "retry":
        return (
          <VIEW_COMPONENTS.retry
            onRerecord={handleRerecord}
            onMarkCorrect={handleMarkCorrect}
          />
        );
      case "confirmed":
        return (
          <VIEW_COMPONENTS.confirmed
            onContinueRecording={handleContinueRecording}
            onDone={handleDone}
            onMarkIncorrect={handleMarkIncorrect}
          />
        );
      case "visitSummary":
        return (
          <VIEW_COMPONENTS.visitSummary
            segments={summarySegments}
            dateLabel={dateLabel}
            onGoHome={handleGoHome}
          />
        );
      default: {
        const _: never = view;
        return null;
      }
    }
  }

  // Full-page views render without the shared header/card/footer chrome
  if (FULL_PAGE_VIEWS.has(view)) {
    return <>{renderView()}</>;
  }

  return (
    <div className="w-full h-screen flex flex-col gap-5 p-5">
      <header className="flex flex-col pt-6 gap-4 mb-8">
        <span className="text-xl font-bold tracking-tight">Conversation</span>
        <span className="text-neutral-400 leading-5 text-sm">
          This conversation is about a doctor&apos;s visit on {dateLabel}
        </span>
      </header>

      <div
        className={`w-full h-full flex flex-col rounded-2xl border px-4 transition-colors overflow-hidden ${VIEW_CARD_CLASS[view as keyof typeof VIEW_CARD_CLASS]}`}
      >
        {renderView()}
      </div>

      <footer className="pb-15 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full h-12 text-sm text-white rounded-full flex items-center px-5 bg-red-500 active:bg-red-400"
        >
          <TbArrowBackUp className="w-4 h-4 shrink-0" aria-hidden />
          <span className="flex-1 text-center">I don&apos;t want to record, go back</span>
          <span className="w-4 shrink-0" aria-hidden />
        </button>
      </footer>
    </div>
  );
}
