import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import type { HealthNote, ActionItem, SessionMetadata, UserMetadata } from "@/lib/firestore/types";

type ChatContext = {
  userMetadata?: UserMetadata | null;
  healthNotes?: HealthNote[];
  actionItems?: ActionItem[];
  sessionMetadata?: SessionMetadata[];
};

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildSystemPrompt(context: ChatContext): string {
  const parts: string[] = [
    "You are a helpful, empathetic health assistant for HelloCare. You help users understand their health notes, action items, and appointments. Be concise, clear, and supportive. Do not provide medical advice—encourage users to consult their care team for medical decisions.",
  ];

  if (context.userMetadata) {
    const { firstName, lastName, preferredLanguage } = context.userMetadata;
    parts.push(
      "",
      "## User information",
      `- Name: ${firstName} ${lastName}`,
      preferredLanguage ? `- Preferred language: ${preferredLanguage}` : ""
    );
  }

  if (context.healthNotes && context.healthNotes.length > 0) {
    parts.push(
      "",
      "## Health notes (from visits)",
      ...context.healthNotes.map(
        (n) =>
          `- [${formatDate(n.date)}] ${n.title}: ${n.description} (type: ${n.type})`
      )
    );
  }

  if (context.actionItems && context.actionItems.length > 0) {
    parts.push(
      "",
      "## Action items",
      ...context.actionItems.map((a) => {
        const med = a.medication
          ? ` (medication: ${a.medication.name} ${a.medication.dose}${a.medication.dosageUnit}, due by ${formatDate(a.dueBy)})`
          : "";
        return `- ${a.title || a.description}${med} [status: ${a.status}, due: ${formatDate(a.dueBy)}]`;
      })
    );
  }

  if (context.sessionMetadata && context.sessionMetadata.length > 0) {
    parts.push(
      "",
      "## Appointments / sessions",
      ...context.sessionMetadata.map(
        (s) =>
          `- [${formatDate(s.date)}] ${s.title}: ${s.summary || "(no summary)"}`
      )
    );
  }

  return parts.filter(Boolean).join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, context } = body as {
      messages: UIMessage[];
      context?: ChatContext;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages is required and must be an array" },
        { status: 400 }
      );
    }

    const systemPrompt = context ? buildSystemPrompt(context) : undefined;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Chat API error:", message, error);
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 }
    );
  }
}
