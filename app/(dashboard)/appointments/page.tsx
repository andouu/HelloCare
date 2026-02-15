"use client";

import { useCallback, useMemo, useState } from "react";
import { HiOutlineMenuAlt4, HiOutlineTrash } from "react-icons/hi";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { deleteAppointment, useAppointments } from "@/lib/firestore";
import type { Appointment } from "@/lib/firestore";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Format as date and time (e.g. Jan 15, 2025, 2:30 PM). */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type TimeUntil = { label: string; pillClass: string };

function getTimeUntil(appointmentTime: Date): TimeUntil {
  const now = Date.now();
  const t = appointmentTime.getTime();
  const diff = t - now;

  if (diff <= 0) {
    const ago = Math.abs(diff);
    if (ago < MS_PER_HOUR) return { label: "Just passed", pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
    if (ago < MS_PER_DAY) return { label: `${Math.floor(ago / MS_PER_HOUR)}h ago`, pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
    if (ago < MS_PER_WEEK) return { label: `${Math.floor(ago / MS_PER_DAY)}d ago`, pillClass: "bg-neutral-100 text-neutral-500 border-neutral-200" };
    return { label: "Passed", pillClass: "bg-neutral-100 text-neutral-400 border-neutral-200" };
  }

  if (diff < MS_PER_HOUR) return { label: "In < 1 hour", pillClass: "bg-rose-100 text-rose-800 border-rose-200" };
  if (diff < MS_PER_DAY) return { label: `In ${Math.ceil(diff / MS_PER_HOUR)}h`, pillClass: "bg-rose-50 text-rose-700 border-rose-200" };
  if (diff < MS_PER_WEEK) return { label: `In ${Math.ceil(diff / MS_PER_DAY)} days`, pillClass: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: `In ${Math.ceil(diff / MS_PER_DAY)} days`, pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
}

/** Sort by closest to current time: soonest upcoming first, then later upcoming, then past (most recent first). */
function sortAppointmentsByClosest(appointments: Appointment[]): Appointment[] {
  const now = Date.now();
  return [...appointments].sort((a, b) => {
    const ta = a.appointmentTime.getTime();
    const tb = b.appointmentTime.getTime();
    const aFuture = ta > now;
    const bFuture = tb > now;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    if (aFuture && bFuture) return ta - tb;
    return tb - ta;
  });
}

function AppointmentCard({
  appointment,
  onDelete,
}: {
  appointment: Appointment;
  onDelete: (id: string) => void;
}) {
  const { label, pillClass } = getTimeUntil(appointment.appointmentTime);
  return (
    <article
      className="relative rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      data-appointment-id={appointment.id}
    >
      <button
        type="button"
        onClick={() => onDelete(appointment.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        aria-label="Delete appointment"
      >
        <HiOutlineTrash className="w-4 h-4" />
      </button>
      <div className="flex flex-col gap-2 pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${pillClass}`}
          >
            {label}
          </span>
          <h3 className="text-base font-semibold text-neutral-900">
            {formatDateTime(appointment.appointmentTime)}
          </h3>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>Scheduled at: {formatDateTime(appointment.scheduledOn)}</span>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-6 text-center">
      <p className="text-sm font-medium text-neutral-600">No appointments yet</p>
      <p className="text-xs text-neutral-500 max-w-xs">
        Your scheduled appointments will show up here. Schedule via the
        conversation or schedule flow.
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

export default function AppointmentsPage() {
  const { appointments, loading, error } = useAppointments();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (appointmentId: string) => {
      if (!user?.uid) return;
      setOperationError(null);
      const result = await deleteAppointment(db, user.uid, appointmentId);
      if (result.ok) {
        setToastMessage("Deleted");
      } else {
        setOperationError(result.error.message);
      }
    },
    [user?.uid]
  );

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const sortedAppointments = useMemo(
    () => sortAppointmentsByClosest(appointments),
    [appointments]
  );

  return (
    <div className="w-full min-h-screen flex flex-col">
      <Toast
        message={toastMessage ?? ""}
        visible={toastMessage != null}
        onDismiss={dismissToast}
      />
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => openDrawer?.()}
          className="p-2 -ml-2 rounded-lg text-neutral-900 hover:bg-neutral-100 transition-colors"
          aria-label="Open menu"
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-900">Appointments</h1>
        <div className="w-10" aria-hidden />
      </header>
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-auto">
        <p className="text-sm text-neutral-500">
          Your scheduled appointments, updated in real time.
        </p>

        {operationError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
            <p className="text-sm text-rose-800">{operationError}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <Spinner size="lg" theme="neutral" />
            <span className="text-sm text-neutral-500">
              Loading appointments…
            </span>
          </div>
        )}

        {!loading && error && <ErrorState message={error.message} />}

        {!loading && !error && appointments.length === 0 && <EmptyState />}

        {!loading && !error && sortedAppointments.length > 0 && (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {sortedAppointments.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentCard
                  appointment={appointment}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
