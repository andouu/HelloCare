'use client';

import { TbArrowBackUp, TbUpload } from "react-icons/tb";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["visitSummary"];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-bold tracking-tight text-neutral-900 mb-1">{title}</h2>
      <p className="text-sm text-neutral-400 leading-relaxed mb-3">{description}</p>
      {children}
    </section>
  );
}

export function VisitSummaryView({ segments, dateLabel, onGoHome }: Props) {
  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Header + content: white background */}
      <div className="flex-1 min-h-0 flex flex-col overflow-auto bg-white">
        <header className="shrink-0 pt-20 px-5 pb-8 bg-white">
        <h1 className="text-2xl font-bold tracking-tight">Visit Summary</h1>
        <span className="text-neutral-400 text-sm mt-2 block">
          You visited the doctor on {dateLabel}
        </span>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-auto px-5 py-6 flex flex-col gap-8">
        <Section
          title="Discussion Topics"
          description="These are the things you discussed with your healthcare provider."
        >
          <ul className="list-disc list-inside flex flex-col gap-1">
            {segments.length === 0 ? (
              <li className="text-sm text-neutral-500">No topics captured.</li>
            ) : (
              segments.map((text, i) => (
                <li key={i} className="text-sm font-semibold text-neutral-900">
                  {text}
                </li>
              ))
            )}
          </ul>
        </Section>

        <Section
          title="Action Items"
          description="These are the things you need to do after your visit. Don&apos;t worry, we&apos;ve saved them for you and your caretakers!"
        >
          <ul className="list-disc list-inside flex flex-col gap-1">
            <li className="text-sm font-semibold text-neutral-900">Lorem ipsum dolor sit amet</li>
            <li className="text-sm font-semibold text-neutral-900">Consectetur adipiscing elit</li>
          </ul>
        </Section>

        <Section
          title="Post Visit Packet"
          description="Did you get a post-visit information packet? Upload pictures of it here or ask your caretaker to. It&apos;s incredibly helpful!"
        >
          <button
            type="button"
            className="h-12 rounded-full border border-neutral-300 text-neutral-900 text-sm flex items-center px-5 active:bg-neutral-100 transition-colors"
          >
            <TbUpload className="w-5 h-5 shrink-0" aria-hidden />
            <span className="flex-1 text-center px-4">Upload Packet</span>
            <span className="w-5 shrink-0" aria-hidden />
          </button>
        </Section>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 pb-15 pt-3 bg-white">
        <button
          type="button"
          onClick={onGoHome}
          className="w-full h-12 text-sm text-white rounded-full flex items-center px-5 bg-neutral-900 active:bg-neutral-700 transition-colors"
        >
          <TbArrowBackUp className="w-4 h-4 shrink-0" aria-hidden />
          <span className="flex-1 text-center">Go back to homepage</span>
          <span className="w-4 shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
}
