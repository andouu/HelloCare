export type LanguageOption = {
  code: string;
  label: string;
  native: string;
};

export const LANGUAGE_OPTIONS: ReadonlyArray<LanguageOption> = [
  { code: "en-US", label: "US English", native: "English" },
  { code: "en-GB", label: "UK English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "zh-cmn", label: "Mandarin Chinese", native: "普通话" },
  { code: "zh-yue", label: "Cantonese Chinese", native: "廣東話" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "tl", label: "Tagalog", native: "Tagalog" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "it", label: "Italian", native: "Italiano" },
] as const;

export const DEFAULT_LANGUAGE_TAG = "en-US";
export const SUPPORTED_UI_LOCALES = ["en-US", "es", "zh"] as const;

export type AppLocale = (typeof SUPPORTED_UI_LOCALES)[number];

const LANGUAGE_CODE_SET = new Set(LANGUAGE_OPTIONS.map((opt) => opt.code.toLowerCase()));

function canonicalizeLanguageTag(value: string): string | null {
  try {
    const [canonical] = Intl.getCanonicalLocales(value);
    return canonical ?? null;
  } catch {
    return null;
  }
}

function normalizeRawLanguageTag(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LANGUAGE_TAG;

  const lowered = trimmed.toLowerCase();

  if (LANGUAGE_CODE_SET.has(lowered)) {
    return LANGUAGE_OPTIONS.find((opt) => opt.code.toLowerCase() === lowered)?.code ?? trimmed;
  }

  if (lowered === "en") return "en-US";
  if (lowered.startsWith("en-")) {
    return canonicalizeLanguageTag(trimmed) ?? "en-US";
  }
  if (lowered === "es" || lowered.startsWith("es-")) return "es";

  return canonicalizeLanguageTag(trimmed) ?? DEFAULT_LANGUAGE_TAG;
}

export function resolveLanguageTag(value?: string | null): string {
  if (!value) return DEFAULT_LANGUAGE_TAG;
  return normalizeRawLanguageTag(value);
}

export function resolveAppLocale(value?: string | null): AppLocale {
  const normalized = resolveLanguageTag(value).toLowerCase();
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  if (
    normalized === "zh" ||
    normalized.startsWith("zh-") ||
    normalized === "cmn" ||
    normalized === "zh-cmn"
  ) {
    return "zh";
  }
  return "en-US";
}
