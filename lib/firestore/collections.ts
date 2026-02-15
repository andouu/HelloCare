/**
 * Central definition of Firestore collection names and paths.
 * Use these constants so security rules and client code stay in sync.
 * All names are lowerCamelCase.
 *
 * Schema:
 * - users/{uid}                    — user metadata document
 * - users/{uid}/healthNotes/{id}   — health notes subcollection
 * - users/{uid}/actionItems/{id}   — action items subcollection
 * - users/{uid}/sessionMetadata/{id} — session metadata subcollection
 * - users/{uid}/appointments/{id}   — appointments subcollection
 */
export const COLLECTIONS = {
  /** Top-level users collection: users/{uid} and subcollections under it */
  users: "users",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

/** Subcollection names under users/{uid}. */
export const USER_PATHS = {
  /** Health notes: users/{userId}/healthNotes/{id} */
  healthNotes: "healthNotes",
  /** Action items: users/{userId}/actionItems/{id} */
  actionItems: "actionItems",
  /** Session metadata: users/{userId}/sessionMetadata/{id} */
  sessionMetadata: "sessionMetadata",
  /** Appointments: users/{userId}/appointments/{id} */
  appointments: "appointments",
  /** Documents: users/{userId}/documents/{id} */
  documents: "documents",
} as const;

export type UserSubcollectionKey = keyof typeof USER_PATHS;

/** Path segments for the user document ref: doc(db, ...) => users/{uid} */
export function userDocRefSegments(uid: string): [string, string] {
  return [COLLECTIONS.users, uid];
}

/**
 * Path segments for a document in a user subcollection.
 * Example: doc(db, ...userSubcollectionDocRefSegments(uid, "healthNotes", id))
 */
export function userSubcollectionDocRefSegments(
  uid: string,
  subcollection: UserSubcollectionKey,
  docId: string
): [string, string, string, string] {
  return [COLLECTIONS.users, uid, USER_PATHS[subcollection], docId];
}

/**
 * Path segments for a relative path under users/{uid}.
 * Example: userDocPathSegments(uid, "healthNotes/abc") => ["users", uid, "healthNotes", "abc"]
 */
export function userDocPathSegments(uid: string, relativePath: string): [string, string, ...string[]] {
  const parts = relativePath.split("/").filter(Boolean);
  return [COLLECTIONS.users, uid, ...parts];
}

