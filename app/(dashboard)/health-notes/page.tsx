"use client";

import { HiOutlineMenuAlt4 } from "react-icons/hi";
import { Spinner } from "@/app/components/Spinner";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useHealthNotes } from "@/lib/firestore";
import type { HealthNote } from "@/lib/firestore";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
  }).format(date);
}

function HealthNoteCard({ note }: { note: HealthNote }) {
  return (
    <article
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      data-health-note-id={note.id}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-neutral-900">
            {note.title || "Untitled"}
          </h3>
          {note.type && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
              {note.type}
            </span>
          )}
        </div>
        {note.description ? (
          <p className="text-sm text-neutral-600">{note.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>Date: {formatDate(note.date)}</span>
          <span>
            {formatTime(note.startedAt)} – {formatTime(note.endedAt)}
          </span>
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

  return (
    <div className="w-full min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => openDrawer?.()}
          className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
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
              <HealthNoteCard note={note} />
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
