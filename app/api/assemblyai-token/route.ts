import { AssemblyAI } from "assemblyai";
import { NextResponse } from "next/server";
import {
  getTurnDetectionConfig,
  isStreamingKeytermsEnabled,
} from "@/lib/assemblyai/turn-detection-config";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_AI_API_KEY!,
});

export async function POST() {
  try {
    const [token, turnDetection, keytermsEnabled] = await Promise.all([
      client.streaming.createTemporaryToken({ expires_in_seconds: 600 }),
      Promise.resolve(getTurnDetectionConfig()),
      Promise.resolve(isStreamingKeytermsEnabled()),
    ]);
    return NextResponse.json({ token, turnDetection, keytermsEnabled });
  } catch (error) {
    console.error("Failed to create AssemblyAI token:", error);
    return NextResponse.json(
      { error: "Failed to create transcription token" },
      { status: 500 },
    );
  }
}
