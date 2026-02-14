/**
 * Gated diagnostic logging. Only logs when enabled via env.
 * Use for sign-in/auth events, debug traces, etc. Never logs in production unless explicitly enabled.
 */

const isEnabled =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_LOGGING === "true";

const LOG_PREFIX = "[HelloCare]";

/**
 * Logs a message and optional context when NEXT_PUBLIC_DEBUG_LOGGING=true.
 * No-op when disabled. Use for success/failure flows and other diagnostic output.
 */
export function debugLog(
  message: string,
  context?: Record<string, unknown>
): void {
  if (!isEnabled) return;
  if (context != null && Object.keys(context).length > 0) {
    console.log(LOG_PREFIX, message, context);
  } else {
    console.log(LOG_PREFIX, message);
  }
}

/** True when debug logging is enabled (e.g. to branch UI or other behavior). */
export const isDebugLoggingEnabled = isEnabled;
