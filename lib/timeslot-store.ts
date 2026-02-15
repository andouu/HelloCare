import { EventEmitter } from "events";

export type Timeslot = { label: string; available: boolean };

const g = globalThis as unknown as {
  __tsEmitter?: EventEmitter;
  __tsData?: Timeslot[];
  __tsConfirmResolve?: ((label: string) => void) | null;
};
if (!g.__tsEmitter) g.__tsEmitter = new EventEmitter();
if (!g.__tsData) g.__tsData = [];

export const emitter = g.__tsEmitter;

export function setTimeslots(slots: Timeslot[]) {
  g.__tsData = slots;
  emitter.emit("update", slots);
}

export function getTimeslots(): Timeslot[] {
  return g.__tsData ?? [];
}

/**
 * Returns a promise that resolves with the confirmed slot label
 * once `confirmTimeslot` is called, or rejects if `timeoutMs` elapses first.
 */
export function waitForConfirmation(timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      g.__tsConfirmResolve = null;
      reject(new Error("Confirmation timed out"));
    }, timeoutMs);

    g.__tsConfirmResolve = (label: string) => {
      clearTimeout(timer);
      resolve(label);
    };
  });
}

/**
 * Called by the frontend (via API) to confirm the selected timeslot.
 * Resolves the pending `waitForConfirmation` promise.
 */
export function confirmTimeslot(label: string) {
  if (g.__tsConfirmResolve) {
    g.__tsConfirmResolve(label);
    g.__tsConfirmResolve = null;
  }
}
