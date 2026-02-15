/**
 * Firestore module: types, paths, API, hooks, and form config.
 * Import from "@/lib/firestore" or from specific files for tree-shaking.
 */

export {
  COLLECTIONS,
  USER_PATHS,
  userDocRefSegments,
  userDocPathSegments,
  userSubcollectionDocRefSegments,
} from "./collections";
export type { CollectionKey, UserSubcollectionKey } from "./collections";
export type {
  ActionItem,
  ActionItemCreate,
  EntryType,
  FirestoreResult,
  HealthNote,
  HealthNoteCreate,
  MedicationMetadata,
  SessionMetadata,
  SessionMetadataCreate,
  UserMetadata,
  UserMetadataUpdatePayload,
} from "./types";
export { toFirestoreValue } from "./serialize";
export {
  readUserMetadata,
  writeActionItem,
  writeHealthNote,
  writeSessionMetadata,
  writeUserMetadata,
} from "./api";
export { useUserMetadata, useSaveEntry, useUserData, useActionItems, useHealthNotes } from "./hooks";
export {
  ENTRY_FORM_CONFIGS,
  ENTRY_TYPES,
  formValuesToEntryPayload,
  getDefaultValues,
} from "./entryFormConfig";
export type { EntryFormConfig, FieldConfig, FieldType } from "./entryFormConfig";
