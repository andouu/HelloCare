import { NextResponse } from "next/server";
import type { HealthNoteCreate } from "@/lib/firestore/types";
import { extractHealthNoteFromTranscript } from "@/lib/llm/queries/health-note";

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
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const date = startedAt ?? new Date().toISOString();
    const start = startedAt ?? new Date().toISOString();
    const end = endedAt ?? new Date().toISOString();

    const output = await extractHealthNoteFromTranscript(transcript);

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
      { status: 500 },
    );
  }
}
