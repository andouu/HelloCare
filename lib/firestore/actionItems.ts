/**
 * Helpers for action items (sorting, etc.).
 */

/** Canonical status definitions for action items. Single source of truth. */
export const ACTION_ITEM_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
] as const;

export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number]["value"];

/** Statuses that represent completed/archived items (shown in "Past" group). */
const PAST_STATUSES: ReadonlySet<string> = new Set<ActionItemStatus>(["done", "skipped"]);

/** Returns true if the status represents a past/completed action item. */
export function isPastStatus(status: string): boolean {
  return PAST_STATUSES.has(status);
}

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  done: 2,
  skipped: 3,
};

function statusRank(s: string): number {
  const key = (s || "").toLowerCase();
  return key in STATUS_ORDER ? STATUS_ORDER[key] : 4;
}

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function priorityRank(p: string): number {
  const key = (p || "").toLowerCase();
  return key in PRIORITY_ORDER ? PRIORITY_ORDER[key] : 3;
}

function dueByTime(d: Date | string | null): number {
  if (d == null) return Infinity;
  return new Date(d).getTime();
}

/**
 * Sort action items by status (done before skipped), then priority
 * (high → medium → low), then by due date (soonest first).
 * Items with no due date appear last within each group.
 */
export function sortActionItemsByPriorityAndDueDate<
  T extends { status: string; priority: string; dueBy: Date | string | null }
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) return byPriority;
    return dueByTime(a.dueBy) - dueByTime(b.dueBy);
  });
}
