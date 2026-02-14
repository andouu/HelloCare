"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  StreamingTranscriber,
  TurnEvent,
} from "assemblyai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Segment {
  id: string;
  text: string;
}

export interface UseStreamingTranscriptionOptions {
  /** BCP-47 language tag – currently unused by AssemblyAI streaming but kept
   *  for forward-compatibility with future multi-language support. */
  language?: string;
}

export type TokenStatus = "loading" | "ready" | "error";

export interface UseStreamingTranscriptionReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
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
  _options?: UseStreamingTranscriptionOptions,
): UseStreamingTranscriptionReturn {
  // ---- state ---------------------------------------------------------------
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
  const [tokenError, setTokenError] = useState<Error | null>(null);

  // ---- refs ----------------------------------------------------------------
  const tokenRef = useRef<string | null>(null);
  const transcriberRef = useRef<StreamingTranscriber | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const segmentIdRef = useRef(0);
  /** Track turn_order values we've already committed as segments to avoid duplicate segments from repeated end_of_turn events. */
  const committedTurnOrdersRef = useRef<Set<number>>(new Set());

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
        const data: { token: string } = await res.json();
        if (!cancelled) {
          tokenRef.current = data.token;
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

  /** Close the streaming transcriber connection. */
  const cleanupTranscriber = useCallback(async () => {
    if (transcriberRef.current) {
      try {
        await transcriberRef.current.close(false);
      } catch {
        /* best-effort */
      }
      transcriberRef.current = null;
    }
  }, []);

  // ---- stopRecording -------------------------------------------------------

  const stopRecording = useCallback(() => {
    cleanupAudio();
    void cleanupTranscriber();
    setIsRecording(false);
    setInterimTranscript("");
  }, [cleanupAudio, cleanupTranscriber]);

  // ---- startRecording ------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (!tokenRef.current) {
      setError(new Error("Transcription token is not ready yet."));
      return;
    }

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

      // 4. Create & configure the streaming transcriber.
      committedTurnOrdersRef.current.clear();
      const transcriber = new ST({
        sampleRate: actualSampleRate,
        formatTurns: true,
        token: tokenRef.current,
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
            setSegments((prev) => [...prev, { id, text: turn.transcript }]);
          }
          setInterimTranscript("");
        } else {
          setInterimTranscript(turn.transcript);
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
    }
  }, [cleanupAudio, cleanupTranscriber]);

  // ---- clearError / clearTranscript ----------------------------------------

  const clearError = useCallback(() => setError(null), []);

  const clearTranscript = useCallback(() => {
    setSegments([]);
    setInterimTranscript("");
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
