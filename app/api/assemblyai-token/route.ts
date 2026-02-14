import { AssemblyAI } from "assemblyai";
import { NextResponse } from "next/server";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_AI_API_KEY!,
});

export async function POST() {
  try {
    const token = await client.streaming.createTemporaryToken({
      expires_in_seconds: 600,
    });
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Failed to create AssemblyAI token:", error);
    return NextResponse.json(
      { error: "Failed to create transcription token" },
      { status: 500 },
    );
  }
}
