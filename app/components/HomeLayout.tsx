"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const linkButtonClass =
  "rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

/**
 * Shared layout for home: header with auth status + main content area.
 * Children are the main body (profile form, add-entry section, or empty state).
 */
export function HomeLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="absolute right-4 top-4 flex items-center gap-3">
        {user ? (
          <>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </span>
            <button type="button" onClick={() => signOut()} className={linkButtonClass}>
              Sign out
            </button>
          </>
        ) : (
          <Link href="/sign-in" className={linkButtonClass}>
            Sign in
          </Link>
        )}
      </header>

      <main className="flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-24 sm:items-start">
        {children}
      </main>
    </div>
  );
}
