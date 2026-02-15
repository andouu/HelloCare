"use client";

import { useCallback, useState } from "react";
import { HiOutlineMenuAlt4, HiOutlineTrash } from "react-icons/hi";
import { PillDropdown } from "@/app/components/PillDropdown";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { deleteHealthNote, HEALTH_NOTE_TYPES, useHealthNotes, writeHealthNote } from "@/lib/firestore";
import type { HealthNote } from "@/lib/firestore";

/** Format as day, month, year only. */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function HealthNoteCard({
  note,
  onDelete,
  onFieldChange,
}: {
  note: HealthNote;
  onDelete: (id: string) => void;
  onFieldChange: (id: string, field: string, value: string) => void;
}) {
  return (
    <article
      className="relative rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      data-health-note-id={note.id}
    >
      <button
        type="button"
        onClick={() => onDelete(note.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        aria-label={`Delete ${note.title || "health note"}`}
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
      <div className="flex flex-col gap-2 pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-neutral-900">
            {note.title || "Untitled"}
          </h3>
          <PillDropdown
            value={note.type}
            options={HEALTH_NOTE_TYPES}
            onChange={(v) => onFieldChange(note.id, "type", v)}
            ariaLabel="Change type"
          />
        </div>
        {note.description ? (
          <p className="text-sm text-neutral-600">{note.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>Date: {formatDate(note.date)}</span>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-6 text-center">
      <p className="text-sm font-medium text-neutral-600">No health notes yet</p>
      <p className="text-xs text-neutral-500 max-w-xs">
        Health notes from your visits will show up here so you can review
        symptoms, injuries, and pain history.
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

export default function HealthNotesPage() {
  const { healthNotes, loading, error } = useHealthNotes();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDelete = async (noteId: string) => {
    if (!user?.uid) return;
    setOperationError(null);
    const result = await deleteHealthNote(db, user.uid, noteId);
    if (result.ok) {
      setToastMessage("Deleted");
    } else {
      setOperationError(result.error.message);
    }
  };

  const handleFieldChange = async (noteId: string, field: string, value: string) => {
    if (!user?.uid) return;
    setOperationError(null);
    const note = healthNotes.find((n) => n.id === noteId);
    if (!note) return;
    const result = await writeHealthNote(db, user.uid, { ...note, [field]: value });
    if (result.ok) {
      setToastMessage("Updated");
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
        <h1 className="text-lg font-semibold text-neutral-900">Health Notes</h1>
        <div className="w-10" aria-hidden />
      </header>
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-auto">
      <p className="text-sm text-neutral-500">
        Your health notes from visits, updated in real time.
      </p>

      {operationError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
          <p className="text-sm text-rose-800">{operationError}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
          <Spinner size="lg" theme="neutral" />
          <span className="text-sm text-neutral-500">Loading health notes…</span>
        </div>
      )}

      {!loading && error && <ErrorState message={error.message} />}

      {!loading && !error && healthNotes.length === 0 && <EmptyState />}

      {!loading && !error && healthNotes.length > 0 && (
        <ul className="flex flex-col gap-3 list-none p-0 m-0">
          {healthNotes.map((note) => (
            <li key={note.id}>
              <HealthNoteCard note={note} onDelete={handleDelete} onFieldChange={handleFieldChange} />
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
