/**
 * POST /api/transcribe
 * Accepts multipart audio file, forwards to OpenAI Whisper, returns transcript text.
 */

import { NextRequest, NextResponse } from "next/server";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_MODEL = "whisper-1";
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per Whisper limit

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid 'file' in form data" },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "Audio file is empty" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Audio file exceeds 25 MB limit" },
      { status: 400 }
    );
  }

  const body = new FormData();
  body.append("file", file, "audio.webm");
  body.append("model", WHISPER_MODEL);
  // Optional: improve accuracy for English medical context
  const language = formData.get("language");
  if (typeof language === "string" && language) {
    body.append("language", language);
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI request failed";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `OpenAI returned ${response.status}`;
    try {
      const json = JSON.parse(text) as { error?: { message?: string } };
      if (json?.error?.message) errorMessage = json.error.message;
    } catch {
      if (text) errorMessage = text.slice(0, 200);
    }
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: response.status >= 500 ? 502 : 400 }
    );
  }

  const result = await response.json();
  const text = typeof result?.text === "string" ? result.text.trim() : "";
  return NextResponse.json({ ok: true, text });
}
