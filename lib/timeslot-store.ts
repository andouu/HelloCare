/**
 * Timeslot coordination store – backed by Firestore (via Admin SDK)
 * so that all Vercel serverless functions share the same state.
 *
 * Firestore document: _scheduling/current
 * Fields:
 *   timeslots       – Timeslot[]
 *   confirmedLabel  – string | null
 *   updatedAt       – Timestamp
 */

import { getAdminDb } from "./firebase-admin";

export type Timeslot = { label: string; available: boolean };

const SCHEDULING_DOC = "_scheduling/current";

function docRef() {
  return getAdminDb().doc(SCHEDULING_DOC);
}

/* ------------------------------------------------------------------ */
/*  Write helpers (called from API routes)                            */
/* ------------------------------------------------------------------ */

/** Store proposed timeslots and reset any previous confirmation. */
export async function setTimeslots(slots: Timeslot[]): Promise<void> {
  console.log(
    `[timeslot-store] setTimeslots: ${slots.length} slot(s)`,
    JSON.stringify(slots)
  );
  await docRef().set(
    { timeslots: slots, confirmedLabel: null, updatedAt: new Date() },
    { merge: false }
  );
  console.log("[timeslot-store] Firestore document written ✅");
}

/** Read current timeslots from Firestore. */
export async function getTimeslots(): Promise<Timeslot[]> {
  const snap = await docRef().get();
  const data = snap.data();
  const slots = (data?.timeslots ?? []) as Timeslot[];
  console.log(`[timeslot-store] getTimeslots: ${slots.length} slot(s)`);
  return slots;
}

/* ------------------------------------------------------------------ */
/*  Confirmation flow                                                 */
/* ------------------------------------------------------------------ */

/**
 * Blocks until the user confirms a timeslot (or timeout).
 * Uses Firestore onSnapshot so it works across serverless invocations.
 */
export function waitForConfirmation(timeoutMs: number): Promise<string> {
  console.log(
    `[timeslot-store] waitForConfirmation started (timeout: ${timeoutMs}ms)`
  );

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      console.error("[timeslot-store] ⏰ waitForConfirmation timed out");
      reject(new Error("Confirmation timed out"));
    }, timeoutMs);

    const unsubscribe = docRef().onSnapshot(
      (snap) => {
        if (settled) return;
        const data = snap.data();
        const confirmed = data?.confirmedLabel;
        if (confirmed) {
          settled = true;
          clearTimeout(timer);
          unsubscribe();
          console.log(
            `[timeslot-store] ✅ Confirmation received: "${confirmed}"`
          );
          resolve(confirmed);
        }
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        console.error("[timeslot-store] onSnapshot error:", err);
        reject(err);
      }
    );
  });
}

/**
 * Mark a timeslot as confirmed (called from confirmTimeslot API route).
 */
export async function confirmTimeslot(label: string): Promise<void> {
  console.log(`[timeslot-store] confirmTimeslot: "${label}"`);
  await docRef().update({ confirmedLabel: label });
  console.log("[timeslot-store] confirmedLabel written ✅");
}
