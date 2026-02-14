/**
 * Turn detection configuration for AssemblyAI Universal Streaming.
 * @see https://www.assemblyai.com/docs/universal-streaming/turn-detection
 *
 * Configurable via environment variables for easy tuning per deployment (e.g. Vercel):
 * - ASSEMBLYAI_END_OF_TURN_CONFIDENCE_THRESHOLD
 * - ASSEMBLYAI_MIN_END_OF_TURN_SILENCE_WHEN_CONFIDENT (milliseconds)
 * - ASSEMBLYAI_MAX_TURN_SILENCE (milliseconds)
 */

export interface TurnDetectionConfig {
  /** Semantic end-of-turn confidence threshold (0–1). Higher = hold the floor longer. */
  endOfTurnConfidenceThreshold: number;
  /** Min silence (ms) after speech when confident, before ending turn. */
  minEndOfTurnSilenceWhenConfident: number;
  /** Max silence (ms) before acoustic fallback ends the turn. */
  maxTurnSilence: number;
}

/**
 * Presets (from AssemblyAI turn detection docs). Override via env for a different preset:
 *
 * Aggressive (short responses, rapid back-and-forth):
 *   end_of_turn_confidence_threshold=0.4, min=160, max=400
 * Balanced (default): end_of_turn_confidence_threshold=0.4, min=400, max=1280
 * Conservative (reflective/complex speech): end_of_turn_confidence_threshold=0.7, min=800, max=3600
 */
const BALANCED_DEFAULTS: TurnDetectionConfig = {
  endOfTurnConfidenceThreshold: 0.4,
  minEndOfTurnSilenceWhenConfident: 400,
  maxTurnSilence: 1280,
};

function parseFloatEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Returns turn detection config from environment with documented defaults.
 * Use on the server only (e.g. in API routes); env vars are not sent to the client.
 */
export function getTurnDetectionConfig(): TurnDetectionConfig {
  return {
    endOfTurnConfidenceThreshold: parseFloatEnv(
      "ASSEMBLYAI_END_OF_TURN_CONFIDENCE_THRESHOLD",
      BALANCED_DEFAULTS.endOfTurnConfidenceThreshold,
    ),
    minEndOfTurnSilenceWhenConfident: parseIntEnv(
      "ASSEMBLYAI_MIN_END_OF_TURN_SILENCE_WHEN_CONFIDENT",
      BALANCED_DEFAULTS.minEndOfTurnSilenceWhenConfident,
    ),
    maxTurnSilence: parseIntEnv(
      "ASSEMBLYAI_MAX_TURN_SILENCE",
      BALANCED_DEFAULTS.maxTurnSilence,
    ),
  };
}

/**
 * Whether to send keyterms (medications + medical terms) to the streaming API.
 * Keyterms improve transcription accuracy but add cost; default is off.
 *
 * Set ASSEMBLYAI_STREAMING_KEYTERMS_ENABLED=true in Vercel (or .env) to enable.
 * Accepts: "true", "1", "yes" (case-insensitive).
 */
export function isStreamingKeytermsEnabled(): boolean {
  return process.env.ASSEMBLYAI_STREAMING_KEYTERMS_ENABLED === "true";
}
