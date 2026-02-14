"use client";

import { useCallback, useRef, useState } from "react";
import { transcribeAudio } from "./transcribeClient";
import type { TranscriptSegment } from "./types";

const CHUNK_MS = 4000;
const MIME_TYPE = "audio/webm;codecs=opus";

function generateSegmentId(): string {
  return `seg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type UseRecordingTranscriptionOptions = {
  /** Timeslice in ms for each chunk sent to Whisper. Default 4000. */
  chunkMs?: number;
};

export type UseRecordingTranscriptionReturn = {
  /** Start recording; requests mic if needed. */
  startRecording: () => Promise<void>;
  /** Stop recording and flush final chunk. */
  stopRecording: () => Promise<void>;
  /** Currently recording (mic active). */
  isRecording: boolean;
  /** Transcript segments in order. */
  segments: TranscriptSegment[];
  /** At least one chunk is being transcribed. */
  isTranscribing: boolean;
  /** User-facing error (mic denied, API error, etc.). */
  error: Error | null;
  /** Clear error. */
  clearError: () => void;
  /** Reset segments (e.g. start new conversation). */
  clearTranscript: () => void;
};

export function useRecordingTranscription(
  options: UseRecordingTranscriptionOptions = {}
): UseRecordingTranscriptionReturn {
  const { chunkMs = CHUNK_MS } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const segmentIndexRef = useRef(0);

  const clearError = useCallback(() => setError(null), []);
  const clearTranscript = useCallback(() => {
    setSegments([]);
    segmentIndexRef.current = 0;
  }, []);

  const processChunk = useCallback(async (blob: Blob) => {
    if (blob.size === 0) return;
    setIsTranscribing(true);
    setError(null);
    try {
      const result = await transcribeAudio(blob);
      if (result.ok && result.text) {
        const index = segmentIndexRef.current++;
        setSegments((prev) => [
          ...prev,
          {
            id: generateSegmentId(),
            text: result.text,
            receivedAt: Date.now(),
            index,
          },
        ]);
      } else if (!result.ok) {
        setError(new Error(result.error));
      }
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported(MIME_TYPE) ? MIME_TYPE : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          void processChunk(e.data);
        }
      };

      recorder.onerror = () => {
        setError(new Error("Recording failed"));
      };

      recorder.start(chunkMs);
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Could not access microphone"));
    }
  }, [chunkMs, processChunk]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;
    if (!recorder || recorder.state === "inactive") {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
        resolve();
      };
      if (recorder.state === "recording") {
        recorder.requestData();
      }
      recorder.stop();
    });
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    segments,
    isTranscribing,
    error,
    clearError,
    clearTranscript,
  };
}
