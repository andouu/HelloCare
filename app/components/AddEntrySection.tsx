"use client";

import { useState, useCallback } from "react";
import { formStyles } from "@/lib/ui/form-styles";
import {
  useUserMetadata,
  useSaveEntry,
  ENTRY_FORM_CONFIGS,
  ENTRY_TYPES,
  getDefaultValues,
  formValuesToEntryPayload,
} from "@/lib/firestore";
import type { EntryType } from "@/lib/firestore";
import { isDebugLoggingEnabled } from "@/lib/logger";

function EntryForm({
  entryType,
  onSuccess,
}: {
  entryType: EntryType;
  onSuccess?: () => void;
}) {
  const config = ENTRY_FORM_CONFIGS[entryType];
  const { save, writing, writeError, isAuthenticated } = useSaveEntry();
  const [values, setValues] = useState<Record<string, string>>(() =>
    getDefaultValues(entryType)
  );

  const setField = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const payload = formValuesToEntryPayload(entryType, values);
      save(entryType, payload).then(() => {
        onSuccess?.();
        setValues(getDefaultValues(entryType));
      });
    },
    [entryType, values, save, onSuccess]
  );

  if (!isAuthenticated) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {config.fields.map((field) => (
        <label key={field.name} className="block">
          <span className={formStyles.label}>{field.label}</span>
          {field.type === "textarea" ? (
            <textarea
              name={field.name}
              value={values[field.name] ?? ""}
              onChange={(e) => setField(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={3}
              className={`${formStyles.input} w-full resize-y`}
              aria-required={field.required}
            />
          ) : field.type === "select" ? (
            <select
              name={field.name}
              value={values[field.name] ?? ""}
              onChange={(e) => setField(field.name, e.target.value)}
              required={field.required}
              className={`${formStyles.input} w-full`}
              aria-required={field.required}
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              name={field.name}
              value={values[field.name] ?? ""}
              onChange={(e) => setField(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className={`${formStyles.input} w-full`}
              aria-required={field.required}
            />
          )}
        </label>
      ))}
      {writeError && (
        <p className={formStyles.error} role="alert">
          Write error: {writeError.message}
        </p>
      )}
      <button type="submit" disabled={writing} className={formStyles.buttonPrimary}>
        {writing ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

/**
 * Add-entry section: type selector + dynamic form + profile metadata display.
 * Shown when user has completed profile (users/{uid} exists).
 */
export function AddEntrySection() {
  const { data: userMetadata, loading, error, refetch, isAuthenticated } = useUserMetadata();
  const [selectedType, setSelectedType] = useState<EntryType>("healthNotes");

  if (!isAuthenticated) return null;

  return (
    <section className={formStyles.section}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Add entry
      </h2>

      <div>
        <span className={formStyles.label}>Entry type</span>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as EntryType)}
          className={`${formStyles.input} w-full`}
          aria-label="Select entry type"
        >
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ENTRY_FORM_CONFIGS[t].label}
            </option>
          ))}
        </select>
        {ENTRY_FORM_CONFIGS[selectedType].description && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {ENTRY_FORM_CONFIGS[selectedType].description}
          </p>
        )}
      </div>

      <EntryForm entryType={selectedType} />

      {error && (
        <p className={formStyles.error} role="alert">
          Read error: {error.message}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => refetch()}
          disabled={loading}
          className={formStyles.buttonSecondary}
        >
          {loading ? "Loading…" : "Refresh metadata"}
        </button>
      </div>

      {isDebugLoggingEnabled && userMetadata && ( // ezier to debug
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Your profile (users/{"{uid}"})
          </h3>
          <pre className="overflow-auto rounded-lg border border-zinc-200 bg-white p-4 text-left text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {JSON.stringify(userMetadata, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
