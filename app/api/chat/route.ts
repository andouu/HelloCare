import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { createAssistantTools } from "@/lib/assistant-tools";
import { buildSystemPrompt, type ChatContext } from "@/lib/chat-system-prompt";

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
        { status: 400 },
      );
    }

    const systemPrompt = context ? buildSystemPrompt(context) : undefined;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      temperature: 0,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: createAssistantTools(),
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
      { status: 500 },
    );
  }
}
