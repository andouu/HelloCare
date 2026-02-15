"use client";

import { HiOutlineMenuAlt4 } from "react-icons/hi";
import { Spinner } from "@/app/components/Spinner";
import { useDrawer } from "@/app/(dashboard)/layout";
import { sortActionItemsByPriorityAndDueDate, useActionItems } from "@/lib/firestore";
import type { ActionItem } from "@/lib/firestore";

function formatDueDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ActionItemCard({ item }: { item: ActionItem }) {
  const hasMedication = item.medication != null;

  return (
    <article
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      data-action-item-id={item.id}
    >
      <div className="flex flex-col gap-2">
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
          {item.status && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {item.status}
            </span>
          )}
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

  return (
    <div className="w-full min-h-screen flex flex-col">
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

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
          <Spinner size="lg" theme="neutral" />
          <span className="text-sm text-neutral-500">Loading action items…</span>
        </div>
      )}

      {!loading && error && <ErrorState message={error.message} />}

      {!loading && !error && actionItems.length === 0 && <EmptyState />}

      {!loading && !error && actionItems.length > 0 && (
        <ul className="flex flex-col gap-3 list-none p-0 m-0">
          {sortActionItemsByPriorityAndDueDate(actionItems).map((item) => (
            <li key={item.id}>
              <ActionItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
