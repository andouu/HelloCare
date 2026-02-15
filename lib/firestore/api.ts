/**
 * Firestore API layer: pure read/write commands.
 * Schema: users/{uid} for metadata; users/{uid}/{subcollection}/{id} for entries.
 * All functions require userId so they work with auth and are testable.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Firestore,
  type DocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  COLLECTIONS,
  USER_PATHS,
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

/** Converts Firestore Timestamp or Date to Date for app types. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return new Date(0);
}

/**
 * Reads all documents from a user subcollection. Path: users/{uid}/{subcollection}.
 * Each snapshot is converted with the provided mapper; nulls are filtered out.
 */
async function readUserSubcollectionDocs<T>(
  db: Firestore,
  uid: string,
  subcollection: UserSubcollectionKey,
  snapshotToItem: (snap: DocumentSnapshot) => T | null
): Promise<FirestoreResult<T[]>> {
  try {
    const colRef = collection(db, COLLECTIONS.users, uid, USER_PATHS[subcollection]);
    const snapshot = await getDocs(colRef);
    const data = snapshot.docs
      .map((d) => snapshotToItem(d))
      .filter((item): item is T => item != null);
    return { ok: true, data };
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

function snapshotToHealthNote(snap: DocumentSnapshot): HealthNote | null {
  const data = snap.data();
  if (!data || typeof data.userId !== "string") return null;
  return {
    id: snap.id,
    userId: data.userId,
    date: toDate(data.date),
    startedAt: toDate(data.startedAt),
    endedAt: toDate(data.endedAt),
    type: typeof data.type === "string" ? data.type : "",
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
  };
}

function snapshotToActionItem(snap: DocumentSnapshot): ActionItem | null {
  const data = snap.data();
  if (!data || typeof data.userId !== "string") return null;
  const med = data.medication;
  const medication =
    med &&
    typeof med === "object" &&
    typeof med.name === "string" &&
    typeof med.dose === "number" &&
    typeof med.dosageUnit === "string" &&
    typeof med.count === "number" &&
    typeof med.route === "string"
      ? {
          name: med.name,
          dose: med.dose,
          dosageUnit: med.dosageUnit,
          count: med.count,
          route: med.route,
        }
      : undefined;
  return {
    id: snap.id,
    userId: data.userId,
    dueBy: toDate(data.dueBy),
    type: typeof data.type === "string" ? data.type : "",
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    status: typeof data.status === "string" ? data.status : "",
    priority: typeof data.priority === "string" ? data.priority : "",
    recurrence: typeof data.recurrence === "string" ? data.recurrence : "",
    medication,
  };
}

function snapshotToSessionMetadata(snap: DocumentSnapshot): SessionMetadata | null {
  const data = snap.data();
  if (!data || typeof data.userId !== "string") return null;
  const rawItems = Array.isArray(data.actionItems) ? data.actionItems : [];
  const actionItems = rawItems
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const med = o.medication;
      const medication =
        med &&
        typeof med === "object" &&
        "name" in med &&
        "dose" in med &&
        "dosageUnit" in med &&
        "count" in med &&
        "route" in med
          ? {
              name: String((med as Record<string, unknown>).name),
              dose: Number((med as Record<string, unknown>).dose),
              dosageUnit: String((med as Record<string, unknown>).dosageUnit),
              count: Number((med as Record<string, unknown>).count),
              route: String((med as Record<string, unknown>).route),
            }
          : undefined;
      return {
        id: typeof o.id === "string" ? o.id : "",
        userId: typeof o.userId === "string" ? o.userId : "",
        dueBy: toDate(o.dueBy),
        type: typeof o.type === "string" ? o.type : "",
        title: typeof o.title === "string" ? o.title : "",
        description: typeof o.description === "string" ? o.description : "",
        status: typeof o.status === "string" ? o.status : "",
        priority: typeof o.priority === "string" ? o.priority : "",
        recurrence: typeof o.recurrence === "string" ? o.recurrence : "",
        medication,
      } as ActionItem;
    })
    .filter((item): item is ActionItem => item != null);
  const documentIds = Array.isArray(data.documentIds)
    ? (data.documentIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];
  return {
    id: snap.id,
    userId: data.userId,
    date: toDate(data.date),
    title: typeof data.title === "string" ? data.title : "",
    summary: typeof data.summary === "string" ? data.summary : "",
    actionItems,
    documentIds,
  };
}


/**
 * Subscribes to a user subcollection with onSnapshot. Calls onData with parsed items
 * on every update. Optionally call onError. Returns an unsubscribe function.
 */
function subscribeUserSubcollection<T>(
  db: Firestore,
  uid: string,
  subcollection: UserSubcollectionKey,
  snapshotToItem: (snap: DocumentSnapshot) => T | null,
  onData: (data: T[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.users, uid, USER_PATHS[subcollection]);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const data = snapshot.docs
        .map((d) => snapshotToItem(d))
        .filter((item): item is T => item != null);
      onData(data);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

/**
 * Real-time subscription to health notes for the given user.
 * Returns an unsubscribe function.
 */
export function subscribeHealthNotes(
  db: Firestore,
  uid: string,
  onData: (data: HealthNote[]) => void,
  onError?: (error: Error) => void
): () => void {
  return subscribeUserSubcollection(db, uid, "healthNotes", snapshotToHealthNote, onData, onError);
}

/**
 * Real-time subscription to action items for the given user.
 * Returns an unsubscribe function.
 */
export function subscribeActionItems(
  db: Firestore,
  uid: string,
  onData: (data: ActionItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  return subscribeUserSubcollection(db, uid, "actionItems", snapshotToActionItem, onData, onError);
}

/**
 * Real-time subscription to session metadata for the given user.
 * Returns an unsubscribe function.
 */
export function subscribeSessionMetadata(
  db: Firestore,
  uid: string,
  onData: (data: SessionMetadata[]) => void,
  onError?: (error: Error) => void
): () => void {
  return subscribeUserSubcollection(db, uid, "sessionMetadata", snapshotToSessionMetadata, onData, onError);
}


// These are not really necessary for now i htink, but leaving this for now (dont use these unless you want to just read once)
/**
 * Reads all health notes for the given user from users/{uid}/healthNotes.
 */
export async function readHealthNotes(
  db: Firestore,
  uid: string
): Promise<FirestoreResult<HealthNote[]>> {
  return readUserSubcollectionDocs(db, uid, "healthNotes", snapshotToHealthNote);
}

/**
 * Reads all action items for the given user from users/{uid}/actionItems.
 */
export async function readActionItems(
  db: Firestore,
  uid: string
): Promise<FirestoreResult<ActionItem[]>> {
  return readUserSubcollectionDocs(db, uid, "actionItems", snapshotToActionItem);
}

/**
 * Reads all session metadata for the given user from users/{uid}/sessionMetadata.
 */
export async function readSessionMetadata(
  db: Firestore,
  uid: string
): Promise<FirestoreResult<SessionMetadata[]>> {
  return readUserSubcollectionDocs(db, uid, "sessionMetadata", snapshotToSessionMetadata);
}
