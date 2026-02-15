import { generateText, Output } from "ai";
import { z } from "zod";

import { createModel } from "../provider";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const documentSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "A clear, concise summary of the document(s) captured in the images. For medical or health-related content (forms, prescriptions, lab results, visit notes), preserve key facts: dates, names, dosages, instructions, and any actionable items. For general documents, summarize the main points and purpose. Use plain language."
    ),
});

export type DocumentSummaryOutput = z.infer<typeof documentSummarySchema>;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a helpful assistant that summarizes documents from photos. The user has taken one or more photos of a document (e.g. a medical form, prescription, lab result, visit summary, or any written/printed page).

Your task:
1. Look at all provided images in order.
2. Extract and summarize the content accurately. Preserve important details: names, dates, numbers, dosages, instructions, and any actionable items.
3. If the content is medical or health-related, keep clinical terms when relevant but ensure the summary is readable.
4. If multiple pages or images form one document, produce a single coherent summary that covers all of them.
5. If you cannot read or interpret the content (e.g. too blurry, wrong language, not a document), say so briefly in the summary.
6. Output only the summary text in the required schema — no preamble or meta-commentary.`;

const USER_PROMPT =
  "Summarize the content of the attached document image(s). Produce a single summary that captures all important information.";

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Produces a structured summary from one or more document images using a
 * vision-capable LLM. Use a model that supports images (e.g. gpt-4o).
 *
 * @param imageBase64List – Array of base64-encoded image strings (no data URL prefix required; can include "data:image/...;base64,").
 */
export async function extractDocumentSummaryFromImages(
  imageBase64List: string[]
): Promise<DocumentSummaryOutput> {
  if (imageBase64List.length === 0) {
    return { summary: "No images provided." };
  }

  console.log("[document-from-images] createModel('gpt-4o')…");
  const model = await createModel("gpt-4o");
  console.log("[document-from-images] model created, building content for", imageBase64List.length, "images");

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string; mediaType?: string }
  > = [{ type: "text" as const, text: USER_PROMPT }];

  for (const raw of imageBase64List) {
    const base64 = raw.includes("base64,") ? raw.split("base64,")[1]?.trim() ?? raw : raw;
    content.push({ type: "image" as const, image: base64, mediaType: "image/jpeg" });
  }

  console.log("[document-from-images] calling generateText (OpenAI/LLM)…");
  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user" as const, content }],
    output: Output.object({
      name: "DocumentSummary",
      description: "Summary of the document(s) in the images",
      schema: documentSummarySchema,
    }),
  });

  const output = result.output as DocumentSummaryOutput;
  console.log("[document-from-images] generateText returned", {
    hasOutput: !!output,
    summaryLength: output?.summary?.length ?? 0,
  });
  return output;
}
