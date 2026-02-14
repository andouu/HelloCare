"use client";

import { useAuth } from "@/lib/auth-context";
import { debugLog } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SignInClient() {
  const {
    user,
    loading,
    redirectLoading,
    signInWithGoogle,
    signInWithMicrosoft,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || redirectLoading) return;
    if (user) {
      debugLog("Redirecting to home after sign-in", { uid: user.uid });
      router.replace("/");
    }
  }, [user, loading, redirectLoading, router]);

  const isBusy = loading || redirectLoading;

  if (isBusy) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--foreground)] border-t-transparent" aria-hidden />
        <p className="text-sm text-zinc-500">Signing you in…</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            HelloCare
          </h1>
          <p className="mt-2 text-[15px] text-zinc-500">
            Sign in to continue
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="flex min-h-[48px] items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] font-medium text-zinc-900 shadow-sm transition-colors active:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:active:bg-zinc-700"
            aria-label="Sign in with Google"
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => signInWithMicrosoft()}
            className="flex min-h-[48px] items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] font-medium text-zinc-900 shadow-sm transition-colors active:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:active:bg-zinc-700"
            aria-label="Sign in with Microsoft"
          >
            <MicrosoftIcon className="h-5 w-5 shrink-0" />
            Continue with Microsoft
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </main>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 23 23" aria-hidden>
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}
