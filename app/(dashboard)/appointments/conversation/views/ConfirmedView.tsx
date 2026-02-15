'use client';

import { TbMessage, TbCircleCheck } from "react-icons/tb";
import { useI18n } from "@/app/components/I18nProvider";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["confirmed"];

export function ConfirmedView({ onContinueRecording, onDone, onMarkIncorrect }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 gap-6">
      <div className="flex flex-col items-center text-center gap-3">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">
          {t("conversation.confirmed.title")}
        </h2>
        <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
          {t("conversation.confirmed.subtitle")}
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={onContinueRecording}
          className="w-full h-12 rounded-full bg-neutral-900 text-white text-sm flex items-center px-5 active:bg-neutral-700 transition-colors"
        >
          <TbMessage className="w-5 h-5 shrink-0" aria-hidden />
          <span className="flex-1 text-center">{t("conversation.confirmed.continueRecording")}</span>
          <span className="w-5 shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDone}
          className="w-full h-12 rounded-full bg-blue-500 text-white text-sm flex items-center px-5 active:bg-blue-400 transition-colors"
        >
          <TbCircleCheck className="w-5 h-5 shrink-0" aria-hidden />
          <span className="flex-1 text-center">{t("conversation.confirmed.doneVisit")}</span>
          <span className="w-5 shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onMarkIncorrect}
          className="w-full h-12 rounded-full border border-neutral-300 text-neutral-900 text-sm flex items-center px-5 active:bg-neutral-100 transition-colors"
        >
          <TbMessage className="w-5 h-5 shrink-0" aria-hidden />
          <span className="flex-1 text-center">{t("conversation.confirmed.oopsIncorrect")}</span>
          <span className="w-5 shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
}
