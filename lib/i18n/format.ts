import { DEFAULT_LANGUAGE_TAG, resolveLanguageTag } from "./locales";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

export function formatLocalizedDate(
  value: DateInput,
  languageTag?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(resolveLanguageTag(languageTag), options).format(date);
}

export function formatLocalizedDateUTC(
  value: DateInput,
  languageTag?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return formatLocalizedDate(value, languageTag, {
    ...options,
    timeZone: options?.timeZone ?? "UTC",
  });
}

export function formatRelativeFromNow(
  targetDate: DateInput,
  languageTag?: string,
  unit: Intl.RelativeTimeFormatUnit = "day",
): string {
  const date = toDate(targetDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const target = date.getTime();
  const diffMs = target - now;

  let divisor = 24 * 60 * 60 * 1000;
  if (unit === "hour") divisor = 60 * 60 * 1000;
  if (unit === "minute") divisor = 60 * 1000;
  if (unit === "second") divisor = 1000;

  const value = Math.round(diffMs / divisor);
  return new Intl.RelativeTimeFormat(resolveLanguageTag(languageTag), {
    numeric: "auto",
  }).format(value, unit);
}

export function getBrowserLanguageTag(): string {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE_TAG;
  return navigator.language || DEFAULT_LANGUAGE_TAG;
}
