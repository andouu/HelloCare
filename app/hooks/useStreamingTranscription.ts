"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  StreamingTranscriber,
  StreamingSpeechModel,
  TurnEvent,
} from "assemblyai";
import {
  STREAMING_KEYTERMS_MEDICATIONS,
  STREAMING_KEYTERMS_MEDICAL_TERMS,
} from "@/lib/assemblyai/keyterms";
import { resolveLanguageTag } from "@/lib/i18n";
import { debugLog } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Segment {
  id: string;
  text: string;
}

export interface UseStreamingTranscriptionOptions {
  /** BCP-47 language tag from user preferences (for STT model selection). */
  languageTag?: string;
  /** @deprecated Use `languageTag`. */
  language?: string;
  /** Called with RMS audio level (0–1) during recording for visualization. */
  onAudioLevel?: (level: number) => void;
}

export type TokenStatus = "loading" | "ready" | "error";

export interface UseStreamingTranscriptionReturn {
  startRecording: () => Promise<void>;
  /** Stops recording and returns the final transcript. Waits for AssemblyAI to finalize. */
  stopRecording: () => Promise<string>;
  isRecording: boolean;
  /** True while startRecording() is in progress (mic + connection setup). */
  isStarting: boolean;
  /** True while stopRecording() is in progress (waiting for AssemblyAI to finalize). */
  isStopping: boolean;
  segments: Segment[];
  interimTranscript: string;
  error: Error | null;
  clearError: () => void;
  clearTranscript: () => void;
  isSupported: boolean;
  tokenStatus: TokenStatus;
  tokenError: Error | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Float32 PCM samples (–1 … +1) to 16-bit signed integers. */
function float32ToInt16(float32: Float32Array): ArrayBufferLike {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16.buffer;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStreamingTranscription(
  options?: UseStreamingTranscriptionOptions,
): UseStreamingTranscriptionReturn {
  const onAudioLevelRef = useRef(options?.onAudioLevel);
  onAudioLevelRef.current = options?.onAudioLevel;
  const languageTagRef = useRef(options?.languageTag ?? options?.language);
  languageTagRef.current = options?.languageTag ?? options?.language;
  // ---- state ---------------------------------------------------------------
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
  const [tokenError, setTokenError] = useState<Error | null>(null);

  // ---- refs ----------------------------------------------------------------
  const tokenRef = useRef<string | null>(null);
  const turnDetectionRef = useRef<{
    endOfTurnConfidenceThreshold: number;
    minEndOfTurnSilenceWhenConfident: number;
    maxTurnSilence: number;
  } | null>(null);
  const keytermsEnabledRef = useRef<boolean>(false);
  const transcriberRef = useRef<StreamingTranscriber | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const segmentIdRef = useRef(0);
  /** Track turn_order values we've already committed as segments to avoid duplicate segments from repeated end_of_turn events. */
  const committedTurnOrdersRef = useRef<Set<number>>(new Set());
  /** Ref to read final transcript after close() – updated synchronously in turn handler. */
  const transcriptRef = useRef<{ segments: Segment[]; interim: string }>({ segments: [], interim: "" });

  // ---- derived -------------------------------------------------------------
  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  // ---- fetch temporary token on mount --------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchToken() {
      try {
        const res = await fetch("/api/assemblyai-token", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ??
              `Token request failed (${res.status})`,
          );
        }
        const data = (await res.json()) as {
          token: string;
          turnDetection?: {
            endOfTurnConfidenceThreshold: number;
            minEndOfTurnSilenceWhenConfident: number;
            maxTurnSilence: number;
          };
          keytermsEnabled?: boolean;
        };
        if (!cancelled) {
          tokenRef.current = data.token;
          turnDetectionRef.current = data.turnDetection ?? null;
          keytermsEnabledRef.current = data.keytermsEnabled ?? false;
          setTokenStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setTokenError(
            err instanceof Error ? err : new Error(String(err)),
          );
          setTokenStatus("error");
        }
      }
    }

    fetchToken();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- cleanup helpers -----------------------------------------------------

  /** Tear down the Web Audio graph and stop the microphone. */
  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  /** Close the streaming transcriber connection. Waits for session termination so final turn events are received. */
  const cleanupTranscriber = useCallback(async () => {
    if (transcriberRef.current) {
      try {
        await transcriberRef.current.close(true);
      } catch {
        /* best-effort */
      }
      transcriberRef.current = null;
    }
  }, []);

  // ---- stopRecording -------------------------------------------------------

  const stopRecording = useCallback(async (): Promise<string> => {
    setIsStopping(true);
    try {
      cleanupAudio();
      await cleanupTranscriber();
      setIsRecording(false);
      setInterimTranscript("");
      const { segments: segs, interim } = transcriptRef.current;
      const full = [...segs.map((s) => s.text), interim].filter(Boolean).join(" ");
      return full;
    } finally {
      setIsStopping(false);
    }
  }, [cleanupAudio, cleanupTranscriber]);

