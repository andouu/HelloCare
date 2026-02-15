import { z } from "zod";

import { queryLLMStructured } from "../client";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/** Schema for health note content extracted from a voice transcript. */
export const healthNoteContentSchema = z.object({
  status: z
    .enum(["ok", "NOT_ENOUGH_DATA"])
    .describe(
      "Use 'NOT_ENOUGH_DATA' when the transcript is empty, too short, unintelligible, contains no meaningful health information, or the data seems wrong or unreliable. Use 'ok' when you can confidently extract a valid health note.",
    ),
  type: z
    .string()
    .describe(
      "Category of the health note, e.g. 'Injury', 'Recurring pain', 'Temporary pain', 'Symptom', 'Medication', 'General'. Use empty string when status is NOT_ENOUGH_DATA.",
    ),
  title: z
    .string()
    .describe(
      "Short, descriptive title for the health note. Use empty string when status is NOT_ENOUGH_DATA.",
    ),
  description: z
    .string()
    .describe(
      "Detailed description of the health incident or concern. Use empty string when status is NOT_ENOUGH_DATA.",
    ),
});

export type HealthNoteContent = z.infer<typeof healthNoteContentSchema>;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildHealthNotePrompt(transcript: string): string {
  return `You are a medical scribe. Extract health information from the following voice transcript.

Transcript:
"""
${transcript}
"""

First, decide if you have enough valid data to create a meaningful health note:
- Return status "NOT_ENOUGH_DATA" if: the transcript is empty, too short (e.g. under ~10 words), unintelligible, contains no health-related information (e.g. only background noise, off-topic speech), or the data seems wrong or unreliable.
- Return status "ok" with filled fields if: you can confidently extract a valid health note.

When status is "ok", fill in type, title, and description with the extracted health information.
When status is "NOT_ENOUGH_DATA", use empty strings for type, title, and description.`;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Extracts a structured health note from a voice transcript using an LLM.
 *
 * Returns either a fully populated health note (`status: "ok"`) or a
 * sentinel indicating insufficient data (`status: "NOT_ENOUGH_DATA"`).
 */
export async function extractHealthNoteFromTranscript(
  transcript: string,
  languageTag: string = "en-US",
): Promise<HealthNoteContent> {
  const { output } = await queryLLMStructured({
    name: "HealthNote",
    description:
      "A structured health note extracted from a voice transcript, or NOT_ENOUGH_DATA if extraction is not possible",
    schema: healthNoteContentSchema,
    prompt: `${buildHealthNotePrompt(transcript)}\n\nWrite the output text fields in ${languageTag}.`,
  });

  return output;
}
