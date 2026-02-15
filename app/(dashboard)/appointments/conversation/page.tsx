'use client';

import { useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TbArrowBackUp } from "react-icons/tb";
import { useStreamingTranscription } from "@/app/hooks/useStreamingTranscription";
import { VIEW_CARD_CLASS, VIEW_COMPONENTS } from "./views";
import { formatConversationDate, parseDateFromSearchParams, getTrailingWords, captureSegmentsWithInterim } from "./utils";
import type { ConversationViewId } from "./types";

const TRAILING_WORD_COUNT = 15;

export default function ConversationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentDate = parseDateFromSearchParams(searchParams);
  const dateLabel = formatConversationDate(appointmentDate);

  const [view, setView] = useState<ConversationViewId>("idle");
  const [summarySegments, setSummarySegments] = useState<string[]>([]);

  const {
    startRecording,
    stopRecording,
    isRecording,
    isStarting,
    isStopping,
    segments,
    interimTranscript,
    isSupported,
    tokenStatus,
  } = useStreamingTranscription();

  const trailingWords = useMemo(
    () => getTrailingWords(segments, interimTranscript, TRAILING_WORD_COUNT),
    [segments, interimTranscript],
  );

  const canRecord = isSupported && tokenStatus === "ready";

  const handleStartRecording = useCallback(async () => {
    await startRecording();
    setView("recording");
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    const items = captureSegmentsWithInterim(segments, interimTranscript);
    setSummarySegments(items);
    try {
      await stopRecording();
    } finally {
      setView("summary");
    }
  }, [segments, interimTranscript, stopRecording]);

  const cardClass = VIEW_CARD_CLASS[view];

  function renderView() {
    switch (view) {
      case "idle":
        return (
          <VIEW_COMPONENTS.idle
            onStartRecording={handleStartRecording}
            canRecord={canRecord}
            isStarting={isStarting}
          />
        );
      case "recording":
        return (
          <VIEW_COMPONENTS.recording
            trailingWords={trailingWords}
            onStopRecording={handleStopRecording}
            isStopping={isStopping}
            canRecord={canRecord}
          />
        );
      case "summary":
        return <VIEW_COMPONENTS.summary segments={summarySegments} />;
      default: {
        const _: never = view;
        return null;
      }
    }
  }

  return (
    <div className="w-full h-screen flex flex-col gap-5 p-5">
      <header className="flex flex-col pt-6 gap-4 mb-8">
        <span className="text-xl font-bold tracking-tight">Conversation</span>
        <span className="text-neutral-400 leading-5 text-sm">
          This conversation is about a doctor&apos;s visit on {dateLabel}
        </span>
      </header>

      <div
        className={`w-full h-full flex flex-col rounded-2xl border px-4 transition-colors overflow-hidden ${cardClass}`}
      >
        {renderView()}
      </div>

      <footer className="pb-15 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full h-12 text-sm text-white rounded-full flex items-center px-5 bg-red-500 active:bg-red-400"
        >
          <TbArrowBackUp className="w-4 h-4 shrink-0" aria-hidden />
          <span className="flex-1 text-center">I don&apos;t want to record, go back</span>
          <span className="w-4 shrink-0" aria-hidden />
        </button>
      </footer>
    </div>
  );
}
