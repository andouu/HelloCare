/**
 * Firebase Admin SDK initialisation (server-side only).
 *
 * Requires the FIREBASE_SERVICE_ACCOUNT_KEY env var to contain the
 * JSON-stringified service-account key downloaded from the Firebase console.
 *
 * On Vercel: Settings → Environment Variables → add FIREBASE_SERVICE_ACCOUNT_KEY
 * with the full JSON content of your service-account key file.
 */

import { initializeApp, cert, getApps, getApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _db: Firestore | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApp();
    return _app;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY env var is missing. " +
        "Set it to the JSON content of your Firebase service-account key."
    );
  }

  _app = initializeApp({ credential: cert(JSON.parse(raw)) });
  return _app;
}

/** Server-side Firestore instance (bypasses security rules). Lazily initialised. */
export function getAdminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db;
}
