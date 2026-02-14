/**
 * Transcription module: types, API client, and hooks.
 * - useStreamingTranscription: live streaming (Web Speech API, no chunk delay).
 * - useRecordingTranscription: chunked Whisper API (optional fallback).
 */

export type {
  TranscriptSegment,
  RecordingStatus,
  TranscribeApiResponse,
  StreamingTranscriptionCallbacks,
  StreamingTranscriptionSource,
} from "./types";
export { transcribeAudio } from "./transcribeClient";
export { useStreamingTranscription } from "./useStreamingTranscription";
export type { UseStreamingTranscriptionOptions, UseStreamingTranscriptionReturn } from "./useStreamingTranscription";
export { useRecordingTranscription } from "./useRecordingTranscription";
export type { UseRecordingTranscriptionOptions, UseRecordingTranscriptionReturn } from "./useRecordingTranscription";
export { createSpeechRecognitionSource, isSpeechRecognitionSupported } from "./sources/speechRecognitionSource";
