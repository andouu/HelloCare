import { z } from "zod";

import { queryLLMStructured } from "../client";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const conversationSummarySchema = z.object({
  status: z
    .enum(["ok", "NOT_ENOUGH_DATA"])
    .describe(
      "Use 'NOT_ENOUGH_DATA' when the transcript is empty, too short, contains no medical content, or is unintelligible. Use 'ok' when a meaningful summary can be produced.",
    ),
  summaryPoints: z
    .array(z.string())
    .describe(
      "Polished bullet-point summary containing ONLY clinically substantive content: symptoms, diagnoses, treatments, medications, follow-up plans, test orders, or specific patient questions/concerns about care. Exclude social niceties, gratitude, greetings, farewells, and small talk. Each string is one complete sentence attributing the doctor or patient. Return empty array when status is NOT_ENOUGH_DATA.",
    ),
});

export type ConversationSummaryContent = z.infer<
  typeof conversationSummarySchema
>;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildConversationSummaryPrompt(transcript: string, languageTag: string): string {
  return `You are a medical documentation specialist. You will receive a raw transcript of a doctor-patient conversation. The transcript does not have speaker labels — your job is to infer who is speaking (the doctor or the patient) based on conversational context and produce a polished, speaker-attributed summary.

Preferred output language: ${languageTag}

## Task

Analyze the transcript and produce a list of concise bullet points summarizing the conversation. Each bullet point must:

1. **Contain clinically substantive information only** — include only content that belongs in a medical note: symptoms, diagnoses, treatments, medications (names, doses, changes), test orders, follow-up plans, referrals, lifestyle recommendations, and specific patient questions or concerns about their health or care. If a statement does not convey any of these, omit it.
2. **Attribute the speaker** — start with "The doctor" or "The patient" to make clear who said or did what.
3. **Be a complete, standalone sentence** — readable on its own without needing the other bullet points for context.
4. **Follow chronological order** — present the bullet points in the order topics arose in the conversation.
5. **Be polished and professional** — rewrite messy speech into clean, grammatically correct prose. Remove filler words, false starts, and repetition while preserving the original meaning.

## Do NOT include

- **Social niceties or gratitude** — e.g. "The patient thanked the doctor.", "The patient expressed gratitude.", "The doctor acknowledged the patient's thanks."
- **Greetings or farewells** — e.g. "The doctor greeted the patient.", "They said goodbye."
- **Small talk or rapport-building without clinical content** — e.g. "The patient asked how the doctor was.", "They discussed the weather."
- **Vague emotional or social reactions** — e.g. "The patient seemed relieved.", "The doctor was supportive." Only include if a specific clinical action or decision is stated.
- **Meta-comments about the conversation** — e.g. "The patient agreed to follow the plan." without stating what the plan is.

When in doubt, ask: "Would this bullet point help another clinician or the patient recall what was decided or discussed medically?" If no, omit it.

## Speaker identification guidelines

- Statements describing symptoms, concerns, or personal history are almost always the **patient**.
- Statements giving medical advice, ordering tests, prescribing medication, or explaining diagnoses are almost always the **doctor**.
- If a statement is genuinely ambiguous, attribute it to the most likely speaker based on surrounding context. Do NOT leave any bullet point unattributed.

## Critical rules

1. ONLY include bullet points that convey **clinically substantive** information (symptoms, diagnoses, treatments, medications, orders, plans, or specific care-related questions). Omit gratitude, thanks, greetings, farewells, and small talk entirely.
2. ONLY include information that is EXPLICITLY stated in the transcript. Do NOT infer, fabricate, or hallucinate any medical details.
3. Aim for 4–10 bullet points for a typical visit. Use fewer for short conversations and more for longer ones, but never exceed 15. Fewer substantive points is better than padding with social content.
4. Each bullet point should be 1–2 sentences, no longer.
5. If the transcript is empty, too short (under ~10 meaningful words), or contains no medical content, return status "NOT_ENOUGH_DATA" with an empty array.
6. Do NOT include verbatim quotes — always paraphrase into polished prose.

## Examples of good bullet points (include these types)

- "The patient reported experiencing persistent lower back pain for the past two weeks, worsening with prolonged sitting."
- "The doctor recommended starting physical therapy twice a week and prescribed ibuprofen 400 mg as needed for pain."
- "The patient asked whether the back pain could be related to their recent weight gain."
- "The doctor ordered an X-ray of the lumbar spine to rule out structural issues and scheduled a follow-up in three weeks."

## Examples of bullet points to OMIT (do not include)

- "The patient expressed gratitude towards the doctor."
- "The doctor thanked the patient for coming in."
- "The patient said they felt reassured."
- "They exchanged pleasantries at the start of the visit."

Transcript:
"""
${transcript}
"""`;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Produces a polished, speaker-attributed bullet-point summary of a
 * doctor-patient conversation transcript using an LLM.
 *
 * The LLM infers speaker identity (doctor vs patient) from context and
 * returns an array of clean, standalone summary sentences.
 *
 * @param transcript – Full conversation transcript text (no speaker labels).
 */
export async function extractConversationSummary(
  transcript: string,
  languageTag: string = "en-US",
): Promise<ConversationSummaryContent> {
  const { output } = await queryLLMStructured({
    name: "ConversationSummary",
    description:
      "Polished, speaker-attributed bullet-point summary of a doctor-patient conversation",
    schema: conversationSummarySchema,
    prompt: buildConversationSummaryPrompt(transcript, languageTag),
  });

  return output;
}
