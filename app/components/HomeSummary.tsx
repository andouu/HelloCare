"use client";

import Link from "next/link";
import { sortActionItemsByPriorityAndDueDate, useUserMetadata, useUserData } from "@/lib/firestore";
import type { ActionItem, SessionMetadata } from "@/lib/firestore";
import { HiArrowRight } from "react-icons/hi";

/** Pill style maps for read-only display (must match action-items / past-sessions for consistency). */
const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  skipped: "bg-neutral-100 text-neutral-500 border-neutral-300",
};

const DEFAULT_PILL_STYLE = "bg-neutral-100 text-neutral-600 border-neutral-200";

function formatDaysUntil(date: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 0 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays > 7) return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
  return "";
}

type SummaryCard =
  | { kind: "session"; label: string; href: string }
  | { kind: "actionItem"; label: string; href: string; item: ActionItem };

function getSummaryCards(
  sessionMetadata: SessionMetadata[],
  actionItems: ActionItem[]
): SummaryCard[] {
  const cards: SummaryCard[] = [];

  // Nearest upcoming session (if any)
  const upcomingSessions = sessionMetadata
    .filter((s) => new Date(s.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (upcomingSessions.length > 0) {
    const days = formatDaysUntil(upcomingSessions[0].date);
    if (days) {
      cards.push({
        kind: "session",
        label: `You have an appointment ${days}`,
        href: "/appointments/schedule",
      });
    }
  }

  // Up to 3 recent action items (by priority then soonest due first); link with highlight param
  const sortedActionItems = sortActionItemsByPriorityAndDueDate(actionItems);
  const remaining = 3 - cards.length;
  for (let i = 0; i < Math.min(remaining, sortedActionItems.length); i++) {
    const item = sortedActionItems[i];
    const label = item.title || item.description || "Action item";
    cards.push({
      kind: "actionItem",
      label,
      href: `/action-items?highlight=${encodeURIComponent(item.id)}`,
      item,
    });
  }

  return cards;
}

/** Read-only pill showing a single value (type, priority, or status). */
function ImmutablePill({
  value,
  styles,
}: {
  value: string;
  styles?: Record<string, string>;
}) {
  const style = styles?.[value] ?? DEFAULT_PILL_STYLE;
  const display = value.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-medium ${style}`}
      aria-hidden
    >
      {display}
    </span>
  );
}

export function HomeSummary() {
  const { data: userMetadata } = useUserMetadata();
  const userData = useUserData();

  const firstName = userMetadata?.firstName || "there";
  const cards = getSummaryCards(
    userData.sessionMetadata,
    userData.actionItems
  );

  return (
    <div className="flex flex-col items-center px-4 pt-[25vh] pb-4">
      <img src="/hellocare_logo.svg" alt="HelloCare Logo" width={40} height={40} />
      <h2 className="mt-4 text-xl font-bold text-neutral-900">
        Welcome back, {firstName}!
      </h2>
      <p className="mt-1 text-sm text-neutral-500 text-center max-w-xs">
        Below is a quick summary of your wellbeing and action items
      </p>
      {cards.length > 0 ? (
        <ul className="mt-8 w-full max-w-md flex flex-col gap-2">
          {cards.map((card, i) => (
            <li key={card.kind === "actionItem" ? card.item.id : i}>
              <Link
                href={card.href}
                className="flex items-center justify-between gap-3 rounded-full border border-neutral-200 px-4 py-3 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100"
              >
                <span className="min-w-0 flex-1 flex flex-col gap-1.5">
                  <span>{card.label}</span>
                  {card.kind === "actionItem" && (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <ImmutablePill value={card.item.type} />
                      <ImmutablePill value={card.item.priority} styles={PRIORITY_STYLES} />
                      <ImmutablePill value={card.item.status} styles={STATUS_STYLES} />
                    </span>
                  )}
                </span>
                <HiArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="max-w-xs mt-4 text-sm text-neutral-500 text-center">
          No upcoming appointments or action items. Check back after your next visit.
        </p>
      )}
    </div>
  );
}
