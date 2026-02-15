"use client";

import { useUserMetadata, useUserData } from "@/lib/firestore";
import type { HealthNote, ActionItem, SessionMetadata } from "@/lib/firestore";

/** Debug-only display of a subcollection as a simple list. */
function DebugSubcollectionList<T extends { id: string }>({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => string;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {title} ({items.length})
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">None</p>
      ) : (
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-zinc-700 dark:text-zinc-300">
          {items.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtDate(d: Date): string {
  return d instanceof Date && !isNaN(d.getTime())
    ? d.toLocaleDateString()
    : String(d);
}

function SubcollectionData({
  healthNotes,
  actionItems,
  sessionMetadata,
  loading,
  error,
}: {
  healthNotes: HealthNote[];
  actionItems: ActionItem[];
  sessionMetadata: SessionMetadata[];
  loading: boolean;
  error: Error | null;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Subcollection data (real-time)
      </h3>
      {loading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error.message}</p>
      )}
      {!loading && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <DebugSubcollectionList
            title="Health notes"
            items={healthNotes}
            renderItem={(n) => `${n.title} — ${n.type} — ${fmtDate(n.date)}`}
          />
          <DebugSubcollectionList
            title="Action items"
            items={actionItems}
            renderItem={(a) =>
              `${a.title} — ${a.status} — due ${fmtDate(a.dueBy)}`
            }
          />
          <DebugSubcollectionList
            title="Sessions"
            items={sessionMetadata}
            renderItem={(s) =>
              `${s.title} — ${fmtDate(s.date)} — ${s.summary.slice(0, 60)}${s.summary.length > 60 ? "…" : ""}`
            }
          />
        </div>
      )}
    </div>
  );
}

/**
 * Debug panel showing the user's profile document and real-time subcollection data.
 * Gated by the caller (render only when isDebugLoggingEnabled).
 */
export function DebugDataPanel() {
  const { data: userMetadata } = useUserMetadata();
  const { healthNotes, actionItems, sessionMetadata, loading, error } =
    useUserData();

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Debug data
      </h2>

      {userMetadata && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Your profile (users/{"{uid}"})
          </h3>
          <pre className="overflow-auto rounded-lg border border-zinc-200 bg-white p-4 text-left text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {JSON.stringify(userMetadata, null, 2)}
          </pre>
        </div>
      )}

      <SubcollectionData
        healthNotes={healthNotes}
        actionItems={actionItems}
        sessionMetadata={sessionMetadata}
        loading={loading}
        error={error}
      />
    </section>
  );
}
