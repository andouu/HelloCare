"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { HiOutlineMenuAlt4, HiOutlineTrash } from "react-icons/hi";
import { useI18n } from "@/app/components/I18nProvider";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";
import { useDrawer } from "@/app/(dashboard)/DashboardShell";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_TYPES,
  deleteSessionMetadata,
  useActionItems,
  useDocuments,
  useSessionMetadata,
  writeActionItem,
} from "@/lib/firestore";
import type { ActionItem, Document, SessionMetadata } from "@/lib/firestore";
import { PillDropdown } from "@/app/components/PillDropdown";
import type { MessageKey } from "@/lib/i18n/messages";

/** Truncate text to a max length with ellipsis. */
function truncateSummary(text: string, maxLength: number): string {
  const t = text.trim();
  if (t.length <= maxLength) return t;
  return t.slice(0, maxLength).trim() + "…";
}

function LinkedDocumentCard({ doc: document }: { doc: Document }) {
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(document.uploadedAt);
  const title =
    document.summary.trim().split(/\n/)[0]?.slice(0, 50)?.trim() ||
    `Document from ${dateLabel}`;
  const truncated = truncateSummary(document.summary, 120);
  return (
    <Link
      href={`/documents?highlight=${encodeURIComponent(document.id)}`}
      className="block w-full rounded-lg border border-neutral-200 bg-neutral-50/80 p-2.5 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 focus:rounded-lg"
    >
      <p className="text-sm font-medium text-neutral-900">
        {truncateSummary(title, 60)}
      </p>
      <p className="mt-1 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
        {truncated}
      </p>
    </Link>
  );
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
  formatDate,
  t,
  onFieldChange,
}: {
  item: ActionItem;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  onFieldChange: (id: string, field: string, value: string) => void;
}) {
  return (
    <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50/80 p-2.5 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-100">
      <Link
        href={`/action-items?highlight=${encodeURIComponent(item.id)}`}
        className="block focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 focus:rounded"
      >
        <p className="text-sm font-medium text-neutral-900">{item.title || t("pastSessions.untitled")}</p>
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <PillDropdown
          value={item.type}
          options={ACTION_ITEM_TYPES}
          onChange={(v) => onFieldChange(item.id, "type", v)}
          ariaLabel={t("pastSessions.changeType")}
        />
        <PillDropdown
          value={item.priority}
          options={ACTION_ITEM_PRIORITIES}
          onChange={(v) => onFieldChange(item.id, "priority", v)}
          styles={PRIORITY_STYLES}
          ariaLabel={t("pastSessions.changePriority")}
        />
        <PillDropdown
          value={item.status}
          options={ACTION_ITEM_STATUSES}
          onChange={(v) => onFieldChange(item.id, "status", v)}
          styles={STATUS_STYLES}
          ariaLabel={t("pastSessions.changeStatus")}
        />
        <span className="text-xs text-neutral-500">{t("pastSessions.due", { date: formatDate(item.dueBy, { month: "short", day: "numeric", year: "numeric" }) })}</span>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  linkedActionItems,
  formatDate,
  t,
  linkedDocuments,
  onDelete,
  onActionItemFieldChange,
}: {
  session: SessionMetadata;
  linkedActionItems: ActionItem[];
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  linkedDocuments: Document[];
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
        aria-label={t("pastSessions.deleteAria", { name: session.title || t("pastSessions.untitledVisit") })}
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
      <div className="flex flex-col gap-2 pr-8">
        <h3 className="text-base font-semibold text-neutral-900">
          {session.title || t("pastSessions.untitledVisit")}
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>{t("pastSessions.date", { date: formatDate(session.date, { dateStyle: "medium" }) })}</span>
        </div>
        {session.summary ? (
          <div className="mt-1">
            <p className="text-xs font-medium text-neutral-500 mb-1">{t("pastSessions.summary")}</p>
            <p className="text-sm text-neutral-600 whitespace-pre-wrap">{session.summary}</p>
          </div>
        ) : null}
        {linkedActionItems.length > 0 ? (
          <div className="mt-2 w-full">
            <p className="text-xs font-medium text-neutral-500 mb-1.5">{t("pastSessions.linkedActionItems")}</p>
            <div className="flex flex-col gap-2 w-full">
              {linkedActionItems.map((item) => (
                <LinkedActionItemCard
                  key={item.id}
                  item={item}
                  formatDate={formatDate}
                  t={t}
                  onFieldChange={onActionItemFieldChange}
                />
              ))}
            </div>
          </div>
        ) : null}
        {linkedDocuments.length > 0 ? (
          <div className="mt-2 w-full">
            <p className="text-xs font-medium text-neutral-500 mb-1.5">Linked documents</p>
            <div className="flex flex-col gap-2 w-full">
              {linkedDocuments.map((doc) => (
                <LinkedDocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function EmptyState({ t }: { t: (key: MessageKey, vars?: Record<string, string | number>) => string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-6 text-center">
      <p className="text-sm font-medium text-neutral-600">{t("pastSessions.emptyTitle")}</p>
      <p className="text-xs text-neutral-500 max-w-xs">
        {t("pastSessions.emptyBody")}
      </p>
    </div>
  );
}

function ErrorState({
  message,
  t,
}: {
  message: string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
      <p className="text-sm font-medium text-rose-800">{t("common.somethingWentWrong")}</p>
      <p className="mt-1 text-xs text-rose-700">{message}</p>
    </div>
  );
}

export default function PastSessionsPage() {
  const { t, formatDate } = useI18n();
  const { sessionMetadata, loading, error } = useSessionMetadata();
  const { actionItems } = useActionItems();
  const { documents } = useDocuments();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const uid = user?.uid;
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const actionItemsById = useMemo(() => {
    const map = new Map<string, ActionItem>();
    for (const item of actionItems) {
      map.set(item.id, item);
    }
    return map;
  }, [actionItems]);

  const documentsById = useMemo(() => {
    const map = new Map<string, Document>();
    for (const d of documents) {
      map.set(d.id, d);
    }
    return map;
  }, [documents]);

  const getLinkedActionItems = useCallback(
    (session: SessionMetadata): ActionItem[] => {
      return session.actionItemIds
        .map((id) => actionItemsById.get(id))
        .filter((item): item is ActionItem => item != null);
    },
    [actionItemsById]
  );

  const getLinkedDocuments = useCallback(
    (session: SessionMetadata): Document[] => {
      return session.documentIds
        .map((id) => documentsById.get(id))
        .filter((doc): doc is Document => doc != null);
    },
    [documentsById]
  );

  const handleDelete = async (sessionId: string) => {
    if (!uid) return;
    setOperationError(null);
    const result = await deleteSessionMetadata(db, uid, sessionId);
    if (result.ok) {
      setToastMessage(t("common.deleted"));
    } else {
      setOperationError(result.error.message);
    }
  };

  const handleActionItemFieldChange = useCallback(
    async (itemId: string, field: string, value: string) => {
      if (!uid) return;
      setOperationError(null);
      const item = actionItems.find((ai) => ai.id === itemId);
      if (!item) return;
      const result = await writeActionItem(db, uid, { ...item, [field]: value });
      if (result.ok) {
        setToastMessage(t("common.updated"));
      } else {
        setOperationError(result.error.message);
      }
    },
    [uid, actionItems, t]
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
          aria-label={t("home.openMenu")}
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-900">{t("pastSessions.title")}</h1>
        <div className="w-10" aria-hidden />
      </header>
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-auto">
        <p className="text-sm text-neutral-500">
          {t("pastSessions.subtitle")}
        </p>

        {operationError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
            <p className="text-sm text-rose-800">{operationError}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <Spinner size="lg" theme="neutral" />
            <span className="text-sm text-neutral-500">{t("pastSessions.loading")}</span>
          </div>
        )}

        {!loading && error && <ErrorState message={error.message} t={t} />}

        {!loading && !error && sessionMetadata.length === 0 && <EmptyState t={t} />}

        {!loading && !error && sessionMetadata.length > 0 && (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {sessionMetadata.map((session) => (
              <li key={session.id}>
                <SessionCard
                  session={session}
                  linkedActionItems={getLinkedActionItems(session)}
                  formatDate={formatDate}
                  t={t}
                  linkedDocuments={getLinkedDocuments(session)}
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
