import type { LanguageModelUsage } from "ai";
import type { z } from "zod";

// Re-export for consumers that don't want to depend on `ai` directly.
export type { LanguageModelUsage };

// ---------------------------------------------------------------------------
// Structured (schema-based) queries
// ---------------------------------------------------------------------------

/** Options for a structured LLM query that returns a typed object. */
export interface StructuredQueryOptions<T extends z.ZodType> {
  /** Human-readable name for the output schema (used by some providers for guidance). */
  name: string;
  /** Description of what the output represents. */
  description: string;
  /** Zod schema defining the expected output structure. */
  schema: T;
  /** The user prompt to send to the LLM. */
  prompt: string;
  /** Optional system message to set LLM behavior/persona. */
  system?: string;
  /** Override the model id (e.g. "gpt-4o", "claude-sonnet-4-20250514"). Falls back to env config. */
  model?: string;
  /** Sampling temperature (0–2). Lower values are more deterministic. */
  temperature?: number;
}

/** Result of a structured LLM query. */
export interface StructuredQueryResult<T> {
  /** The parsed, schema-validated output from the LLM. */
  output: T;
  /** Token usage statistics for the call. */
  usage: LanguageModelUsage;
}

// ---------------------------------------------------------------------------
// Plain text queries
// ---------------------------------------------------------------------------

/** Options for a plain text LLM query. */
export interface TextQueryOptions {
  /** The user prompt to send to the LLM. */
  prompt: string;
  /** Optional system message to set LLM behavior/persona. */
  system?: string;
  /** Override the model id. Falls back to env config. */
  model?: string;
  /** Sampling temperature (0–2). */
  temperature?: number;
}

/** Result of a plain text LLM query. */
export interface TextQueryResult {
  /** The raw text response from the LLM. */
  text: string;
  /** Token usage statistics for the call. */
  usage: LanguageModelUsage;
}
