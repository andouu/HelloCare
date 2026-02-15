import { z } from "zod";

import { queryLLMStructured } from "../client";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const medicationOutputSchema = z.object({
  name: z
    .string()
    .describe(
      "Exact medication name as stated in the transcript. Use 'N/A' if not specified.",
    ),
  dose: z
    .number()
    .describe("Numerical dose value. Use 0 if not specified."),
  dosageUnit: z
    .string()
    .describe(
      "Unit of measurement (e.g. 'mg', 'ml', 'mcg'). Use 'N/A' if not specified.",
    ),
  count: z
    .number()
    .describe(
      "Number of doses/pills per administration. Use 0 if not specified.",
    ),
  route: z
    .string()
    .describe(
      "Administration route (e.g. 'oral', 'topical', 'injection', 'inhalation'). Use 'N/A' if not specified.",
    ),
});

const actionItemOutputSchema = z.object({
  type: z
    .string()
    .describe(
      "Category of the action. Use one of: 'Medication', 'Follow-up', 'Lab work', 'Lifestyle', 'Monitoring', 'Referral', 'Other'.",
    ),
  title: z
    .string()
    .describe("Short summary of the action (under 10 words)."),
  description: z
    .string()
    .describe(
      "Detailed description of what the patient needs to do, including any specifics mentioned such as timing, frequency, conditions, and warnings.",
    ),
  priority: z
    .enum(["high", "medium", "low"])
    .describe(
      "Clinical urgency: 'high' for urgent or time-sensitive actions, 'medium' for routine follow-ups, 'low' for optional or long-term suggestions.",
    ),
  recurrence: z
    .string()
    .describe(
      "How often this action repeats. Use: 'once', 'daily', 'weekly', 'monthly', 'as needed', or 'N/A' if not discussed.",
    ),
  dueBy: z
    .string()
    .describe(
      "When this should be completed. Use ISO 8601 date format (YYYY-MM-DD) if a specific timeframe was mentioned, calculated relative to the visit date. Use 'N/A' if no timeframe was discussed.",
    ),
  medication: medicationOutputSchema
    .nullable()
    .describe(
      "Medication details if this action involves a specific medication. null if it does not involve medication.",
    ),
});

const visitSummarySchema = z.object({
  status: z
    .enum(["ok", "NOT_ENOUGH_DATA"])
    .describe(
      "Use 'NOT_ENOUGH_DATA' when the transcript is empty, too short, contains no medical content, or is unintelligible. Use 'ok' when meaningful medical information can be extracted.",
    ),
  discussionTopics: z
    .array(z.string())
    .describe(
      "List of concise phrases (2–5 words each) identifying every distinct medical topic or concern discussed during the visit. Return empty array when status is NOT_ENOUGH_DATA.",
    ),
  actionItems: z
    .array(actionItemOutputSchema)
    .describe(
      "List of actionable tasks for the patient extracted from the conversation. Return empty array if none were discussed or when status is NOT_ENOUGH_DATA.",
    ),
});

export type VisitSummaryContent = z.infer<typeof visitSummarySchema>;
export type ActionItemOutput = z.infer<typeof actionItemOutputSchema>;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildVisitSummaryPrompt(
  transcript: string,
  visitDate: string,
): string {
  return `You are a medical documentation specialist analyzing a doctor-patient conversation transcript. Your task is to extract structured information with absolute fidelity to what was discussed — do NOT add, infer, or fabricate any details not present in the transcript.

Today's date: ${new Date().toISOString().split("T")[0]}
Visit date: ${visitDate}

## Task 1: Discussion Topics

Extract every distinct medical topic or concern that was discussed during the visit. Each entry must be a concise phrase (2–5 words) capturing the essence of the topic.

Examples of good topic labels:
- "Lower back pain"
- "Blood pressure medication"
- "Physical therapy referral"
- "Sleep quality concerns"
- "Post-surgery recovery"

Be thorough — include every topic that received meaningful discussion, even briefly.

## Task 2: Action Items

Extract every task, instruction, recommendation, or follow-up the patient should act on after the visit. For each action item, populate the fields based ONLY on what is explicitly stated or directly implied in the transcript.

### Field guidelines:

- **type**: Use exactly one of: "Medication", "Follow-up", "Lab work", "Lifestyle", "Monitoring", "Referral", "Other".
- **title**: Concise action summary (under 10 words).
- **description**: Detailed explanation of what the patient needs to do. Include any mentioned specifics: timing, frequency, conditions, warnings, and contraindications.
- **priority**: "high" for urgent or time-sensitive actions (e.g. stop a medication, go to ER if symptoms worsen), "medium" for standard follow-ups and routine tasks, "low" for optional suggestions or long-term lifestyle changes.
- **recurrence**: "once", "daily", "twice daily", "weekly", "monthly", "as needed", or "N/A" if not discussed.
- **dueBy**: Convert any mentioned timeframe to ISO 8601 (YYYY-MM-DD) relative to the visit date. For example, "come back in two weeks" from a visit on 2026-02-14 becomes "2026-02-28". Use "N/A" if no timeframe was mentioned.
- **medication**: Include ONLY when a specific medication is discussed. Set to null for non-medication action items. When included, populate every sub-field; use "N/A" for unknown strings and 0 for unknown numbers.

## Critical rules:

1. ONLY extract information that is EXPLICITLY stated or CLEARLY implied in the transcript.
2. Use "N/A" for any string field where the information is not available in the transcript.
3. Use 0 for any numeric field where the information is not available in the transcript.
4. Do NOT hallucinate or guess medication names, dosages, dates, or any clinical details.
5. If no actionable items were discussed, return an empty actionItems array.
6. Be exhaustive — capture ALL topics and ALL action items. Do not omit anything that was discussed.
7. If the transcript is empty, too short (under ~10 words), or contains no medical content, return status "NOT_ENOUGH_DATA" with empty arrays.

Transcript:
"""
${transcript}
"""`;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Extracts a structured visit summary from a doctor-patient conversation
 * transcript using an LLM.
 *
 * Returns discussion topics (concise phrases) and action items (structured)
 * for the patient, or a NOT_ENOUGH_DATA sentinel if the transcript is
 * insufficient.
 *
 * @param transcript  – Full conversation transcript text.
 * @param visitDate   – ISO 8601 date of the visit (YYYY-MM-DD), used for
 *                      resolving relative timeframes in the conversation.
 */
export async function extractVisitSummaryFromTranscript(
  transcript: string,
  visitDate: string,
): Promise<VisitSummaryContent> {
  const { output } = await queryLLMStructured({
    name: "VisitSummary",
    description:
      "Structured visit summary with discussion topics and patient action items extracted from a doctor-patient conversation transcript",
    schema: visitSummarySchema,
    prompt: buildVisitSummaryPrompt(transcript, visitDate),
  });

  return output;
}
