"use client";

import Link from "next/link";
import { useI18n } from "@/app/components/I18nProvider";
import {
  sortActionItemsByPriorityAndDueDate,
  useAppointments,
  useUserMetadata,
  useUserData,
} from "@/lib/firestore";
import type { ActionItem, Appointment } from "@/lib/firestore";
import { HiArrowRight, HiChatAlt2, HiClipboardList, HiClock } from "react-icons/hi";
import type { MessageKey } from "@/lib/i18n/messages";

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

export const SUGGESTED_PROMPT_KEYS: ReadonlyArray<MessageKey> = [
  "homeSummary.prompt.overallHealth",
  "homeSummary.prompt.actionItems",
  "homeSummary.prompt.upcomingAppointments",
  "homeSummary.prompt.lastHealthNote",
  "homeSummary.prompt.recentHealthNotes",
  "homeSummary.prompt.importantActionItems",
] as const;

export function getSuggestedPrompts(
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string[] {
  return SUGGESTED_PROMPT_KEYS.map((key) => t(key));
}

/** Time-until pill label and style (matches appointments page). */
function getTimeUntil(
  appointmentTime: Date,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): { label: string; pillClass: string } {
  const now = Date.now();
  const tMs = appointmentTime.getTime();
  const diff = tMs - now;
  if (diff <= 0) {
    const ago = Math.abs(diff);
    if (ago < MS_PER_HOUR) return { label: t("time.justPassed"), pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
    if (ago < MS_PER_DAY) {
      return {
        label: t("time.hoursAgo", { count: Math.floor(ago / MS_PER_HOUR) }),
        pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200",
      };
    }
    if (ago < MS_PER_WEEK) {
      return {
        label: t("time.daysAgo", { count: Math.floor(ago / MS_PER_DAY) }),
        pillClass: "bg-neutral-100 text-neutral-500 border-neutral-200",
      };
    }
    return { label: t("time.passed"), pillClass: "bg-neutral-100 text-neutral-400 border-neutral-200" };
  }

  if (diff < MS_PER_HOUR) return { label: t("time.inLessThanHour"), pillClass: "bg-rose-100 text-rose-800 border-rose-200" };
  if (diff < MS_PER_DAY) {
    return {
      label: t("time.inHours", { count: Math.ceil(diff / MS_PER_HOUR) }),
      pillClass: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  if (diff < MS_PER_WEEK) {
    return {
      label: t("time.inDays", { count: Math.ceil(diff / MS_PER_DAY) }),
      pillClass: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }
  return {
    label: t("time.inDays", { count: Math.ceil(diff / MS_PER_DAY) }),
    pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
}

/** Next upcoming appointment (soonest future), or null. */
function getNextUpcomingAppointment(appointments: Appointment[]): Appointment | null {
  const now = Date.now();
  const future = appointments
    .filter((a) => a.appointmentTime.getTime() > now)
    .sort((a, b) => a.appointmentTime.getTime() - b.appointmentTime.getTime());
  return future[0] ?? null;
}

function formatAppointmentLabel(
  appointment: Appointment,
  now: Date,
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  const date = appointment.appointmentTime;

  const currentDay = new Date(now);
  currentDay.setHours(0, 0, 0, 0);

  const targetDay = new Date(date);
  targetDay.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((targetDay.getTime() - currentDay.getTime()) / MS_PER_DAY);
  const time = formatDate(date, { timeStyle: "short" });

  if (diffDays === 0) return t("homeSummary.appointmentTodayAt", { time });
  if (diffDays === 1) return t("homeSummary.appointmentTomorrowAt", { time });
  if (diffDays > 1 && diffDays <= 7) {
    return t("homeSummary.appointmentInDaysAt", { days: diffDays, time });
  }

  return t("homeSummary.appointmentOn", {
    datetime: formatDate(date, { dateStyle: "medium", timeStyle: "short" }),
  });
}

type SummaryCard =
  | { kind: "appointment"; label: string; href: string; appointmentId: string; timeUntilLabel: string; timeUntilPillClass: string }
  | { kind: "actionItem"; label: string; href: string; item: ActionItem };

function getSummaryCards(
  appointments: Appointment[],
  actionItems: ActionItem[],
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): SummaryCard[] {
  const cards: SummaryCard[] = [];

  const nextAppointment = getNextUpcomingAppointment(appointments);
  if (nextAppointment) {
    const { label: timeUntilLabel, pillClass: timeUntilPillClass } = getTimeUntil(nextAppointment.appointmentTime, t);
    cards.push({
      kind: "appointment",
      label: formatAppointmentLabel(nextAppointment, new Date(), formatDate, t),
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
    const label = item.title || item.description || t("homeSummary.actionItemFallback");
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
  const { t, formatDate } = useI18n();
  const { data: userMetadata } = useUserMetadata();
  const userData = useUserData();
  const { appointments } = useAppointments();

  const firstName = userMetadata?.firstName || "there";
  const cards = getSummaryCards(appointments, userData.actionItems, formatDate, t);
  const showPrompt = suggestedPrompt && onPromptClick;

  return (
    <div className="flex flex-col items-center px-4 pt-[25vh] pb-4">
      <img src="/hellocare_logo.svg" alt="HelloCare Logo" width={40} height={40} />
      <h2 className="mt-4 text-xl font-bold text-neutral-900">
        {t("homeSummary.welcome", { name: firstName })}
      </h2>
      <p className="mt-1 text-sm text-neutral-500 text-center max-w-xs">
        {t("homeSummary.subtitle")}
      </p>
      {(cards.length > 0 || showPrompt) ? (
        <ul className="mt-8 w-full max-w-md flex flex-col gap-2">
          {cards.map((card) => (
            <li key={card.kind === "actionItem" ? card.item.id : card.appointmentId}>
              <Link
                href={card.href}
                className={CARD_BUTTON_CLASS}
              >
                {card.kind === "appointment" ? (
                  <HiClock className="h-5 w-5 shrink-0 text-neutral-900" aria-hidden />
                ) : (
                  <HiClipboardList className="h-5 w-5 shrink-0 text-neutral-900" aria-hidden />
                )}
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
                <HiChatAlt2 className="h-5 w-5 shrink-0 text-neutral-900" aria-hidden />
                <span className="min-w-0 flex-1">{suggestedPrompt}</span>
                <HiArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
              </button>
            </li>
          )}
        </ul>
      ) : (
        <p className="max-w-xs mt-4 text-sm text-neutral-500 text-center">
          {t("homeSummary.noCards")}
        </p>
      )}
    </div>
  );
}
