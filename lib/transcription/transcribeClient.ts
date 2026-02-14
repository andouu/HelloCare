/**
 * Client-side call to our transcribe API. Keeps route URL and fetch in one place.
 */

import type { TranscribeApiResponse } from "./types";

const AUDIO_FILENAME = "audio.webm";

export async function transcribeAudio(blob: Blob): Promise<TranscribeApiResponse> {
  const formData = new FormData();
  formData.append("file", blob, AUDIO_FILENAME);
  formData.append("language", "en");

  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as TranscribeApiResponse;
  if (!res.ok) {
    return { ok: false, error: "ok" in data && !data.ok ? data.error : `Request failed: ${res.status}` };
  }
  return data;
}
