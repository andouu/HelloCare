import { AssemblyAI } from "assemblyai";
import { NextResponse } from "next/server";
import {
  getTurnDetectionConfig,
  isStreamingKeytermsEnabled,
} from "@/lib/assemblyai/turn-detection-config";

export async function POST() {
  try {
    const apiKey = process.env.ASSEMBLY_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ASSEMBLY_AI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const client = new AssemblyAI({ apiKey });
    const turnDetection = getTurnDetectionConfig();
    const keytermsEnabled = isStreamingKeytermsEnabled();

    let lastErr: unknown;
    let token: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        token = await client.streaming.createTemporaryToken({ expires_in_seconds: 600 });
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
    }

    if (!token) {
      throw lastErr instanceof Error ? lastErr : new Error("Failed to create AssemblyAI token");
    }

    return NextResponse.json({ token, turnDetection, keytermsEnabled });
  } catch (error) {
    console.error("Failed to create AssemblyAI token:", error);
    return NextResponse.json(
      { error: "Failed to create transcription token" },
      { status: 500 },
    );
  }
}
