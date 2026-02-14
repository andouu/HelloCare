/**
 * Converts app types (Date, nested objects) to Firestore-serializable values.
 * Reusable for any document write. Dates become Firestore Timestamp.
 */

import { Timestamp } from "firebase/firestore";

type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | Timestamp
  | FirestoreValue[]
  | { [key: string]: FirestoreValue };

/**
 * Recursively converts a value to a Firestore-serializable form.
 * - Date -> Timestamp
 * - Array -> array of converted elements
 * - Plain object -> object with converted values (keys unchanged)
 * - Primitives and null -> unchanged
 */
export function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (Array.isArray(value)) {
    return value.map(toFirestoreValue);
  }
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    const out: { [key: string]: FirestoreValue } = {};
    for (const key of Object.keys(obj)) {
      out[key] = toFirestoreValue(obj[key]);
    }
    return out;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}
