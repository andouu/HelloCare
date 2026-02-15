'use client';

import { useEffect, useRef, useState } from "react";
import { TbArrowBackUp, TbUpload, TbLoader2, TbCheck, TbAlertTriangle } from "react-icons/tb";
import { useSaveEntry } from "@/lib/firestore/hooks";
import { sortActionItemsByPriorityAndDueDate } from "@/lib/firestore";
import type { ActionItem, ActionItemCreate, ActionItemSerialized } from "@/lib/firestore/types";
import type { ConversationViewPropsMap } from "../types";

type Props = ConversationViewPropsMap["visitSummary"];

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

type SummaryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notEnoughData" }
  | {
      status: "success";
      discussionTopics: string[];
      actionItems: ActionItemSerialized[];
    };

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Converts a serialised action item (from the API) into an ActionItemCreate for Firestore. */
function toActionItemCreate(item: ActionItemSerialized): ActionItemCreate {
  let dueBy: Date;
  if (item.dueBy) {
    const parsed = new Date(item.dueBy);
    dueBy = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    dueBy = new Date();
  }

  return {
    id: item.id,
    dueBy,
    type: item.type,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    recurrence: item.recurrence,
    ...(item.medication ? { medication: item.medication } : {}),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      <h2 className="text-base font-bold tracking-tight text-neutral-900 mb-1">
        {title}
      </h2>
      <p className="text-sm text-neutral-400 leading-relaxed mb-3">
        {description}
      </p>
      {children}
    </section>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] ?? "bg-neutral-100 text-neutral-600";
  return (
    <span
      className={`inline-block text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${style}`}
    >
      {priority}
    </span>
  );
}

