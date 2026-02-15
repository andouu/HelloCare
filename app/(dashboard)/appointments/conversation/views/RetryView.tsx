'use client';

import { TbRefresh, TbMessage } from "react-icons/tb";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["retry"];

export function RetryView({ onRerecord, onMarkCorrect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 gap-6">
      <div className="flex flex-col items-center text-center gap-3">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">
          Let&apos;s try again.
        </h2>
        <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
          Oh no! You said this conversation summary was incorrect.
          Let&apos;s get things right and rerecord this conversation.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={onRerecord}
          className="w-full h-12 rounded-full bg-neutral-900 text-white text-sm flex items-center px-5 active:bg-neutral-700 transition-colors"
        >
          <TbRefresh className="w-5 h-5 shrink-0" aria-hidden />
          <span className="flex-1 text-center">Sounds good, let&apos;s rerecord</span>
          <span className="w-5 shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onMarkCorrect}
          className="w-full h-12 rounded-full border border-neutral-300 text-neutral-900 text-sm flex items-center px-5 active:bg-neutral-100 transition-colors"
        >
          <TbMessage className="w-5 h-5 shrink-0" aria-hidden />
          <span className="flex-1 text-center">Oops, I meant that it was correct</span>
          <span className="w-5 shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
}
