"use client";

import Link from "next/link";
import {
  sortActionItemsByPriorityAndDueDate,
  useAppointments,
  useUserMetadata,
  useUserData,
} from "@/lib/firestore";
import type { ActionItem, Appointment } from "@/lib/firestore";
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

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Time-until pill label and style (matches appointments page). */
function getTimeUntil(appointmentTime: Date): { label: string; pillClass: string } {
  const now = Date.now();
  const t = appointmentTime.getTime();
  const diff = t - now;
  if (diff <= 0) {
    const ago = Math.abs(diff);
    if (ago < MS_PER_HOUR) return { label: "Just passed", pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
    if (ago < MS_PER_DAY) return { label: `${Math.floor(ago / MS_PER_HOUR)}h ago`, pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
    if (ago < MS_PER_WEEK) return { label: `${Math.floor(ago / MS_PER_DAY)}d ago`, pillClass: "bg-neutral-100 text-neutral-500 border-neutral-200" };
    return { label: "Passed", pillClass: "bg-neutral-100 text-neutral-400 border-neutral-200" };
  }
  if (diff < MS_PER_HOUR) return { label: "In < 1 hour", pillClass: "bg-rose-100 text-rose-800 border-rose-200" };
  if (diff < MS_PER_DAY) return { label: `In ${Math.ceil(diff / MS_PER_HOUR)}h`, pillClass: "bg-rose-50 text-rose-700 border-rose-200" };
  if (diff < MS_PER_WEEK) return { label: `In ${Math.ceil(diff / MS_PER_DAY)} days`, pillClass: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: `In ${Math.ceil(diff / MS_PER_DAY)} days`, pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
}

/** Suggested prompts shown when chat is available; clicking sends that message. */
export const SUGGESTED_PROMPTS = [
  "Summarize my overall health.",
  "What action items do I have?",
  "What happened in my previous health note?",
  "Summarize my most recent health notes.",
  "What are my most important action items?",
  "What are my upcoming appointments?",
] as const;

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

/** Next upcoming appointment (soonest future), or null. */
function getNextUpcomingAppointment(appointments: Appointment[]): Appointment | null {
  const now = Date.now();
  const future = appointments
    .filter((a) => a.appointmentTime.getTime() > now)
    .sort((a, b) => a.appointmentTime.getTime() - b.appointmentTime.getTime());
  return future[0] ?? null;
}

function formatAppointmentLabel(appointment: Appointment): string {
  const date = appointment.appointmentTime;
  const days = formatDaysUntil(date);
  const time = new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(date);
  if (days) return `Appointment ${days} at ${time}`;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

type SummaryCard =
  | { kind: "appointment"; label: string; href: string; appointmentId: string; timeUntilLabel: string; timeUntilPillClass: string }
  | { kind: "actionItem"; label: string; href: string; item: ActionItem };

function getSummaryCards(
  appointments: Appointment[],
  actionItems: ActionItem[]
): SummaryCard[] {
  const cards: SummaryCard[] = [];

  const nextAppointment = getNextUpcomingAppointment(appointments);
  if (nextAppointment) {
    const { label: timeUntilLabel, pillClass: timeUntilPillClass } = getTimeUntil(nextAppointment.appointmentTime);
    cards.push({
      kind: "appointment",
      label: formatAppointmentLabel(nextAppointment),
      href: `/appointments?highlight=${encodeURIComponent(nextAppointment.id)}`,
      appointmentId: nextAppointment.id,
      timeUntilLabel,
      timeUntilPillClass,
    });
  }

  const sortedActionItems = sortActionItemsByPriorityAndDueDate(actionItems);
  const remaining = 2;
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

const CARD_BUTTON_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-full border border-neutral-200 px-4 py-3 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100";

type HomeSummaryProps = {
  /** Single prompt to suggest (one at a time from a rotating list); clicking sends that text. */
  suggestedPrompt?: string;
  onPromptClick?: (text: string) => void;
};

export function HomeSummary({ suggestedPrompt, onPromptClick }: HomeSummaryProps) {
  const { data: userMetadata } = useUserMetadata();
  const userData = useUserData();
  const { appointments } = useAppointments();

  const firstName = userMetadata?.firstName || "there";
  const cards = getSummaryCards(appointments, userData.actionItems);
  const showPrompt = suggestedPrompt && onPromptClick;

  return (
    <div className="flex flex-col items-center px-4 pt-[25vh] pb-4">
      <img src="/hellocare_logo.svg" alt="HelloCare Logo" width={40} height={40} />
      <h2 className="mt-4 text-xl font-bold text-neutral-900">
        Welcome back, {firstName}!
      </h2>
      <p className="mt-1 text-sm text-neutral-500 text-center max-w-xs">
        Below is a quick summary of your wellbeing and action items
      </p>
      {(cards.length > 0 || showPrompt) ? (
        <ul className="mt-8 w-full max-w-md flex flex-col gap-2">
          {cards.map((card) => (
            <li key={card.kind === "actionItem" ? card.item.id : card.appointmentId}>
              <Link
                href={card.href}
                className={CARD_BUTTON_CLASS}
              >
                <span className="min-w-0 flex-1 flex flex-col gap-1.5">
                  {card.kind === "appointment" && (
                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-1.5 py-px text-[10px] font-medium ${card.timeUntilPillClass}`}
                      aria-hidden
                    >
                      {card.timeUntilLabel}
                    </span>
                  )}
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
          {showPrompt && (
            <li>
              <button
                type="button"
                onClick={() => onPromptClick(suggestedPrompt)}
                className={CARD_BUTTON_CLASS}
              >
                <span className="min-w-0 flex-1">{suggestedPrompt}</span>
                <HiArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
              </button>
            </li>
          )}
        </ul>
      ) : (
        <p className="max-w-xs mt-4 text-sm text-neutral-500 text-center">
          No upcoming appointments or action items. Check back after your next visit.
        </p>
      )}
    </div>
  );
}
