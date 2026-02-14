/**
 * Firestore API layer: pure read/write commands.
 * Schema: users/{uid} for metadata; users/{uid}/{subcollection}/{id} for entries.
 * All functions require userId so they work with auth and are testable.
 */

import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
  type DocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  COLLECTIONS,
  userDocRefSegments,
  userSubcollectionDocRefSegments,
  type UserSubcollectionKey,
} from "./collections";
import { toFirestoreValue } from "./serialize";
import type {
  ActionItem,
  HealthNote,
  SessionMetadata,
  UserMetadata,
  UserMetadataUpdatePayload,
} from "./types";
import type { FirestoreResult } from "./types";

function getUserDocRef(db: Firestore, uid: string) {
  return doc(db, ...userDocRefSegments(uid));
}

function snapshotToUserMetadata(snap: DocumentSnapshot): UserMetadata | null {
  const data = snap.data();
  if (!data) return null;
  // Doc must have createDate (we write it); accept Firestore Timestamp.
  const createDate = data.createDate;
  if (createDate == null) return null;
  return {
    id: snap.id,
    createDate: createDate as UserMetadata["createDate"],
    email: typeof data.email === "string" ? data.email : undefined,
    firstName: typeof data.firstName === "string" ? data.firstName : "",
    lastName: typeof data.lastName === "string" ? data.lastName : "",
    preferredLanguage: typeof data.preferredLanguage === "string" ? data.preferredLanguage : undefined,
    hospitalPhoneNumber: typeof data.hospitalPhoneNumber === "string" ? data.hospitalPhoneNumber : undefined,
  };
}

/**
 * Reads the user metadata document at users/{uid}. Returns null if missing or invalid.
 */
export async function readUserMetadata(
  db: Firestore,
  uid: string
): Promise<FirestoreResult<UserMetadata | null>> {
  try {
    const ref = getUserDocRef(db, uid);
    const snap = await getDoc(ref);
    const data = snapshotToUserMetadata(snap);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Writes the user metadata document at users/{uid}. Creates or overwrites.
 * createDate is set to now if not provided.
 */
export async function writeUserMetadata(
  db: Firestore,
  uid: string,
  payload: UserMetadataUpdatePayload
): Promise<FirestoreResult<UserMetadata>> {
  try {
    const ref = getUserDocRef(db, uid);
    const docData: UserMetadata = {
      id: uid,
      email: payload.email,
      firstName: payload.firstName ?? "",
      lastName: payload.lastName ?? "",
      preferredLanguage: payload.preferredLanguage ?? "en",
      hospitalPhoneNumber: payload.hospitalPhoneNumber ?? "",
      createDate: Timestamp.now(),
    };
    await setDoc(ref, docData);
    return { ok: true, data: docData };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Writes a document to a user subcollection. Path: users/{uid}/{subcollection}/{id}.
 * Serializes Date to Timestamp. Ensures userId is set on the document for rules.
 */
async function writeUserSubcollectionDoc<T extends { id: string; userId: string }>(
  db: Firestore,
  uid: string,
  subcollection: UserSubcollectionKey,
  data: T
): Promise<FirestoreResult<T>> {
  try {
    const ref = doc(db, ...userSubcollectionDocRefSegments(uid, subcollection, data.id));
    const serialized = toFirestoreValue({ ...data, userId: uid }) as Record<string, unknown>;
    await setDoc(ref, serialized);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function writeHealthNote(
  db: Firestore,
  uid: string,
  data: Omit<HealthNote, "userId"> & { userId?: string }
): Promise<FirestoreResult<HealthNote>> {
  const docData: HealthNote = { ...data, userId: uid };
  return writeUserSubcollectionDoc(db, uid, "healthNotes", docData);
}

export async function writeActionItem(
  db: Firestore,
  uid: string,
  data: Omit<ActionItem, "userId"> & { userId?: string }
): Promise<FirestoreResult<ActionItem>> {
  const docData: ActionItem = { ...data, userId: uid };
  return writeUserSubcollectionDoc(db, uid, "actionItems", docData);
}

export async function writeSessionMetadata(
  db: Firestore,
  uid: string,
  data: Omit<SessionMetadata, "userId"> & { userId?: string }
): Promise<FirestoreResult<SessionMetadata>> {
  const docData: SessionMetadata = {
    ...data,
    userId: uid,
    actionItems: data.actionItems ?? [],
    documentIds: data.documentIds ?? [],
  };
  return writeUserSubcollectionDoc(db, uid, "sessionMetadata", docData);
}
