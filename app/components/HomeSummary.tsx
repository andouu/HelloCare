"use client";

import Link from "next/link";
import { HiOutlineChevronRight } from "react-icons/hi2";
import { sortActionItemsByPriorityAndDueDate, useUserMetadata, useUserData } from "@/lib/firestore";
import type { ActionItem, SessionMetadata } from "@/lib/firestore";
import { HiArrowRight } from "react-icons/hi";

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

function getSummaryCards(
  sessionMetadata: SessionMetadata[],
  actionItems: ActionItem[]
): { label: string; href: string }[] {
  const cards: { label: string; href: string }[] = [];

  // Nearest upcoming session (if any)
  const upcomingSessions = sessionMetadata
    .filter((s) => new Date(s.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (upcomingSessions.length > 0) {
    const days = formatDaysUntil(upcomingSessions[0].date);
    if (days) {
      cards.push({
        label: `You have an appointment ${days}`,
        href: "/appointments/schedule",
      });
    }
  }

  // Up to 3 recent action items (by priority then soonest due first)
  const sortedActionItems = sortActionItemsByPriorityAndDueDate(actionItems);
  const remaining = 3 - cards.length;
  for (let i = 0; i < Math.min(remaining, sortedActionItems.length); i++) {
    const item = sortedActionItems[i];
    if (item.medication) {
      const condition = item.title || item.description || "your condition";
      cards.push({
        label: `You were prescribed ${item.medication.name} for your ${condition}`,
        href: "/action-items",
      });
    } else {
      cards.push({
        label: item.title || item.description || "Action item",
        href: "/action-items",
      });
    }
  }

  return cards;
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
            <li key={i}>
              <Link
                href={card.href}
                className="flex items-center justify-between gap-3 rounded-full border border-neutral-200 px-4 py-3 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100"
              >
                <span>{card.label}</span>
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
