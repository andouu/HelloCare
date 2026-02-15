'use client';

import { useEffect, useState } from "react";
import { TbRefresh, TbClipboardCheck, TbLoader2 } from "react-icons/tb";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["summary"];

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

type ConversationSummaryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "notEnoughData" }
  | { status: "success"; summaryPoints: string[] };

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function SummaryView({ segments, onMarkCorrect, onMarkIncorrect }: Props) {
  const [summaryState, setSummaryState] = useState<ConversationSummaryState>({
    status: "loading",
  });

  useEffect(() => {
    const transcript = segments.join("\n\n").trim();

    if (!transcript) {
      setSummaryState({ status: "notEnoughData" });
      return;
    }

    const controller = new AbortController();

    fetch("/api/conversation-summary-from-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.notEnoughData) {
          setSummaryState({ status: "notEnoughData" });
        } else if (data.error) {
          setSummaryState({ status: "error" });
        } else {
          setSummaryState({
            status: "success",
            summaryPoints: data.summaryPoints,
          });
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSummaryState({ status: "error" });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderSummaryContent = () => {
    switch (summaryState.status) {
      case "loading":
        return (
          <div className="flex items-center gap-2 py-4">
            <TbLoader2 className="w-4 h-4 text-neutral-400 animate-spin" />
            <span className="text-sm text-neutral-400">
              Generating summary...
            </span>
          </div>
        );

      case "error":
      case "notEnoughData":
        // Fall back to raw transcript segments.
        return (
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {segments.length === 0
              ? "No segments captured."
              : segments.join("\n")}
          </p>
        );

      case "success":
        return summaryState.summaryPoints.length === 0 ? (
          <p className="text-sm text-neutral-500">No summary available.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {summaryState.summaryPoints.map((point, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-neutral-700 leading-relaxed"
              >
                <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-400" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-auto">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 mb-4 shrink-0">
          Summary
        </h2>
        {renderSummaryContent()}
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
