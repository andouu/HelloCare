import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { HealthNoteCreate } from "@/lib/firestore/types";

const healthNoteContentSchema = z.object({
  status: z
    .enum(["ok", "NOT_ENOUGH_DATA"])
    .describe(
      "Use 'NOT_ENOUGH_DATA' when the transcript is empty, too short, unintelligible, contains no meaningful health information, or the data seems wrong or unreliable. Use 'ok' when you can confidently extract a valid health note."
    ),
  type: z
    .string()
    .describe(
      "Category of the health note, e.g. 'Injury', 'Recurring pain', 'Temporary pain', 'Symptom', 'Medication', 'General'. Use empty string when status is NOT_ENOUGH_DATA."
    ),
  title: z
    .string()
    .describe("Short, descriptive title for the health note. Use empty string when status is NOT_ENOUGH_DATA."),
  description: z
    .string()
    .describe(
      "Detailed description of the health incident or concern. Use empty string when status is NOT_ENOUGH_DATA."
    ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, startedAt, endedAt } = body as {
      transcript: string;
      startedAt: string;
      endedAt: string;
    };

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "transcript is required and must be a string" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const date = startedAt ?? new Date().toISOString();
    const start = startedAt ?? new Date().toISOString();
    const end = endedAt ?? new Date().toISOString();

    const { output } = await generateText({
      model: openai("gpt-4o-mini"),
      output: Output.object({
        name: "HealthNote",
        description: "A structured health note extracted from a voice transcript, or NOT_ENOUGH_DATA if extraction is not possible",
        schema: healthNoteContentSchema,
      }),
      prompt: `You are a medical scribe. Extract health information from the following voice transcript.

Transcript:
"""
${transcript}
"""

First, decide if you have enough valid data to create a meaningful health note:
- Return status "NOT_ENOUGH_DATA" if: the transcript is empty, too short (e.g. under ~10 words), unintelligible, contains no health-related information (e.g. only background noise, off-topic speech), or the data seems wrong or unreliable.
- Return status "ok" with filled fields if: you can confidently extract a valid health note.

When status is "ok", fill in type, title, and description with the extracted health information.
When status is "NOT_ENOUGH_DATA", use empty strings for type, title, and description.`,
    });

    if (output.status === "NOT_ENOUGH_DATA") {
      return NextResponse.json({ notEnoughData: true });
    }

    const healthNote: HealthNoteCreate & { date: Date; startedAt: Date; endedAt: Date } = {
      id,
      date: new Date(date),
      startedAt: new Date(start),
      endedAt: new Date(end),
      type: (output.type ?? "").trim() || "General",
      title: (output.title ?? "").trim() || "Health note",
      description: (output.description ?? "").trim() || transcript,
    };

    return NextResponse.json(healthNote);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error.cause : undefined;
    console.error("Failed to generate health note:", message, cause ?? error);
    return NextResponse.json(
      {
        error: "Failed to generate health note from transcript",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 }
    );
  }
}
