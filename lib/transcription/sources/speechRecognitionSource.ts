/**
 * Streaming transcription source using the browser Web Speech API.
 * Provides real-time interim and final results without chunk delay.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
 */

import type { StreamingTranscriptionCallbacks, StreamingTranscriptionSource } from "../types";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? window.SpeechRecognition ?? window.webkitSpeechRecognition
    : undefined;

export type SpeechRecognitionSourceOptions = {
  language?: string;
  /** Emit interim results for live display. Default true. */
  interimResults?: boolean;
  /** Keep listening across phrase boundaries. Default true. */
  continuous?: boolean;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | undefined {
  return SpeechRecognitionCtor;
}

/**
 * Whether the Web Speech API (SpeechRecognition) is available in this environment.
 */
export function isSpeechRecognitionSupported(): boolean {
  return !!getSpeechRecognition();
}

/**
 * Creates a streaming transcription source using the Web Speech API.
 * Use when you want true live transcription without chunk/round-trip delay.
 */
export function createSpeechRecognitionSource(
  callbacks: StreamingTranscriptionCallbacks,
  options: SpeechRecognitionSourceOptions = {}
): StreamingTranscriptionSource {
  const { language = "en-US", interimResults = true, continuous = true } = options;
  let recognition: SpeechRecognitionInstance | null = null;

  const supported = !!getSpeechRecognition();

  return {
    get supported() {
      return supported;
    },

    async start(): Promise<void> {
      const Ctor = getSpeechRecognition();
      if (!Ctor) {
        callbacks.onError?.(new Error("Speech recognition is not supported in this browser"));
        return;
      }

      recognition = new Ctor();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;

      recognition.onresult = (e: SpeechRecognitionEvent) => {
        const last = e.resultIndex;
        for (let i = last; i < e.results.length; i++) {
          const result = e.results[i];
          const transcript = Array.from({ length: result.length }, (_, j) => result[j].transcript)
            .join("")
            .trim();
          if (!transcript) continue;
          if (result.isFinal) {
            callbacks.onFinal(transcript);
          } else {
            callbacks.onInterim?.(transcript);
          }
        }
      };

      recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        const message = e.message ?? e.error ?? "Speech recognition error";
        callbacks.onError?.(new Error(message));
      };

      recognition.onend = () => {
        recognition = null;
      };

      recognition.start();
    },

    stop(): void {
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          recognition.abort();
        }
        recognition = null;
      }
    },
  };
}
