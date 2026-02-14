/**
 * Central definition of Firestore collection names and paths.
 * Security rules in firestore.rules must match these names/paths.
 * Deploy rules: firebase deploy --only firestore:rules
 * All names are lowerCamelCase.
 */
export const COLLECTIONS = {
  /** User-private data: users/{uid}/... */
  users: "users",
  /** Health notes: healthNotes/{id}, field userId for rules */
  healthNotes: "healthNotes",
  /** Action items: actionItems/{id}, field userId for rules */
  actionItems: "actionItems",
  /** Session metadata: sessionMetadata/{id}, field userId for rules */
  sessionMetadata: "sessionMetadata",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

/** Path segments for user subcollections or docs under users/{uid}. */
export const USER_PATHS = {
  userData: "data/userData",
} as const;

/**
 * Builds the full path for a user-scoped document.
 * Example: userDocPath(uid, USER_PATHS.userData) => "users/{uid}/data/userData"
 */
export function userDocPath(uid: string, relativePath: string): string {
  return `${COLLECTIONS.users}/${uid}/${relativePath}`;
}

/**
 * Returns path segments for doc(db, ...segments).
 * Example: userDocPathSegments(uid, "data/userData") => ["users", uid, "data", "userData"]
 */
export function userDocPathSegments(uid: string, relativePath: string): [string, string, ...string[]] {
  const parts = relativePath.split("/").filter(Boolean);
  return [COLLECTIONS.users, uid, ...parts];
}

