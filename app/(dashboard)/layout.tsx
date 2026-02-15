"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { HiCalendar, HiCamera, HiChatAlt2, HiClipboardList, HiClock, HiDocumentText, HiHome, HiLogout } from "react-icons/hi";
import { useI18n } from "@/app/components/I18nProvider";
import { Drawer } from "@/app/components";
import { Spinner } from "@/app/components/Spinner";
import { useAuth } from "@/lib/auth-context";
import { useUserMetadata } from "@/lib/firestore";

const DRAWER_MENU_ITEMS = [
  { key: "drawer.home", href: "/", icon: HiHome },
  { key: "drawer.actionItems", href: "/action-items", icon: HiClipboardList },
  { key: "drawer.healthNotes", href: "/health-notes", icon: HiDocumentText },
  { key: "drawer.appointments", href: "/appointments", icon: HiClock },
  { key: "drawer.pastSessions", href: "/past-sessions", icon: HiCalendar },
  { key: "drawer.conversation", href: "/appointments/conversation", icon: HiChatAlt2 },
  { key: "drawer.documents", href: "/documents", icon: HiDocumentText },
  { key: "drawer.scan_documents", href: "/scan-documents", icon: HiCamera },
] as const;

type DrawerContextValue = {
  openDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  return ctx;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const { data: userMetadata } = useUserMetadata();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  const userName =
    userMetadata != null
      ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim()
      : user?.displayName ?? undefined;

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      setDrawerOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, signOut]);

  return (
    <DrawerContext.Provider value={{ openDrawer }}>
      <div className="min-h-screen flex flex-col">
        {children}
      </div>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        side="left"
        userName={userName}
        userAvatarUrl={user?.photoURL ?? undefined}
      >
        <div className="flex min-h-full flex-col">
          <nav className="flex flex-col gap-0.5" aria-label={t("drawer.menuAria")}>
            {DRAWER_MENU_ITEMS.map(({ key, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg py-2.5 text-left text-neutral-900 hover:bg-neutral-50 transition-colors"
              >
                <Icon className="h-5 w-5 shrink-0 text-neutral-900" aria-hidden />
                <span>{t(key)}</span>
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-auto flex w-full items-center rounded-full border border-neutral-200 px-4 py-3 text-sm text-neutral-900 transition-colors hover:bg-neutral-100 active:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HiLogout className="h-4 w-4 shrink-0 text-neutral-900" aria-hidden />
            {isSigningOut ? (
              <span className="flex flex-1 justify-center">
                <Spinner size="sm" theme="neutral" />
              </span>
            ) : (
              <span className="flex-1 text-center">{t("drawer.signOut")}</span>
            )}
            <span className="w-4 shrink-0" aria-hidden />
          </button>
        </div>
      </Drawer>
    </DrawerContext.Provider>
  );
}
