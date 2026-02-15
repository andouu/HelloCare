"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HiOutlineMenuAlt4, HiOutlineTrash } from "react-icons/hi";
import { useI18n } from "@/app/components/I18nProvider";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { deleteDocument, useDocuments } from "@/lib/firestore";
import type { Document } from "@/lib/firestore";
import type { MessageKey } from "@/lib/i18n/messages";

const HIGHLIGHT_CLASS = "ring-2 ring-blue-500 ring-offset-2";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function DocumentCard({
  doc: document,
  formatDate,
  t,
  onDelete,
  highlight,
}: {
  doc: Document;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  t: Translate;
  onDelete: (id: string) => void;
  highlight: boolean;
}) {
  const title =
    document.summary.trim().split(/\n/)[0]?.slice(0, 60)?.trim() ||
    t("documents.untitled");
  return (
    <article
      id={`document-${document.id}`}
      className={`relative rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${highlight ? `border-blue-500 ${HIGHLIGHT_CLASS}` : "border-neutral-200"}`}
      data-document-id={document.id}
    >
      <button
        type="button"
        onClick={() => onDelete(document.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        aria-label={t("documents.deleteAria", { name: title })}
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
      <div className="flex flex-col gap-2 pr-8">
        <h3 className="text-base font-semibold text-neutral-900">
          {title}
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>{t("documents.uploadedAt", { date: formatDate(document.uploadedAt, { dateStyle: "medium" }) })}</span>
        </div>
        <p className="text-sm text-neutral-600 whitespace-pre-wrap leading-relaxed mt-1">
          {document.summary.trim() || t("documents.noSummary")}
        </p>
      </div>
    </article>
  );
}

function EmptyState({ t }: { t: Translate }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-6 text-center">
      <p className="text-sm font-medium text-neutral-600">{t("documents.emptyTitle")}</p>
      <p className="text-xs text-neutral-500 max-w-xs">
        {t("documents.emptyBody")}
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

export default function DocumentsPage() {
  const { t, formatDate } = useI18n();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { documents, loading, error } = useDocuments();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`document-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, loading]);

  const handleDelete = useCallback(
    async (documentId: string) => {
      if (!user?.uid) return;
      setOperationError(null);
      const result = await deleteDocument(db, user.uid, documentId);
      if (result.ok) {
        setToastMessage(t("common.deleted"));
      } else {
        setOperationError(result.error.message);
      }
    },
    [user?.uid, t]
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
        <h1 className="text-lg font-semibold text-neutral-900">{t("documents.title")}</h1>
        <div className="w-10" aria-hidden />
      </header>
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-auto">
        <p className="text-sm text-neutral-500">
          {t("documents.subtitle")}
        </p>

        {operationError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
            <p className="text-sm text-rose-800">{operationError}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <Spinner size="lg" theme="neutral" />
            <span className="text-sm text-neutral-500">{t("documents.loading")}</span>
          </div>
        )}

        {!loading && error && <ErrorState message={error.message} t={t} />}

        {!loading && !error && documents.length === 0 && <EmptyState t={t} />}

        {!loading && !error && documents.length > 0 && (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {documents.map((doc) => (
              <li key={doc.id}>
                <DocumentCard
                  doc={doc}
                  formatDate={formatDate}
                  t={t}
                  onDelete={handleDelete}
                  highlight={highlightId === doc.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
