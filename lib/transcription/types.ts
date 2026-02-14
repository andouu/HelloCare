/**
 * Types for real-time voice recording and transcription.
 */

/** A single transcribed segment (phrase or utterance). */
export type TranscriptSegment = {
  id: string;
  text: string;
  /** Client timestamp when segment was received (ms). */
  receivedAt: number;
  /** Order index for display. */
  index: number;
};

/** Status of the recording + transcription flow. */
export type RecordingStatus =
  | "idle"
  | "recording"
  | "stopping";

export type TranscribeApiResponse =
  | { ok: true; text: string }
  | { ok: false; error: string };

/** Callbacks for a streaming transcription source (e.g. Realtime API WebRTC). */
export type StreamingTranscriptionCallbacks = {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (error: Error) => void;
};

/** Interface for a streaming transcription source; allows swapping implementations. */
export type StreamingTranscriptionSource = {
  start(): Promise<void>;
  stop(): void;
  /** Whether the source is supported in this environment. */
  readonly supported: boolean;
};
