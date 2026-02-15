"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useUserMetadata } from "@/lib/firestore";
import { formatLocalizedDate, formatLocalizedDateUTC, formatRelativeFromNow, getBrowserLanguageTag } from "@/lib/i18n/format";
import { resolveAppLocale, resolveLanguageTag, type AppLocale } from "@/lib/i18n/locales";
import { EN_MESSAGES, MESSAGES, type MessageKey } from "@/lib/i18n/messages";

type I18nVariables = Record<string, string | number>;

type I18nContextValue = {
  locale: AppLocale;
  languageTag: string;
  t: (key: MessageKey, vars?: I18nVariables) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateUTC: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelative: (value: Date | string | number, unit?: Intl.RelativeTimeFormatUnit) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, vars?: I18nVariables): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? `{${key}}` : String(value);
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: userMetadata } = useUserMetadata();
  const browserLanguage = getBrowserLanguageTag();
  const preferredLanguage = user ? userMetadata?.preferredLanguage ?? browserLanguage : browserLanguage;
  const languageTag = resolveLanguageTag(preferredLanguage);
  const locale = resolveAppLocale(languageTag);

  const t = useCallback((key: MessageKey, vars?: I18nVariables) => {
    const localeMessage = MESSAGES[locale]?.[key];
    const fallback = EN_MESSAGES[key];
    return interpolate(localeMessage ?? fallback ?? key, vars);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      languageTag,
      t,
      formatDate: (date, options) => formatLocalizedDate(date, languageTag, options),
      formatDateUTC: (date, options) => formatLocalizedDateUTC(date, languageTag, options),
      formatRelative: (date, unit = "day") => formatRelativeFromNow(date, languageTag, unit),
    }),
    [locale, languageTag, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
