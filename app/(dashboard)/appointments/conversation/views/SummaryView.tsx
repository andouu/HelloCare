'use client';

import { TbRefresh, TbClipboardCheck } from "react-icons/tb";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["summary"];

export function SummaryView({ segments, onMarkCorrect, onMarkIncorrect }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-auto">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 mb-4 shrink-0">
          Summary
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
          {segments.length === 0
            ? "No segments captured."
            : segments.join("\n")}
        </p>
      </div>
      <div className="shrink-0 pt-4 pb-2 flex flex-col items-center gap-3">
        <span className="text-sm text-neutral-400">Does this look correct?</span>
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onMarkIncorrect}
            className="flex-1 h-12 rounded-full border border-neutral-300 text-neutral-900 text-sm flex items-center justify-center gap-2 active:bg-neutral-100 transition-colors"
          >
            <TbRefresh className="w-5 h-5 shrink-0" aria-hidden />
            <span>This is incorrect</span>
          </button>
          <button
            type="button"
            onClick={onMarkCorrect}
            className="flex-1 h-12 rounded-full bg-neutral-900 text-white text-sm flex items-center justify-center gap-2 active:bg-neutral-700 transition-colors"
          >
            <TbClipboardCheck className="w-5 h-5 shrink-0" aria-hidden />
            <span>This is correct</span>
          </button>
        </div>
      </div>
    </div>
  );
}
