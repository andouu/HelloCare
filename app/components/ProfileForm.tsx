"use client";

import { useState, useCallback, useEffect } from "react";
import { formStyles } from "@/lib/ui/form-styles";
import type { UserMetadataUpdatePayload } from "@/lib/firestore";
import type { FirestoreResult } from "@/lib/firestore";
import type { UserMetadata } from "@/lib/firestore";

export type ProfileFormProps = {
  saveProfile: (payload: UserMetadataUpdatePayload) => Promise<FirestoreResult<UserMetadata>>;
  initialEmail: string;
  error: Error | null;
};

const PREFERRED_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
] as const;

/**
 * Shown when user is signed in but users/{uid} has no data. Submitting writes the doc.
 */
export function ProfileForm({ saveProfile, initialEmail, error: metaError }: ProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: initialEmail,
    preferredLanguage: "en",
    hospitalPhoneNumber: "",
  });

  useEffect(() => {
    if (initialEmail && !values.email) {
      setValues((v) => ({ ...v, email: initialEmail }));
    }
  }, [initialEmail, values.email]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setSaving(true);
      const result = await saveProfile({
        firstName: values.firstName.trim() || undefined,
        lastName: values.lastName.trim() || undefined,
        email: values.email.trim() || undefined,
        preferredLanguage: values.preferredLanguage || "en",
        hospitalPhoneNumber: values.hospitalPhoneNumber.trim() || undefined,
      });
      setSaving(false);
      if (result.ok) return;
      setSubmitError(result.error ?? new Error("Failed to save profile"));
    },
    [saveProfile, values]
  );

  const errorMessage = submitError?.message ?? metaError?.message;

  return (
    <section className={`${formStyles.section}`}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Complete your profile
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        We need a few details to set up your account. This creates your user document in Firestore.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className={formStyles.label}>First name</span>
          <input
            type="text"
            value={values.firstName}
            onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
            className={`${formStyles.input} w-full`}
            placeholder="First name"
            required
            autoComplete="given-name"
          />
        </label>
        <label className="block">
          <span className={formStyles.label}>Last name</span>
          <input
            type="text"
            value={values.lastName}
            onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
            className={`${formStyles.input} w-full`}
            placeholder="Last name"
            required
            autoComplete="family-name"
          />
        </label>
        <label className="block">
          <span className={formStyles.label}>Email</span>
          <input
            type="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            className={`${formStyles.input} w-full`}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className={formStyles.label}>Preferred language</span>
          <select
            value={values.preferredLanguage}
            onChange={(e) => setValues((v) => ({ ...v, preferredLanguage: e.target.value }))}
            className={`${formStyles.input} w-full`}
            aria-label="Preferred language"
          >
            {PREFERRED_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={formStyles.label}>Hospital phone number</span>
          <input
            type="tel"
            value={values.hospitalPhoneNumber}
            onChange={(e) => setValues((v) => ({ ...v, hospitalPhoneNumber: e.target.value }))}
            className={`${formStyles.input} w-full`}
            placeholder="Optional"
            autoComplete="tel"
          />
        </label>
        {errorMessage && (
          <p className={formStyles.error} role="alert">
            {errorMessage}
          </p>
        )}
        <button type="submit" disabled={saving} className={formStyles.buttonPrimary}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}
