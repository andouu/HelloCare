"use client";

import { HiCheck, HiPencil } from "react-icons/hi";
import { Spinner } from "@/app/components/Spinner";
import type { SessionMetadata } from "@/lib/firestore";

function formatVisitDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(d);
}

type Props = {
  sessions: SessionMetadata[];
  loading: boolean;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateNewVisit: () => Promise<string | null>;
  onSave: (sessionId: string) => Promise<void>;
  saveStatus: "idle" | "saving" | "saved" | "error";
};

export function AttachVisitView({
  sessions,
  loading,
  selectedSessionId,
  onSelectSession,
  onCreateNewVisit,
  onSave,
  saveStatus,
}: Props) {
  const selectedSession = selectedSessionId
    ? sessions.find((s) => s.id === selectedSessionId)
    : null;
  const selectedDateLabel = selectedSession
    ? formatVisitDate(selectedSession.date)
    : null;

  return (
    <div className="w-full min-h-screen flex flex-col bg-white">
      <div className="flex-1 min-h-0 flex flex-col overflow-auto">
        <header className="shrink-0 px-5 pt-8 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Attach Doctor&apos;s Visit
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            We&apos;ve got your photos, but they need to be tied to a doctor&apos;s visit.
          </p>
        </header>

        <div className="flex-1 px-5 py-6 flex flex-col gap-8">
          {/* Recent Visits */}
          <section>
            <h2 className="text-base font-bold text-neutral-900 mb-1">Recent Visits</h2>
            <p className="text-sm text-neutral-500 mb-3">These are your most recent visits.</p>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="lg" theme="neutral" />
              </div>
            ) : (
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {sessions.map((session) => {
                  const isSelected = selectedSessionId === session.id;
                  return (
                    <li key={session.id}>
                      <button
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                          isSelected
                            ? "border-neutral-900 bg-neutral-50"
                            : "border-neutral-200 bg-neutral-50/80 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-neutral-900">
                              Visit on {formatVisitDate(session.date)}
                            </p>
                            <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">
                              {session.summary || "No summary"}
                            </p>
                          </div>
                          {isSelected && (
                            <HiCheck className="w-5 h-5 shrink-0 text-neutral-900" aria-hidden />
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* New Visit */}
          <section>
            <h2 className="text-base font-bold text-neutral-900 mb-1">New Visit</h2>
            <p className="text-sm text-neutral-500 mb-3">
              Is this tied to a visit we don&apos;t know about? That&apos;s okay! Create a visit by
              pressing the button below.
            </p>
            <button
              type="button"
              onClick={() => void onCreateNewVisit()}
              className="w-full h-12 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm font-medium flex items-center justify-center gap-2 active:bg-neutral-50 transition-colors"
            >
              <HiPencil className="w-4 h-4 shrink-0" aria-hidden />
              Create New Doctor&apos;s Visit
            </button>
          </section>
        </div>
      </div>

      {/* Sticky Save */}
      <div className="shrink-0 px-5 pb-10 pt-4 bg-white border-t border-neutral-100">
        <button
          type="button"
          onClick={() => selectedSessionId && void onSave(selectedSessionId)}
          disabled={!selectedSessionId || saveStatus === "saving"}
          className="w-full h-14 rounded-full bg-neutral-900 text-white flex flex-col items-center justify-center gap-0.5 active:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveStatus === "saving" ? (
            <Spinner size="sm" theme="neutral" />
          ) : (
            <>
              <span className="text-sm font-semibold">Save Post Visit Packet</span>
              {selectedDateLabel && (
                <span className="text-xs text-neutral-300">
                  Attached to your visit on {selectedDateLabel}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
