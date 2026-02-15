import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// During Next.js static generation the NEXT_PUBLIC_* env vars may be absent.
// Guard initialization so the build doesn't crash; the real values are
// available at runtime (client-side hydration & server requests).
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // Stubs that will never be reached at runtime (env vars are always set).
  app = null as unknown as FirebaseApp;
  auth = null as unknown as Auth;
  db = null as unknown as Firestore;
}

function getAnalyticsWhenSupported() {
  if (typeof window === "undefined" || !app) return null;
  return isSupported().then((yes) => (yes ? getAnalytics(app) : null));
}

export { app, auth, db, getAnalyticsWhenSupported };
