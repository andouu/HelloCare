"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { HiOutlineMenuAlt4, HiOutlineTrash } from "react-icons/hi";
import { PillDropdown } from "@/app/components/PillDropdown";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_TYPES,
  deleteActionItem,
  isPastStatus,
  sortActionItemsByPriorityAndDueDate,
  useActionItems,
  writeActionItem,
} from "@/lib/firestore";
import type { ActionItem } from "@/lib/firestore";

/** Format due date as day, month, year only (UTC). */
function formatDueDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  skipped: "bg-neutral-100 text-neutral-500 border-neutral-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

function ActionItemCard({
  item,
  onDelete,
  onFieldChange,
}: {
  item: ActionItem;
  onDelete: (id: string) => void;
  onFieldChange: (id: string, field: string, value: string) => void;
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
          <PillDropdown
            value={item.type}
            options={ACTION_ITEM_TYPES}
            onChange={(v) => onFieldChange(item.id, "type", v)}
            ariaLabel="Change type"
          />
          <PillDropdown
            value={item.priority}
            options={ACTION_ITEM_PRIORITIES}
            onChange={(v) => onFieldChange(item.id, "priority", v)}
            styles={PRIORITY_STYLES}
            ariaLabel="Change priority"
          />
          <PillDropdown
            value={item.status}
            options={ACTION_ITEM_STATUSES}
            onChange={(v) => onFieldChange(item.id, "status", v)}
            styles={STATUS_STYLES}
            ariaLabel="Change status"
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

export default function ActionItemsPage() {
  const { actionItems, loading, error } = useActionItems();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleFieldChange = async (itemId: string, field: string, value: string) => {
    if (!user?.uid) return;
    setOperationError(null);
    const item = actionItems.find((ai) => ai.id === itemId);
    if (!item) return;
    const result = await writeActionItem(db, user.uid, { ...item, [field]: value });
    if (result.ok) {
      setToastMessage("Updated");
    } else {
      setOperationError(result.error.message);
    }
  };

  const dismissToast = useCallback(() => setToastMessage(null), []);

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

  const renderList = (items: ActionItem[]) => (
    <ul className="flex flex-col gap-3 list-none p-0 m-0">
      {items.map((item) => (
        <li key={item.id}>
          <ActionItemCard item={item} onDelete={handleDelete} onFieldChange={handleFieldChange} />
        </li>
      ))}
    </ul>
  );

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
          {renderList(current)}
        </section>
      )}

      {!loading && !error && past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-2">Past</h2>
          {renderList(past)}
        </section>
      )}
      </div>
    </div>
  );
}
