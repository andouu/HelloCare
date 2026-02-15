import { NextResponse } from "next/server";
import { resolveLanguageTag } from "@/lib/i18n/locales";
import { extractConversationSummary } from "@/lib/llm/queries/conversation-summary";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, languageTag } = body as { transcript: string; languageTag?: string };

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "transcript is required and must be a string" },
        { status: 400 },
      );
    }

    const result = await extractConversationSummary(
      transcript,
      resolveLanguageTag(languageTag),
    );

    if (result.status === "NOT_ENOUGH_DATA") {
      return NextResponse.json({ notEnoughData: true });
    }

    return NextResponse.json({
      summaryPoints: result.summaryPoints,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error.cause : undefined;
    console.error(
      "Failed to generate conversation summary:",
      message,
      cause ?? error,
    );
    return NextResponse.json(
      {
        error: "Failed to generate conversation summary from transcript",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 },
    );
  }
}
