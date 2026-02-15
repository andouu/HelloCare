/**
 * Firestore document types and API result types.
 * All field names are lowerCamelCase. Enum-like fields use string for now.
 */

import { Timestamp } from "firebase/firestore";
import type { UserSubcollectionKey } from "./collections";

/** Generic Firestore API result for single-doc read/write. */
export type FirestoreResult<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

/** User metadata document at users/{uid}. Fetched on sign-in. */
export type UserMetadata = {
  id: string;
  createDate: Timestamp;
  firstName: string;
  lastName: string;
  email?: string;
  preferredLanguage?: string;
  hospitalPhoneNumber?: string;
};

/** Payload for creating/updating user profile (users/{uid}). Used by profile form and API. */
export type UserMetadataUpdatePayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  preferredLanguage?: string;
  hospitalPhoneNumber?: string;
};

/** Discriminated entry type for user subcollections. */
export type EntryType = UserSubcollectionKey;

/** Create payload for health notes (id and userId are set by caller/API). */
export type HealthNoteCreate = Omit<HealthNote, "userId">;

/** Create payload for action items. */
export type ActionItemCreate = Omit<ActionItem, "userId">;

/** JSON-serialised action item (e.g. from API responses). Dates become ISO strings. */
export type ActionItemSerialized = Omit<ActionItemCreate, "dueBy"> & {
  dueBy: string | null;
};

/** Create payload for session metadata (id can be generated; actionItemIds/documentIds can default to []). */
export type SessionMetadataCreate = Omit<SessionMetadata, "userId" | "id"> & {
  id?: string;
  actionItemIds?: string[];
  documentIds?: string[];
};

/** Health note document. type: e.g. "Injury" | "Recurring pain" | "Temporary pain". */
export type HealthNote = {
  id: string;
  userId: string;
  date: Date;
  startedAt: Date;
  endedAt: Date;
  type: string;
  title: string;
  description: string;
};

/** Nested metadata for medication action items. */
export type MedicationMetadata = {
  name: string;
  dose: number;
  dosageUnit: string;
  count: number;
  route: string;
};

/** Action item document. type, status, priority, recurrence are strings. */
export type ActionItem = {
  id: string;
  userId: string;
  dueBy: Date;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  recurrence: string;
  medication?: MedicationMetadata;
};


/** Session document. actionItemIds: references to action item docs (mutable by user). documentIds: optional list of stored document references. */
export type SessionMetadata = {
  id: string;
  userId: string;
  date: Date;
  title: string;
  summary: string;
  actionItemIds: string[];
  documentIds: string[];
};

/** Appointment document at users/{userId}/appointments/{id}. */
export type Appointment = {
  id: string;
  userId: string;
  appointmentTime: Date;
  scheduledOn: Date;
};

/** Create payload for appointments (id can be generated; userId set by API). */
export type AppointmentCreate = Omit<Appointment, "userId"> & { userId?: string };
