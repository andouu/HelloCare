"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { HiOutlineMenuAlt4, HiOutlineTrash } from "react-icons/hi";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_TYPES,
  deleteSessionMetadata,
  useActionItems,
  useSessionMetadata,
  writeActionItem,
} from "@/lib/firestore";
import type { ActionItem, SessionMetadata } from "@/lib/firestore";
import { PillDropdown } from "@/app/components/PillDropdown";

/** Format as day, month, year only. */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

/** Format due date for compact display. */
function formatDueDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

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

function LinkedActionItemCard({
  item,
  onFieldChange,
}: {
  item: ActionItem;
  onFieldChange: (id: string, field: string, value: string) => void;
}) {
  return (
    <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50/80 p-2.5 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-100">
      <Link
        href={`/action-items?highlight=${encodeURIComponent(item.id)}`}
        className="block focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 focus:rounded"
      >
        <p className="text-sm font-medium text-neutral-900">{item.title || "Untitled"}</p>
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
        <span className="text-xs text-neutral-500">Due: {formatDueDateShort(item.dueBy)}</span>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  linkedActionItems,
  onDelete,
  onActionItemFieldChange,
}: {
  session: SessionMetadata;
  linkedActionItems: ActionItem[];
  onDelete: (id: string) => void;
  onActionItemFieldChange: (id: string, field: string, value: string) => void;
}) {
  return (
    <article
      className="relative rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      data-session-id={session.id}
    >
      <button
        type="button"
        onClick={() => onDelete(session.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        aria-label={`Delete ${session.title || "session"}`}
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
      <div className="flex flex-col gap-2 pr-8">
        <h3 className="text-base font-semibold text-neutral-900">
          {session.title || "Untitled visit"}
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>Date: {formatDate(session.date)}</span>
        </div>
        {session.summary ? (
          <div className="mt-1">
            <p className="text-xs font-medium text-neutral-500 mb-1">Summary</p>
            <p className="text-sm text-neutral-600 whitespace-pre-wrap">{session.summary}</p>
          </div>
        ) : null}
        {linkedActionItems.length > 0 ? (
          <div className="mt-2 w-full">
            <p className="text-xs font-medium text-neutral-500 mb-1.5">Linked action items</p>
            <div className="flex flex-col gap-2 w-full">
              {linkedActionItems.map((item) => (
                <LinkedActionItemCard
                  key={item.id}
                  item={item}
                  onFieldChange={onActionItemFieldChange}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-6 text-center">
      <p className="text-sm font-medium text-neutral-600">No past sessions yet</p>
      <p className="text-xs text-neutral-500 max-w-xs">
        Visit summaries from your appointments will show up here after you
        complete a conversation and save the summary.
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

export default function PastSessionsPage() {
  const { sessionMetadata, loading, error } = useSessionMetadata();
  const { actionItems } = useActionItems();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const actionItemsById = useMemo(() => {
    const map = new Map<string, ActionItem>();
    for (const item of actionItems) {
      map.set(item.id, item);
    }
    return map;
  }, [actionItems]);

  const getLinkedActionItems = useCallback(
    (session: SessionMetadata): ActionItem[] => {
      return session.actionItemIds
        .map((id) => actionItemsById.get(id))
        .filter((item): item is ActionItem => item != null);
    },
    [actionItemsById]
  );

  const handleDelete = async (sessionId: string) => {
    if (!user?.uid) return;
    setOperationError(null);
    const result = await deleteSessionMetadata(db, user.uid, sessionId);
    if (result.ok) {
      setToastMessage("Deleted");
    } else {
      setOperationError(result.error.message);
    }
  };

  const handleActionItemFieldChange = useCallback(
    async (itemId: string, field: string, value: string) => {
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
    },
    [user?.uid, actionItems]
  );

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
        <h1 className="text-lg font-semibold text-neutral-900">Past Sessions</h1>
        <div className="w-10" aria-hidden />
      </header>
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-auto">
        <p className="text-sm text-neutral-500">
          Visit summaries from your appointments.
        </p>

        {operationError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
            <p className="text-sm text-rose-800">{operationError}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <Spinner size="lg" theme="neutral" />
            <span className="text-sm text-neutral-500">Loading past sessions…</span>
          </div>
        )}

        {!loading && error && <ErrorState message={error.message} />}

        {!loading && !error && sessionMetadata.length === 0 && <EmptyState />}

        {!loading && !error && sessionMetadata.length > 0 && (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {sessionMetadata.map((session) => (
              <li key={session.id}>
                <SessionCard
                  session={session}
                  linkedActionItems={getLinkedActionItems(session)}
                  onDelete={handleDelete}
                  onActionItemFieldChange={handleActionItemFieldChange}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
