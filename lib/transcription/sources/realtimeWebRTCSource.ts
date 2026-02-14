/**
 * Streaming transcription source using OpenAI Realtime API over WebRTC.
 * Authenticated via ephemeral client secret from our server (no API key in client).
 *
 * Key design decisions:
 *   - Delta events are incremental text fragments; we accumulate them into a running
 *     buffer and emit the full partial transcript via onInterim.
 *   - We wait for ICE gathering to complete before sending the SDP offer so that all
 *     ICE candidates are inlined, enabling the fastest possible connection setup.
 */

import { debugLog } from "@/lib/logger";
import type { StreamingTranscriptionCallbacks, StreamingTranscriptionSource } from "../types";

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const TOKEN_URL = "/api/realtime/token";
const DATA_CHANNEL_LABEL = "oai-events";

// ---------------------------------------------------------------------------
// Event type guards
// ---------------------------------------------------------------------------

type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
};

function isTranscriptionDelta(e: RealtimeEvent): e is RealtimeEvent & { delta: string } {
  return e.type === "conversation.item.input_audio_transcription.delta" && typeof e.delta === "string";
}

function isTranscriptionCompleted(e: RealtimeEvent): e is RealtimeEvent & { transcript: string } {
  return e.type === "conversation.item.input_audio_transcription.completed" && typeof e.transcript === "string";
}

// ---------------------------------------------------------------------------
// Token helper
// ---------------------------------------------------------------------------

/** Fetches an ephemeral client secret from our server. Exported for pre-fetch (e.g. on page load). */
export async function fetchClientSecret(): Promise<string> {
  const res = await fetch(TOKEN_URL, { method: "POST" });
  const data = (await res.json()) as { ok: true; clientSecret: string } | { ok: false; error: string };
  if (!res.ok || !data.ok) {
    throw new Error("ok" in data && !data.ok ? data.error : `Token request failed: ${res.status}`);
  }
  return data.clientSecret;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type RealtimeWebRTCSourceOptions = {
  /** When provided, used instead of fetching a new token (e.g. cached token from page load). */
  getClientSecret?: () => Promise<string>;
};

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

export function isRealtimeWebRTCSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    typeof navigator?.mediaDevices?.getUserMedia === "function"
  );
}

// ---------------------------------------------------------------------------
// ICE gathering helper
// ---------------------------------------------------------------------------

/**
 * Resolves when ICE gathering completes or after a generous timeout (5 s).
 * Waiting ensures the SDP offer includes all candidates, avoiding trickle ICE
 * and the latency that comes with it.
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 5_000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();

  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);

    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Source factory
// ---------------------------------------------------------------------------

/**
 * Creates a streaming transcription source using OpenAI Realtime API (WebRTC).
 *
 * Flow:
 *   1. Obtain an ephemeral token (pre-fetched or on demand).
 *   2. Capture mic audio.
 *   3. Set up RTCPeerConnection + data channel for transcription events.
 *   4. Wait for ICE gathering, then exchange SDP with OpenAI.
 *
 * Delta events are accumulated into a buffer so `onInterim` always receives
 * the full partial transcript (not just the latest fragment).
 */
export function createRealtimeWebRTCSource(
  callbacks: StreamingTranscriptionCallbacks,
  options?: RealtimeWebRTCSourceOptions,
): StreamingTranscriptionSource {
  let peerConnection: RTCPeerConnection | null = null;
  let stream: MediaStream | null = null;

  const supported = isRealtimeWebRTCSupported();
  const getClientSecret = options?.getClientSecret;

  return {
    get supported() {
      return supported;
    },

    async start(): Promise<void> {
      if (!supported) {
        callbacks.onError?.(new Error("WebRTC or microphone is not supported in this browser"));
        return;
      }

      // 1. Token ─────────────────────────────────────────────────────────────
      const clientSecret = getClientSecret ? await getClientSecret() : await fetchClientSecret();

      // 2. Mic ───────────────────────────────────────────────────────────────
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. PeerConnection + data channel ─────────────────────────────────────
      const pc = new RTCPeerConnection();
      peerConnection = pc;

      pc.addTrack(stream.getTracks()[0]);

      // Running buffer for incremental delta fragments.
      let interimBuffer = "";

      const dc = pc.createDataChannel(DATA_CHANNEL_LABEL);

      dc.addEventListener("message", (evt) => {
        try {
          const event = JSON.parse(evt.data as string) as RealtimeEvent;

          if (isTranscriptionDelta(event)) {
            // Deltas are incremental fragments — accumulate them so the
            // caller always sees the full partial transcript.
            interimBuffer += event.delta;
            callbacks.onInterim?.(interimBuffer);
          } else if (isTranscriptionCompleted(event)) {
            // Final transcript for this utterance — reset the buffer.
            interimBuffer = "";
            callbacks.onFinal(event.transcript);
          }
        } catch {
          // Ignore non-JSON or unknown event types.
        }
      });

      dc.addEventListener("error", () => {
        callbacks.onError?.(new Error("Data channel error"));
      });

      // 4. SDP exchange ──────────────────────────────────────────────────────
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering so all candidates are inlined in the SDP,
      // avoiding slow trickle-ICE negotiation.
      await waitForIceGathering(pc);

      const sdpResponse = await fetch(REALTIME_CALLS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        // Use the fully-gathered local description (includes ICE candidates).
        body: pc.localDescription?.sdp ?? offer.sdp,
      });

      if (!sdpResponse.ok) {
        const text = await sdpResponse.text();
        throw new Error(text ? text.slice(0, 200) : `OpenAI Realtime returned ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      debugLog("WebRTC remote description set");
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }));
    },

    stop(): void {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }
    },
  };
}