  // ---- startRecording ------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (!tokenRef.current) {
      setError(new Error("Transcription token is not ready yet."));
      return;
    }

    setIsStarting(true);
    try {
      // 1. Dynamically import the SDK (tree-shakes Node-only code in the
      //    browser and avoids SSR issues).
      const { StreamingTranscriber: ST } = await import("assemblyai");

      // 2. Request microphone access.
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16_000,
        },
      });
      mediaStreamRef.current = mediaStream;

      // 3. Set up Web Audio capture.
      //    We request 16 kHz but the browser may use a different rate.
      //    AssemblyAI is told the actual rate so it resamples on its end.
      const audioContext = new AudioContext({ sampleRate: 16_000 });
      audioContextRef.current = audioContext;
      const actualSampleRate = audioContext.sampleRate;


      // 4. Create & configure the streaming transcriber (turn detection + keyterms from API/env).
      committedTurnOrdersRef.current.clear();
      transcriptRef.current = { segments: [], interim: "" };
      const turnDetection = turnDetectionRef.current;
      const preferredLanguageTag = resolveLanguageTag(languageTagRef.current);
      const isLikelyEnglish = preferredLanguageTag.toLowerCase().startsWith("en");
      const keytermsEnabled = keytermsEnabledRef.current && isLikelyEnglish;
      const speechModel: StreamingSpeechModel = "universal-streaming-multilingual";
      const languageDetection = true;
      debugLog("Key terms are enabled:" + keytermsEnabled);
      debugLog(
        `[AssemblyAI] streaming model=${speechModel}, languageDetection=${String(languageDetection)}, preferredLanguage=${preferredLanguageTag}`,
      );

      const transcriber = new ST({
        sampleRate: actualSampleRate,
        formatTurns: true,
        token: tokenRef.current,
        speechModel,
        languageDetection,
        ...(keytermsEnabled && {
          keytermsPrompt: [
            ...STREAMING_KEYTERMS_MEDICATIONS,
            ...STREAMING_KEYTERMS_MEDICAL_TERMS,
          ],
        }),
        ...(turnDetection && {
          endOfTurnConfidenceThreshold: turnDetection.endOfTurnConfidenceThreshold,
          minEndOfTurnSilenceWhenConfident:
            turnDetection.minEndOfTurnSilenceWhenConfident,
          maxTurnSilence: turnDetection.maxTurnSilence,
        }),
      });

      transcriber.on("open", ({ id }) => {
        console.log(`[AssemblyAI] Session opened: ${id}`);
      });

      transcriber.on("error", (err) => {
        console.error("[AssemblyAI] Error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      });

      transcriber.on("close", (code, reason) => {
        console.log("[AssemblyAI] Session closed:", code, reason);
      });

      transcriber.on("turn", (turn: TurnEvent) => {
        if (!turn.transcript) return;

        if (turn.end_of_turn) {
          // Only commit a segment once per turn_order to avoid duplicates from repeated end_of_turn events.
          const alreadyCommitted = committedTurnOrdersRef.current.has(turn.turn_order);
          if (!alreadyCommitted) {
            committedTurnOrdersRef.current.add(turn.turn_order);
            const id = `seg-${++segmentIdRef.current}`;
            const seg = { id, text: turn.transcript };
            setSegments((prev) => [...prev, seg]);
            transcriptRef.current = {
              segments: [...transcriptRef.current.segments, seg],
              interim: "",
            };
          } else {
            transcriptRef.current = { ...transcriptRef.current, interim: "" };
          }
          setInterimTranscript("");
        } else {
          setInterimTranscript(turn.transcript);
          transcriptRef.current = { ...transcriptRef.current, interim: turn.transcript };
        }
      });

      // 5. Connect to AssemblyAI.
      await transcriber.connect();
      transcriberRef.current = transcriber;

      // 6. Wire up the audio processing pipeline.
      const source = audioContext.createMediaStreamSource(mediaStream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!transcriberRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        transcriberRef.current.sendAudio(float32ToInt16(input));
        const cb = onAudioLevelRef.current;
        if (cb) {
          let sum = 0;
          for (let i = 0; i < input.length; i++) {
            sum += input[i] * input[i];
          }
          const rms = Math.sqrt(sum / input.length);
          cb(Math.min(1, rms * 40));
        }
      };

      source.connect(processor);
      // ScriptProcessorNode requires a destination connection to fire events.
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setError(null);
    } catch (err) {
      cleanupAudio();
      void cleanupTranscriber();
      setError(
        err instanceof Error ? err : new Error(String(err)),
      );
    } finally {
      setIsStarting(false);
    }
  }, [cleanupAudio, cleanupTranscriber]);

  // ---- clearError / clearTranscript ----------------------------------------

  const clearError = useCallback(() => setError(null), []);

  const clearTranscript = useCallback(() => {
    setSegments([]);
    setInterimTranscript("");
    transcriptRef.current = { segments: [], interim: "" };
    segmentIdRef.current = 0;
    committedTurnOrdersRef.current.clear();
  }, []);

  // ---- cleanup on unmount --------------------------------------------------

  useEffect(() => {
    return () => {
      cleanupAudio();
      void cleanupTranscriber();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- return --------------------------------------------------------------

  return {
    startRecording,
    stopRecording,
    isRecording,
    isStarting,
    isStopping,
    segments,
    interimTranscript,
    error,
    clearError,
    clearTranscript,
    isSupported,
    tokenStatus,
    tokenError,
  };
}
