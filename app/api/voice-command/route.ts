import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { createAssistantTools } from "@/lib/assistant-tools";
import { buildSystemPrompt, type ChatContext } from "@/lib/chat-system-prompt";

// ---------------------------------------------------------------------------
// Route handler – one-shot voice command processing
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, context } = body as {
      transcript: string;
      context?: ChatContext;
    };

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "transcript is required and must be a string" },
        { status: 400 },
      );
    }

    console.log("[VoiceCommand] User transcript:", JSON.stringify(transcript));

    const systemPrompt = context
      ? buildSystemPrompt(context, { voiceCommand: true })
      : undefined;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 0,
      system: systemPrompt,
      prompt: transcript,
      tools: createAssistantTools(),
    });

    // Collect tool calls from all steps for the client to execute.
    // AI SDK v6 uses `input` for tool call arguments.
    const toolCalls = result.steps.flatMap((step) =>
      step.toolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.input,
      })),
    );

    console.log("[VoiceCommand] LLM response text:", JSON.stringify(result.text));
    console.log("[VoiceCommand] Tool calls:", JSON.stringify(toolCalls, null, 2));

    return NextResponse.json({
      text: result.text,
      toolCalls,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Voice command API error:", message, error);
    return NextResponse.json(
      {
        error: "Failed to process voice command",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 },
    );
  }
}
