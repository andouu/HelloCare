"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useUserMetadata } from "@/lib/firestore";
import { ProfileForm, AddEntrySection, DebugDataPanel, HomeLayout, HomeHero } from "@/app/components";
import { isDebugLoggingEnabled } from "@/lib/logger";

function ProfileLoadingSpinner() {
  return (
    <div className="mt-10 flex justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
        aria-hidden
      />
    </div>
  );
}

function getSubtitle(
  hasUser: boolean,
  profileLoading: boolean,
  hasProfile: boolean
): string {
  if (!hasUser) return "Sign in to view and update your data.";
  if (profileLoading) return "Loading your profile…";
  if (!hasProfile) return "Complete the form below to create your user profile.";
  return "You're signed in. Add an entry below and save to your Firestore subcollections.";
}

/**
 * Home page client: orchestrates auth, profile state, and content.
 * - Not signed in: hero + sign-in CTA (handled by layout).
 * - Signed in, no profile: hero + ProfileForm.
 * - Signed in, has profile: hero + AddEntrySection.
 */
export function HomeClient() {
  const { user } = useAuth();
  const { data: profileData, loading: profileLoading, saveProfile, error: profileError } =
    useUserMetadata();

  const hasUser = !!user;
  const hasProfile = profileData != null;
  const showProfileForm = hasUser && !profileLoading && !hasProfile;
  const showAddEntry = hasUser && !profileLoading && hasProfile;

  const subtitle = getSubtitle(hasUser, profileLoading, hasProfile);

  return (
    <HomeLayout>
      <HomeHero subtitle={subtitle} />
      {hasUser && profileLoading && <ProfileLoadingSpinner />}
      {showProfileForm && (
        <ProfileForm
          saveProfile={saveProfile}
          initialEmail={user?.email ?? ""}
          error={profileError}
        />
      )}
      {showAddEntry && (
        <div className={`w-full ${isDebugLoggingEnabled ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : ""}`}>
          <AddEntrySection />
          {isDebugLoggingEnabled && <DebugDataPanel />}
        </div>
      )}

      {showAddEntry && (
        <Link
          href="/appointment"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Start appointment
          <span aria-hidden>→</span>
        </Link>
      )}
    </HomeLayout>
  );
}
