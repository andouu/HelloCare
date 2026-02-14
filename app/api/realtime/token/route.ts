/**
 * POST /api/realtime/token
 * Mints a short-lived ephemeral client secret for OpenAI Realtime API (WebRTC).
 * The client uses this token to connect directly to OpenAI; the API key never leaves the server.
 */

import { NextResponse } from "next/server";

const OPENAI_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

/**
 * Transcription session config for Realtime API.
 * See: https://platform.openai.com/docs/api-reference/realtime-beta-sessions
 *
 * Key choices:
 *   - gpt-4o-mini-transcribe: significantly lower latency than whisper-1 for streaming deltas.
 *   - near_field noise reduction: optimised for close-talking mics (headphones / phone).
 *   - server_vad with 200 ms silence: responsive turn detection without cutting off pauses.
 *   - No logprobs: reduces server-side overhead since we don't use them.
 */
const TRANSCRIPTION_SESSION_CONFIG = {
  session: {
    type: "transcription" as const,
    audio: {
      input: {
        format: { type: "audio/pcm" as const, rate: 24000 },
        noise_reduction: { type: "near_field" as const },
        transcription: { model: "gpt-4o-mini-transcribe" as const, language: "en" },
        turn_detection: {
          type: "server_vad" as const,
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
        },
      },
    },
  },
};

export type RealtimeTokenResponse =
  | { ok: true; clientSecret: string }
  | { ok: false; error: string };

export async function POST(): Promise<NextResponse<RealtimeTokenResponse>> {
  // Server-only: never expose OPENAI_API_KEY to the client. We mint a short-lived secret instead.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TRANSCRIPTION_SESSION_CONFIG),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to request token";
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

  const data = (await response.json()) as { client_secret?: string; value?: string };
  const clientSecret = data.client_secret ?? data.value;
  if (typeof clientSecret !== "string") {
    return NextResponse.json(
      { ok: false, error: "Invalid token response from OpenAI" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, clientSecret });
}
