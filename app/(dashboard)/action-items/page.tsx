"use client";

import { useCallback, useMemo, useState } from "react";
import { HiOutlineMenuAlt4, HiOutlineTrash, HiChevronDown } from "react-icons/hi";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  ACTION_ITEM_STATUSES,
  deleteActionItem,
  isPastStatus,
  sortActionItemsByPriorityAndDueDate,
  useActionItems,
  writeActionItem,
} from "@/lib/firestore";
import type { ActionItem, ActionItemStatus } from "@/lib/firestore";

/** Format due date in UTC so calendar date matches stored value (LLM sends date-only as midnight UTC). */
function formatDueDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  skipped: "bg-neutral-100 text-neutral-500 border-neutral-300",
};

function StatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: ActionItemStatus) => void;
}) {
  const style = STATUS_STYLES[value] ?? STATUS_STYLES.pending;
  return (
    <span className={`relative inline-flex items-center rounded-full border ${style}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ActionItemStatus)}
        className="appearance-none cursor-pointer bg-transparent pl-2.5 pr-5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400 rounded-full"
        aria-label="Change status"
      >
        {ACTION_ITEM_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <HiChevronDown className="pointer-events-none absolute right-1.5 w-3 h-3 opacity-60" />
    </span>
  );
}

function ActionItemCard({
  item,
  onDelete,
  onStatusChange,
}: {
  item: ActionItem;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ActionItemStatus) => void;
}) {
  const hasMedication = item.medication != null;

  return (
    <article
      className="relative rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      data-action-item-id={item.id}
    >
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        aria-label={`Delete ${item.title || "action item"}`}
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
      <div className="flex flex-col gap-2 pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-neutral-900">
            {item.title || "Untitled"}
          </h3>
          {item.type && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
              {item.type}
            </span>
          )}
          {item.priority && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                item.priority === "high"
                  ? "bg-rose-100 text-rose-800"
                  : item.priority === "medium"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {item.priority}
            </span>
          )}
          <StatusDropdown
            value={item.status}
            onChange={(status) => onStatusChange(item.id, status)}
          />
        </div>
        {item.description ? (
          <p className="text-sm text-neutral-600">{item.description}</p>
        ) : null}
        <p className="text-xs text-neutral-500">
          Due: {formatDueDate(item.dueBy)}
        </p>
        {hasMedication && item.medication && (
          <div className="mt-2 rounded-lg bg-neutral-50 p-3 text-sm">
            <span className="font-medium text-neutral-700">Medication: </span>
            <span className="text-neutral-600">
              {item.medication.name} — {item.medication.dose}{" "}
              {item.medication.dosageUnit}, {item.medication.count}x,{" "}
              {item.medication.route}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-6 text-center">
      <p className="text-sm font-medium text-neutral-600">No action items yet</p>
      <p className="text-xs text-neutral-500 max-w-xs">
        Action items from your visits will show up here so you can track
        follow-ups and medications.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
      <p className="text-sm font-medium text-rose-800">Something went wrong</p>
      <p className="mt-1 text-xs text-rose-700">{message}</p>
    </div>
  );
}

function ActionItemList({
  items,
  onDelete,
  onStatusChange,
}: {
  items: ActionItem[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ActionItemStatus) => void;
}) {
  return (
    <ul className="flex flex-col gap-3 list-none p-0 m-0">
      {items.map((item) => (
        <li key={item.id}>
          <ActionItemCard item={item} onDelete={onDelete} onStatusChange={onStatusChange} />
        </li>
      ))}
    </ul>
  );
}

export default function ActionItemsPage() {
  const { actionItems, loading, error } = useActionItems();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { current, past } = useMemo(() => {
    const cur: ActionItem[] = [];
    const pst: ActionItem[] = [];
    for (const item of actionItems) {
      (isPastStatus(item.status) ? pst : cur).push(item);
    }
    return {
      current: sortActionItemsByPriorityAndDueDate(cur),
      past: sortActionItemsByPriorityAndDueDate(pst),
    };
  }, [actionItems]);

  const handleDelete = async (itemId: string) => {
    if (!user?.uid) return;
    setOperationError(null);
    const result = await deleteActionItem(db, user.uid, itemId);
    if (result.ok) {
      setToastMessage("Deleted");
    } else {
      setOperationError(result.error.message);
    }
  };

  const handleStatusChange = async (itemId: string, status: ActionItemStatus) => {
    if (!user?.uid) return;
    setOperationError(null);
    const item = actionItems.find((ai) => ai.id === itemId);
    if (!item) return;
    const result = await writeActionItem(db, user.uid, { ...item, status });
    if (result.ok) {
      setToastMessage("Status updated");
    } else {
      setOperationError(result.error.message);
    }
  };

  const dismissToast = useCallback(() => setToastMessage(null), []);

  return (
    <div className="w-full min-h-screen flex flex-col">
      <Toast message={toastMessage ?? ""} visible={toastMessage != null} onDismiss={dismissToast} />
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => openDrawer?.()}
          className="p-2 -ml-2 rounded-lg text-neutral-900 hover:bg-neutral-100 transition-colors"
          aria-label="Open menu"
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-900">Action Items</h1>
        <div className="w-10" aria-hidden />
      </header>
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-auto">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-neutral-500">
          Follow-ups and tasks from your care team, updated in real time.
        </p>
      </div>

      {operationError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
          <p className="text-sm text-rose-800">{operationError}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
          <Spinner size="lg" theme="neutral" />
          <span className="text-sm text-neutral-500">Loading action items…</span>
        </div>
      )}

      {!loading && error && <ErrorState message={error.message} />}

      {!loading && !error && actionItems.length === 0 && <EmptyState />}

      {!loading && !error && current.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-700 mb-2">Current</h2>
          <ActionItemList items={current} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </section>
      )}

      {!loading && !error && past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-2">Past</h2>
          <ActionItemList items={past} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </section>
      )}
      </div>
    </div>
  );
}
