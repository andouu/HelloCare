'use client';

import { TbRefresh, TbMessage } from "react-icons/tb";
import { useI18n } from "@/app/components/I18nProvider";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["retry"];

export function RetryView({ onRerecord, onMarkCorrect }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 gap-6">
      <div className="flex flex-col items-center text-center gap-3">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">
          {t("conversation.retry.title")}
        </h2>
        <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
          {t("conversation.retry.subtitle")}
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={onRerecord}
          className="w-full h-12 rounded-full bg-neutral-900 text-white text-sm flex items-center px-5 active:bg-neutral-700 transition-colors"
        >
          <TbRefresh className="w-5 h-5 shrink-0" aria-hidden />
          <span className="flex-1 text-center">{t("conversation.retry.rerecord")}</span>
          <span className="w-5 shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onMarkCorrect}
          className="w-full h-12 rounded-full border border-neutral-300 text-neutral-900 text-sm flex items-center px-5 active:bg-neutral-100 transition-colors"
        >
          <TbMessage className="w-5 h-5 shrink-0" aria-hidden />
          <span className="flex-1 text-center">{t("conversation.retry.oopsCorrect")}</span>
          <span className="w-5 shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
}
