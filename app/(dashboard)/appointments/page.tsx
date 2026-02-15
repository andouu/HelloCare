"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HiOutlineMenuAlt4, HiOutlineTrash } from "react-icons/hi";
import { useI18n } from "@/app/components/I18nProvider";
import { Spinner } from "@/app/components/Spinner";
import { Toast } from "@/app/components/Toast";
import { useDrawer } from "@/app/(dashboard)/DashboardShell";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { deleteAppointment, useAppointments } from "@/lib/firestore";
import type { Appointment } from "@/lib/firestore";
import type { MessageKey } from "@/lib/i18n/messages";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

type TimeUntil = { label: string; pillClass: string };

function getTimeUntil(
  appointmentTime: Date,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): TimeUntil {
  const now = Date.now();
  const tMs = appointmentTime.getTime();
  const diff = tMs - now;

  if (diff <= 0) {
    const ago = Math.abs(diff);
    if (ago < MS_PER_HOUR) return { label: t("time.justPassed"), pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
    if (ago < MS_PER_DAY) return { label: t("time.hoursAgo", { count: Math.floor(ago / MS_PER_HOUR) }), pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
    if (ago < MS_PER_WEEK) return { label: t("time.daysAgo", { count: Math.floor(ago / MS_PER_DAY) }), pillClass: "bg-neutral-100 text-neutral-500 border-neutral-200" };
    return { label: t("time.passed"), pillClass: "bg-neutral-100 text-neutral-400 border-neutral-200" };
  }

  if (diff < MS_PER_HOUR) return { label: t("time.inLessThanHour"), pillClass: "bg-rose-100 text-rose-800 border-rose-200" };
  if (diff < MS_PER_DAY) return { label: t("time.inHours", { count: Math.ceil(diff / MS_PER_HOUR) }), pillClass: "bg-rose-50 text-rose-700 border-rose-200" };
  if (diff < MS_PER_WEEK) return { label: t("time.inDays", { count: Math.ceil(diff / MS_PER_DAY) }), pillClass: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: t("time.inDays", { count: Math.ceil(diff / MS_PER_DAY) }), pillClass: "bg-neutral-100 text-neutral-600 border-neutral-200" };
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

const HIGHLIGHT_CLASS = "ring-2 ring-blue-500 ring-offset-2";

function AppointmentCard({
  appointment,
  highlight,
  formatDate,
  t,
  onDelete,
}: {
  appointment: Appointment;
  highlight: boolean;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  onDelete: (id: string) => void;
}) {
  const { label, pillClass } = getTimeUntil(appointment.appointmentTime, t);
  return (
    <article
      id={`appointment-${appointment.id}`}
      className={`relative rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${highlight ? "border-blue-500 " + HIGHLIGHT_CLASS : "border-neutral-200"}`}
      data-appointment-id={appointment.id}
    >
      <button
        type="button"
        onClick={() => onDelete(appointment.id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        aria-label={t("appointments.deleteAria")}
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
            {formatDate(appointment.appointmentTime, { dateStyle: "medium", timeStyle: "short" })}
          </h3>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          <span>{t("appointments.scheduledAt", { date: formatDate(appointment.scheduledOn, { dateStyle: "medium", timeStyle: "short" }) })}</span>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ t }: { t: (key: MessageKey, vars?: Record<string, string | number>) => string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 px-6 text-center">
      <p className="text-sm font-medium text-neutral-600">{t("appointments.emptyTitle")}</p>
      <p className="text-xs text-neutral-500 max-w-xs">
        {t("appointments.emptyBody")}
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

export default function AppointmentsPage() {
  const { t, formatDate } = useI18n();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { appointments, loading, error } = useAppointments();
  const { openDrawer } = useDrawer() ?? {};
  const { user } = useAuth();
  const uid = user?.uid;
  const [operationError, setOperationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`appointment-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, loading]);

  const handleDelete = useCallback(
    async (appointmentId: string) => {
      if (!uid) return;
      setOperationError(null);
      const result = await deleteAppointment(db, uid, appointmentId);
      if (result.ok) {
        setToastMessage(t("common.deleted"));
      } else {
        setOperationError(result.error.message);
      }
    },
    [uid, t]
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
          aria-label={t("home.openMenu")}
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-900">{t("appointments.title")}</h1>
        <div className="w-10" aria-hidden />
      </header>
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-auto">
        <p className="text-sm text-neutral-500">
          {t("appointments.subtitle")}
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
              {t("appointments.loading")}
            </span>
          </div>
        )}

        {!loading && error && <ErrorState message={error.message} t={t} />}

        {!loading && !error && appointments.length === 0 && <EmptyState t={t} />}

        {!loading && !error && sortedAppointments.length > 0 && (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {sortedAppointments.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentCard
                  appointment={appointment}
                  highlight={highlightId === appointment.id}
                  formatDate={formatDate}
                  t={t}
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
