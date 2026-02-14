/**
 * Transcription module: streaming via OpenAI Realtime API (WebRTC).
 * Ephemeral token is minted by the server; the API key never touches the client.
 */

export type {
  TranscriptSegment,
  RecordingStatus,
  TranscribeApiResponse,
  StreamingTranscriptionCallbacks,
  StreamingTranscriptionSource,
} from "./types";
export { useStreamingTranscription } from "./useStreamingTranscription";
export type {
  TokenStatus,
  UseStreamingTranscriptionOptions,
  UseStreamingTranscriptionReturn,
} from "./useStreamingTranscription";
export { createRealtimeWebRTCSource, isRealtimeWebRTCSupported } from "./sources/realtimeWebRTCSource";
