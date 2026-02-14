"use client";

import {
  type User,
  onAuthStateChanged,
  getRedirectResult,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  type UserCredential,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth } from "./firebase";
import { debugLog } from "./logger";

type AuthState = {
  user: User | null;
  loading: boolean;
  redirectLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Firebase consumes the redirect result on first call; a second call returns null.
 * React Strict Mode (and similar) can double-invoke effects, so we cache the promise
 * and only call getRedirectResult(auth) once per page load.
 */
let redirectResultPromise: Promise<UserCredential | null> | null = null;

function getRedirectResultOnce(): Promise<UserCredential | null> {
  if (redirectResultPromise === null) {
    redirectResultPromise = getRedirectResult(auth);
  }
  return redirectResultPromise;
}

function useRedirectResult() {
  const [redirectLoading, setRedirectLoading] = useState(true);

  useEffect(() => {
    getRedirectResultOnce()
      .then((cred: UserCredential | null) => {
        if (cred) {
          debugLog("Sign-in success", {
            uid: cred.user.uid,
            email: cred.user.email ?? null,
          });
        }
      })
      .catch((err) => {
        debugLog("Sign-in failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        setRedirectLoading(false);
      });
  }, []);

  return redirectLoading;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const redirectLoading = useRedirectResult();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // Only clear loading after first auth state so Firestore never runs before
      // the SDK has the auth token (avoids "Missing or insufficient permissions").
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      debugLog("Sign-in success", {
        uid: cred.user.uid,
        email: cred.user.email ?? null,
      });
    } catch (err) {
      debugLog("Sign-in failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }, []);

  const signInWithMicrosoft = useCallback(async () => {
    const provider = new OAuthProvider("microsoft.com");
    try {
      const cred = await signInWithPopup(auth, provider);
      debugLog("Sign-in success", {
        uid: cred.user.uid,
        email: cred.user.email ?? null,
      });
    } catch (err) {
      debugLog("Sign-in failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      redirectLoading,
      signInWithGoogle,
      signInWithMicrosoft,
      signOut,
    }),
    [user, loading, redirectLoading, signInWithGoogle, signInWithMicrosoft, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
