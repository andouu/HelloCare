"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRealtimeWebRTCSource,
  fetchClientSecret,
  isRealtimeWebRTCSupported,
} from "./sources/realtimeWebRTCSource";
import type { TranscriptSegment } from "./types";
import { debugLog } from "../logger";

function generateSegmentId(): string {
  return `seg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type TokenStatus = "idle" | "loading" | "ready" | "error";

export type UseStreamingTranscriptionOptions = {
  /** Reserved for future options (e.g. language override via session config). */
  language?: string;
};

export type UseStreamingTranscriptionReturn = {
  /** Start streaming transcription (uses cached token, connects WebRTC, starts mic). */
  startRecording: () => Promise<void>;
  /** Stop streaming and close connection. */
  stopRecording: () => void;
  /** Currently recording. */
  isRecording: boolean;
  /** Final transcript segments in order. */
  segments: TranscriptSegment[];
  /** Live interim transcript while speaking (streaming from Realtime API). */
  interimTranscript: string;
  /** User-facing error. */
  error: Error | null;
  /** Clear error. */
  clearError: () => void;
  /** Reset segments and interim. */
  clearTranscript: () => void;
  /** Whether WebRTC and mic are supported in this browser. */
  isSupported: boolean;
  /** Ephemeral token is fetched on mount; use to disable Record until ready. */
  tokenStatus: TokenStatus;
  /** Set when token fetch fails (tokenStatus === "error"). */
  tokenError: Error | null;
};

/**
 * Hook for live streaming transcription via OpenAI Realtime API (WebRTC).
 * Fetches an ephemeral token on mount and reuses it for all recording sessions until unmount/reload.
 */
export function useStreamingTranscription(
  _options: UseStreamingTranscriptionOptions = {}
): UseStreamingTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("idle");
  const [tokenError, setTokenError] = useState<Error | null>(null);

  const clientSecretRef = useRef<string | null>(null);
  const sourceRef = useRef<ReturnType<typeof createRealtimeWebRTCSource> | null>(null);
  const segmentIndexRef = useRef(0);

  const isSupported = isRealtimeWebRTCSupported();

  // Pre-fetch token on mount so Record is ready immediately; token is reused for all sessions.
  useEffect(() => {
    if (typeof window === "undefined" || !isSupported) return;
    if (clientSecretRef.current) return;

    setTokenStatus("loading");
    setTokenError(null);
    fetchClientSecret()
      .then((secret) => {
        clientSecretRef.current = secret;
        setTokenStatus("ready");
        debugLog("Realtime token ready (cached for session)");
      })
      .catch((err) => {
        const e = err instanceof Error ? err : new Error(String(err));
        setTokenError(e);
        setTokenStatus("error");
      });
  }, [isSupported]);

  const clearError = useCallback(() => setError(null), []);
  const clearTranscript = useCallback(() => {
    setSegments([]);
    setInterimTranscript("");
    segmentIndexRef.current = 0;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setInterimTranscript("");

    if (!isSupported) {
      setError(new Error("WebRTC or microphone is not supported in this browser."));
      return;
    }

    const secret = clientSecretRef.current;
    if (!secret) {
      setError(
        tokenStatus === "loading"
          ? new Error("Transcription is still preparing. Please wait a moment.")
          : new Error("Transcription isn’t ready. Try refreshing the page.")
      );
      return;
    }

    const source = createRealtimeWebRTCSource(
      {
        onInterim: (text) => setInterimTranscript(text),
        onFinal: (text) => {
          debugLog("Final transcription", { text });
          setInterimTranscript("");
          const index = segmentIndexRef.current++;
          setSegments((prev) => [
            ...prev,
            {
              id: generateSegmentId(),
              text,
              receivedAt: Date.now(),
              index,
            },
          ]);
        },
        onError: (err) => setError(err),
      },
      { getClientSecret: () => Promise.resolve(secret) }
    );

    sourceRef.current = source;
    try {
      await source.start();
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [tokenStatus]);

  const stopRecording = useCallback(() => {
    const source = sourceRef.current;
    if (source) {
      debugLog("Stopping transcription source");
      source.stop();
      sourceRef.current = null;
    }
    setInterimTranscript("");
    setIsRecording(false);
  }, []);

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
