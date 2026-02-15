"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HiOutlineMenuAlt4, HiOutlineTrash } from "react-icons/hi";
import { useI18n } from "@/app/components/I18nProvider";
import { PillDropdown, type PillOption } from "@/app/components/PillDropdown";
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
import type { MessageKey } from "@/lib/i18n/messages";

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

const HIGHLIGHT_CLASS = "ring-2 ring-blue-500 ring-offset-2";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

const ACTION_ITEM_TYPE_LABEL_KEYS: Record<string, MessageKey> = {
  Medication: "actionItems.type.medication",
  Exercise: "actionItems.type.exercise",
  Appointment: "actionItems.type.appointment",
  Other: "actionItems.type.other",
};

const ACTION_ITEM_PRIORITY_LABEL_KEYS: Record<string, MessageKey> = {
  low: "actionItems.priority.low",
  medium: "actionItems.priority.medium",
  high: "actionItems.priority.high",
};

const ACTION_ITEM_STATUS_LABEL_KEYS: Record<string, MessageKey> = {
  pending: "actionItems.status.pending",
  in_progress: "actionItems.status.inProgress",
  done: "actionItems.status.done",
  skipped: "actionItems.status.skipped",
};

function localizePillOptions(
  options: readonly PillOption[],
  labelKeys: Record<string, MessageKey>,
  t: Translate,
): PillOption[] {
  return options.map((option) => {
    const key = labelKeys[option.value];
    if (!key) return option;
    return { value: option.value, label: t(key) };
  });
}

function ActionItemCard({
  item,
  highlight,
  formatDate,
  typeOptions,
  priorityOptions,
  statusOptions,
  t,
  onDelete,
  onFieldChange,
}: {
  item: ActionItem;
  highlight: boolean;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  typeOptions: readonly PillOption[];
  priorityOptions: readonly PillOption[];
  statusOptions: readonly PillOption[];
  t: Translate;
  onDelete: (id: string) => void;
  onFieldChange: (id: string, field: string, value: string) => void;
}) {
  const hasMedication = item.medication != null;

  return (
    <article
      id={`action-item-${item.id}`}
      className={`relative rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${highlight ? `border-blue-500 ${HIGHLIGHT_CLASS}` : "border-neutral-200"}`}
      data-action-item-id={item.id}
    >
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        aria-label={t("actionItems.deleteAria", { name: item.title || t("homeSummary.actionItemFallback") })}
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
      <div className="flex flex-col gap-2 pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-neutral-900">
            {item.title || t("actionItems.untitled")}
          </h3>
          <PillDropdown
            value={item.type}
            options={typeOptions}
            onChange={(v) => onFieldChange(item.id, "type", v)}
            ariaLabel={t("actionItems.changeType")}
          />
          <PillDropdown
            value={item.priority}
            options={priorityOptions}
            onChange={(v) => onFieldChange(item.id, "priority", v)}
            styles={PRIORITY_STYLES}
            ariaLabel={t("actionItems.changePriority")}
          />
          <PillDropdown
            value={item.status}
            options={statusOptions}
            onChange={(v) => onFieldChange(item.id, "status", v)}
            styles={STATUS_STYLES}
            ariaLabel={t("actionItems.changeStatus")}
          />
        </div>
        {item.description ? (
          <p className="text-sm text-neutral-600">{item.description}</p>
        ) : null}
        <p className="text-xs text-neutral-500">
          {t("actionItems.due", { date: formatDate(item.dueBy, { dateStyle: "medium" }) })}
        </p>
        {hasMedication && item.medication && (
          <div className="mt-2 rounded-lg bg-neutral-50 p-3 text-sm">
            <span className="font-medium text-neutral-700">{t("actionItems.medication")} </span>
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

function EmptyState({ t }: { t: Translate }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-6 text-center">
      <p className="text-sm font-medium text-neutral-600">{t("actionItems.emptyTitle")}</p>
      <p className="text-xs text-neutral-500 max-w-xs">
        {t("actionItems.emptyBody")}
      </p>
    </div>
  );
}

function ErrorState({
  message,
  t,
}: {
  message: string;
  t: Translate;
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
      <p className="text-sm font-medium text-rose-800">{t("common.somethingWentWrong")}</p>
      <p className="mt-1 text-xs text-rose-700">{message}</p>
    </div>
  );
}

export default function ActionItemsPage() {
  const { t, formatDate } = useI18n();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { actionItems, loading, error } = useActionItems();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`action-item-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, loading]);

  const handleDelete = async (itemId: string) => {
    if (!user?.uid) return;
    setOperationError(null);
    const result = await deleteActionItem(db, user.uid, itemId);
    if (result.ok) {
      setToastMessage(t("common.deleted"));
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
      setToastMessage(t("common.updated"));
    } else {
      setOperationError(result.error.message);
    }
  };

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const typeOptions = useMemo(
    () => localizePillOptions(ACTION_ITEM_TYPES, ACTION_ITEM_TYPE_LABEL_KEYS, t),
    [t],
  );
  const priorityOptions = useMemo(
    () => localizePillOptions(ACTION_ITEM_PRIORITIES, ACTION_ITEM_PRIORITY_LABEL_KEYS, t),
    [t],
  );
  const statusOptions = useMemo(
    () => localizePillOptions(ACTION_ITEM_STATUSES, ACTION_ITEM_STATUS_LABEL_KEYS, t),
    [t],
  );

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
          <ActionItemCard
            item={item}
            highlight={highlightId === item.id}
            formatDate={formatDate}
            typeOptions={typeOptions}
            priorityOptions={priorityOptions}
            statusOptions={statusOptions}
            t={t}
            onDelete={handleDelete}
            onFieldChange={handleFieldChange}
          />
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
          aria-label={t("home.openMenu")}
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-900">{t("actionItems.title")}</h1>
        <div className="w-10" aria-hidden />
      </header>
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-auto">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-neutral-500">
          {t("actionItems.subtitle")}
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
          <span className="text-sm text-neutral-500">{t("actionItems.loading")}</span>
        </div>
      )}

      {!loading && error && <ErrorState message={error.message} t={t} />}

      {!loading && !error && actionItems.length === 0 && <EmptyState t={t} />}

      {!loading && !error && current.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-700 mb-2">{t("actionItems.current")}</h2>
          {renderList(current)}
        </section>
      )}

      {!loading && !error && past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-2">{t("actionItems.past")}</h2>
          {renderList(past)}
        </section>
      )}
      </div>
    </div>
  );
}