/** Format due date in UTC so calendar date matches LLM (e.g. "June 1" stays June 1). */
function formatDueDate(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ActionItemCard({ item }: { item: ActionItemSerialized }) {
  const hasMed =
    item.medication && item.medication.name && item.medication.name !== "N/A";

  return (
    <li className="rounded-xl border border-neutral-200 p-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-neutral-900 leading-snug">
          {item.title}
        </span>
        <PriorityBadge priority={item.priority} />
      </div>

      <p className="text-sm text-neutral-600 leading-relaxed">
        {item.description}
      </p>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400 mt-0.5">
        <span>{item.type}</span>
        {item.recurrence && item.recurrence !== "N/A" && (
          <span>&middot; {item.recurrence}</span>
        )}
        <span>&middot; {formatDueDate(item.dueBy)}</span>
      </div>

      {hasMed && item.medication && (
        <div className="mt-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">{item.medication.name}</span>
          {item.medication.dose > 0 && (
            <span>
              {" "}
              &mdash; {item.medication.dose}
              {item.medication.dosageUnit !== "N/A"
                ? item.medication.dosageUnit
                : ""}
            </span>
          )}
          {item.medication.route !== "N/A" && (
            <span> ({item.medication.route})</span>
          )}
        </div>
      )}
    </li>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <TbLoader2 className="w-6 h-6 text-neutral-400 animate-spin" />
      <p className="text-sm text-neutral-400">
        Analyzing your conversation...
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

export function VisitSummaryView({
  segments,
  dateLabel,
  appointmentDate,
  onGoHome,
}: Props) {
  const [state, setState] = useState<SummaryState>({ status: "loading" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { save } = useSaveEntry();
  const didSaveRef = useRef(false);

  // Persist action items and session metadata to Firestore once the LLM returns them.
  useEffect(() => {
    if (state.status !== "success") return;
    if (didSaveRef.current) return; // prevent duplicate saves (StrictMode)
    didSaveRef.current = true;

    setSaveStatus("saving");

    const writes =
      state.actionItems.length > 0
        ? state.actionItems.map((item) =>
            save("actionItems", toActionItemCreate(item)),
          )
        : [Promise.resolve({ ok: true as const, data: null })];

    Promise.all(writes)
      .then(async (results) => {
        const actionItemResults = state.actionItems.length > 0 ? results : [];
        const anyFailed = actionItemResults.some((r) => r && !r.ok);
        setSaveStatus(anyFailed ? "error" : "saved");

        const actionItemIds =
          actionItemResults.length > 0
            ? (actionItemResults as Array<{ ok: true; data: ActionItem }>)
                .filter((r): r is { ok: true; data: ActionItem } => r?.ok === true && r.data != null)
                .map((r) => r.data.id)
            : [];

        await save("sessionMetadata", {
          date: appointmentDate,
          title: `Visit – ${dateLabel}`,
          summary: state.discussionTopics.join("\n"),
          actionItemIds,
          documentIds: [],
        });
      })
      .catch(() => setSaveStatus("error"));
  }, [state, save, appointmentDate, dateLabel]);

  useEffect(() => {
    const transcript = segments.join("\n\n").trim();

    if (!transcript) {
      setState({ status: "notEnoughData" });
      return;
    }

    const controller = new AbortController();

    fetch("/api/visit-summary-from-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        visitDate: appointmentDate.toISOString().split("T")[0],
      }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.notEnoughData) {
          setState({ status: "notEnoughData" });
        } else if (data.error) {
          setState({ status: "error", message: data.error });
        } else {
          setState({
            status: "success",
            discussionTopics: data.discussionTopics,
            actionItems: data.actionItems,
          });
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: err.message });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Rendering ----

  const renderDiscussionTopics = () => {
    if (state.status !== "success") return null;
    const topics = state.discussionTopics;
    return (
      <ul className="list-disc list-inside flex flex-col gap-1">
        {topics.length === 0 ? (
          <li className="text-sm text-neutral-500">No topics captured.</li>
        ) : (
          topics.map((text, i) => (
            <li key={i} className="text-sm font-semibold text-neutral-900">
              {text}
            </li>
          ))
        )}
      </ul>
    );
  };

  const renderActionItems = () => {
    if (state.status !== "success") return null;
    const items = sortActionItemsByPriorityAndDueDate(state.actionItems);
    return items.length === 0 ? (
      <p className="text-sm text-neutral-500">
        No action items were identified.
      </p>
    ) : (
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <ActionItemCard key={item.id} item={item} />
        ))}
      </ul>
    );
  };

  const renderContent = () => {
    switch (state.status) {
      case "loading":
        return <LoadingSkeleton />;

      case "notEnoughData":
        return (
          <Section
            title="Discussion Topics"
            description="These are the things you discussed with your healthcare provider."
          >
            <ul className="list-disc list-inside flex flex-col gap-1">
              {segments.length === 0 ? (
                <li className="text-sm text-neutral-500">
                  No topics captured.
                </li>
              ) : (
                segments.map((text, i) => (
                  <li
                    key={i}
                    className="text-sm font-semibold text-neutral-900"
                  >
                    {text}
                  </li>
                ))
              )}
            </ul>
          </Section>
        );

      case "error":
        return (
          <>
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-6">
              <p className="text-sm text-red-700">
                Something went wrong while analyzing the conversation. Showing
                raw transcript below.
              </p>
            </div>
            <Section
              title="Discussion Topics"
              description="These are the things you discussed with your healthcare provider."
            >
              <ul className="list-disc list-inside flex flex-col gap-1">
                {segments.map((text, i) => (
                  <li
                    key={i}
                    className="text-sm font-semibold text-neutral-900"
                  >
                    {text}
                  </li>
                ))}
              </ul>
            </Section>
          </>
        );

      case "success":
        return (
          <>
            <Section
              title="Discussion Topics"
              description="These are the things you discussed with your healthcare provider."
            >
              {renderDiscussionTopics()}
            </Section>

            <Section
              title="Action Items"
              description="These are the things you need to do after your visit. Don&apos;t worry, we&apos;ve saved them for you and your caretakers!"
            >
              {renderActionItems()}
              {saveStatus === "saving" && (
                <div className="flex items-center gap-2 mt-3 text-xs text-neutral-400">
                  <TbLoader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to your account...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-2 mt-3 text-xs text-green-600">
                  <TbCheck className="w-3.5 h-3.5" />
                  <span>Saved to your account</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2 mt-3 text-xs text-amber-600">
                  <TbAlertTriangle className="w-3.5 h-3.5" />
                  <span>Some items could not be saved. They&apos;ll still appear here.</span>
                </div>
              )}
            </Section>
          </>
        );
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Header + content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-auto bg-white">
        <header className="shrink-0 pt-20 px-5 pb-8 bg-white">
          <h1 className="text-2xl font-bold tracking-tight">Visit Summary</h1>
          <span className="text-neutral-400 text-sm mt-2 block">
            You visited the doctor on {dateLabel}
          </span>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-auto px-5 py-6 flex flex-col gap-8">
          {renderContent()}

          {/* Post Visit Packet — always shown */}
          {state.status !== "loading" && (
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
          )}
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
