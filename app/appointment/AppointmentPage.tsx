"use client";

import Link from "next/link";
import { formStyles } from "@/lib/ui/form-styles";
import { useStreamingTranscription } from "@/app/hooks/useStreamingTranscription";

const linkClass =
  "rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

export function AppointmentClient() {
  const {
    startRecording,
    stopRecording,
    isRecording,
    segments,
    interimTranscript,
    error,
    clearError,
    clearTranscript,
    isSupported,
    tokenStatus,
    tokenError,
  } = useStreamingTranscription({ language: "en-US" });

  const canRecord = isSupported && tokenStatus === "ready";

  const fullTranscript = segments.map((s) => s.text).filter(Boolean).join(" ");
  const hasTranscript = segments.length > 0;
  const liveText = [fullTranscript, interimTranscript].filter(Boolean).join(" ");

  return (
    <div className="flex min-h-screen w-full max-w-2xl flex-col px-6 py-24 sm:px-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className={linkClass}>
          ← Home
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Appointment
        </h1>
      </div>

      <p className="mb-6 text-zinc-600 dark:text-zinc-400">
        During your appointment, click <strong>Record</strong> to capture your voice.
        Speech is transcribed live as you speak. You can start and stop as
        needed. The full transcript appears below.
      </p>
      {!isSupported && (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-400" role="status">
          Live transcription works best in Chrome or Edge. Other browsers may not support it.
        </p>
      )}
      {tokenStatus === "loading" && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400" role="status">
          Preparing transcription…
        </p>
      )}
      {tokenStatus === "error" && tokenError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200" role="alert">
            Could not prepare transcription: {tokenError.message}. Try refreshing the page.
          </p>
        </div>
      )}

      <section className={formStyles.section}>
        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            onClick={isRecording ? stopRecording : () => void startRecording()}
            className={isRecording ? formStyles.buttonRecordActive : formStyles.buttonRecord}
            aria-pressed={isRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            disabled={!canRecord}
          >
            {isRecording ? "Stop recording" : "Record"}
          </button>
          {isRecording && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Listening… transcript updates as you speak.
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
            <p className={formStyles.error} role="alert">
              {error.message}
            </p>
            <button
              type="button"
              onClick={clearError}
              className="text-sm font-medium text-red-700 underline dark:text-red-400"
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* Live transcript: streaming text as you speak */}
      <section className={`${formStyles.section} mt-6`}>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Live transcript
        </h2>
        <div className="min-h-[4rem] rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          {!liveText && !isRecording && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Transcript will appear here as you speak.
            </p>
          )}
          {(liveText || isRecording) && (
            <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
              {liveText}
              {isRecording && !interimTranscript && (
                <span className="animate-pulse"> …</span>
              )}
            </p>
          )}
        </div>
      </section>

      {/* Full transcript: list of segments */}
      <section className={`${formStyles.section} mt-6`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Full transcript
          </h2>
          {hasTranscript && (
            <button
              type="button"
              onClick={clearTranscript}
              className={formStyles.buttonSecondary}
            >
              Clear
            </button>
          )}
        </div>
        {!hasTranscript && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Segments will be listed here after you record.
          </p>
        )}
        {hasTranscript && (
          <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
            {segments.map((seg) => (
              <li key={seg.id} className="pl-1">
                {seg.text}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}