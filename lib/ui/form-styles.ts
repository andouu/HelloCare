/**
 * Shared form input and label class names.
 * Single source of truth for form styling; change here to update all forms.
 */

export const formStyles = {
  input:
    "rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500",
  label: "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1",
  buttonPrimary:
    "rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
  buttonSecondary:
    "rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
  section:
    "mt-10 w-full max-w-md space-y-6 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30",
  error: "text-sm text-red-600 dark:text-red-400",
} as const;
