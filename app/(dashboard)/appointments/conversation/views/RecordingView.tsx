'use client';

import { HiStop } from "react-icons/hi";
import { Spinner } from "@/app/components/Spinner";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["recording"];

export function RecordingView({
  trailingWords,
  onStopRecording,
  isStopping,
  canRecord,
}: Props) {
  return (
    <div className="flex flex-col gap-3 items-center justify-center flex-1">
      <div className="min-h-[2rem] w-full max-w-md text-center text-sm text-white">
        {trailingWords || "Listening…"}
      </div>
      <button
        type="button"
        onClick={() => void onStopRecording()}
        disabled={!canRecord || isStopping}
        aria-label={isStopping ? "Stopping…" : "Stop recording"}
        aria-pressed
        className="w-20 h-20 rounded-full border-2 border-red-500 bg-red-500 text-white flex items-center justify-center shrink-0 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80"
      >
        {isStopping ? (
          <Spinner size="md" theme="amber" />
        ) : (
          <HiStop className="w-8 h-8" aria-hidden />
        )}
      </button>
      <span className="text-center text-base text-white">Recording...</span>
    </div>
  );
}
