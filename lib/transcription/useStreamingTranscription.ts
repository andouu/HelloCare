"use client";

import { useCallback, useRef, useState } from "react";
import {
  createSpeechRecognitionSource,
  isSpeechRecognitionSupported,
} from "./sources/speechRecognitionSource";
import type { TranscriptSegment } from "./types";

function generateSegmentId(): string {
  return `seg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type UseStreamingTranscriptionOptions = {
  /** BCP-47 language for speech recognition. Default "en-US". */
  language?: string;
};

export type UseStreamingTranscriptionReturn = {
  /** Start streaming transcription (requests mic). */
  startRecording: () => Promise<void>;
  /** Stop streaming transcription. */
  stopRecording: () => void;
  /** Currently recording. */
  isRecording: boolean;
  /** Final transcript segments in order. */
  segments: TranscriptSegment[];
  /** Live interim transcript while speaking (streaming). */
  interimTranscript: string;
  /** User-facing error. */
  error: Error | null;
  /** Clear error. */
  clearError: () => void;
  /** Reset segments and interim. */
  clearTranscript: () => void;
  /** Whether the streaming source is supported in this browser. */
  isSupported: boolean;
};

/**
 * Hook for live streaming transcription (no chunk delay).
 * Uses the Web Speech API by default; source is pluggable for extensibility.
 */
export function useStreamingTranscription(
  options: UseStreamingTranscriptionOptions = {}
): UseStreamingTranscriptionReturn {
  const { language = "en-US" } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<Error | null>(null);

  const sourceRef = useRef<ReturnType<typeof createSpeechRecognitionSource> | null>(null);
  const segmentIndexRef = useRef(0);

  const clearError = useCallback(() => setError(null), []);
  const clearTranscript = useCallback(() => {
    setSegments([]);
    setInterimTranscript("");
    segmentIndexRef.current = 0;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setInterimTranscript("");

    const source = createSpeechRecognitionSource(
      {
        onInterim: (text) => setInterimTranscript(text),
        onFinal: (text) => {
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
      { language, interimResults: true, continuous: true }
    );

    if (!source.supported) {
      setError(new Error("Live transcription is not supported in this browser. Try Chrome or Edge."));
      return;
    }

    sourceRef.current = source;
    await source.start();
    setIsRecording(true);
  }, [language]);

  const stopRecording = useCallback(() => {
    const source = sourceRef.current;
    if (source) {
      source.stop();
      sourceRef.current = null;
    }
    setInterimTranscript("");
    setIsRecording(false);
  }, []);

  const isSupported = isSpeechRecognitionSupported();

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
  };
}
