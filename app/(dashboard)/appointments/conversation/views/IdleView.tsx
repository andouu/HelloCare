'use client';

import { HiMicrophone } from "react-icons/hi";
import { useI18n } from "@/app/components/I18nProvider";
import { Spinner } from "@/app/components/Spinner";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["idle"];

export function IdleView({ onStartRecording, canRecord, isStarting }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3 items-center justify-center flex-1">
      <div className="min-h-[2rem] w-full max-w-md text-center text-sm text-neutral-700">
        {"\u00A0"}
      </div>
      <button
        type="button"
        onClick={() => void onStartRecording()}
        disabled={!canRecord || isStarting}
        aria-label={isStarting ? t("chatWidget.startRecording") : t("chatWidget.startRecording")}
        aria-pressed={false}
        className="w-20 h-20 rounded-full border-2 border-neutral-900 bg-white text-neutral-900 flex items-center justify-center shrink-0 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80"
      >
        {isStarting ? (
          <Spinner size="md" theme="neutral" />
        ) : (
          <HiMicrophone className="w-8 h-8" aria-hidden />
        )}
      </button>
      <span className="text-center text-base text-neutral-900">
        {t("conversation.idle.cta")}
      </span>
    </div>
  );
}
