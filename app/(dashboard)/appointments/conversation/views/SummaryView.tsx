'use client';

import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["summary"];

export function SummaryView({ segments }: Props) {
  return (
    <>
      <h2 className="text-lg font-bold tracking-tight text-neutral-900 mb-4 shrink-0">
        Summary
      </h2>
      <ul className="flex flex-col gap-2 overflow-auto list-disc list-inside text-sm text-neutral-700 min-h-0 flex-1">
        {segments.length === 0 ? (
          <li className="text-neutral-500">No segments captured.</li>
        ) : (
          segments.map((text, i) => (
            <li key={i} className="leading-relaxed">
              {text}
            </li>
          ))
        )}
      </ul>
    </>
  );
}
