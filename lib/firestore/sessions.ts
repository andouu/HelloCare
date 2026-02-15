/**
 * Helpers for session metadata (sorting, etc.).
 */

import type { SessionMetadata } from "./types";

/**
 * Sort sessions by date descending (most recent first).
 */
export function sortSessionsByDateDesc(
  sessions: SessionMetadata[]
): SessionMetadata[] {
  return [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
