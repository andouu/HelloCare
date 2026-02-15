import { NextResponse } from "next/server";
import {
  extractVisitSummaryFromTranscript,
  type ActionItemOutput,
} from "@/lib/llm/queries/visit-summary";

/** True if the string looks like a YYYY-MM-DD date (no time, no inferred defaults). */
function isExplicitIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

/**
 * Converts an LLM-produced action item into the shape expected by the client.
 * Adds a generated `id`, normalises `dueBy` to an ISO string only when the LLM
 * returned an explicit date, and defaults `status` to "pending".
 */
function toActionItem(item: ActionItemOutput) {
  let dueBy: string | null = null;
  const raw = item.dueBy?.trim() ?? "";
  if (
    raw !== "" &&
    raw.toUpperCase() !== "N/A" &&
    isExplicitIsoDateOnly(raw)
  ) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      dueBy = parsed.toISOString();
    }
  }

  return {
    id: crypto.randomUUID(),
    type: item.type,
    title: item.title,
    description: item.description,
    status: "pending",
    priority: item.priority,
    recurrence: item.recurrence,
    dueBy,
    ...(item.medication ? { medication: item.medication } : {}),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, visitDate } = body as {
      transcript: string;
      visitDate?: string;
    };

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "transcript is required and must be a string" },
        { status: 400 },
      );
    }

    const dateStr = visitDate ?? new Date().toISOString().split("T")[0];
    const result = await extractVisitSummaryFromTranscript(transcript, dateStr);

    if (result.status === "NOT_ENOUGH_DATA") {
      return NextResponse.json({ notEnoughData: true });
    }

    return NextResponse.json({
      discussionTopics: result.discussionTopics,
      actionItems: result.actionItems.map(toActionItem),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error.cause : undefined;
    console.error(
      "Failed to generate visit summary:",
      message,
      cause ?? error,
    );
    return NextResponse.json(
      {
        error: "Failed to generate visit summary from transcript",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 },
    );
  }
}
