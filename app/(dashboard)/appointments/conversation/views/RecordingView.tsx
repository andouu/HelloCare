'use client';

import { HiStop } from "react-icons/hi";
import { useI18n } from "@/app/components/I18nProvider";
import { Spinner } from "@/app/components/Spinner";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["recording"];

export function RecordingView({
  trailingWords,
  onStopRecording,
  isStopping,
  canRecord,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3 items-center justify-center flex-1">
      <div className="min-h-[2rem] w-full max-w-md text-center text-sm text-white">
        {trailingWords || t("conversation.recording.listening")}
      </div>
      <button
        type="button"
        onClick={() => void onStopRecording()}
        disabled={!canRecord || isStopping}
        aria-label={isStopping ? t("chatWidget.stopRecording") : t("chatWidget.stopRecording")}
        aria-pressed
        className="w-25 h-25 rounded-full bg-blue-400 text-white flex items-center justify-center shrink-0 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80"
      >
        {isStopping ? (
          <Spinner size="md" theme="amber" />
        ) : (
          <HiStop className="w-8 h-8" aria-hidden />
        )}
      </button>
      <span className="text-center text-base text-blue-300">{t("conversation.recording.status")}</span>
    </div>
  );
}
