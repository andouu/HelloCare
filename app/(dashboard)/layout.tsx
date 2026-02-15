"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { Drawer } from "@/app/components";
import { useAuth } from "@/lib/auth-context";
import { useUserMetadata } from "@/lib/firestore";

const DRAWER_MENU_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Action Items", href: "/action-items" },
  { label: "Health Notes", href: "/health-notes" },
  { label: "Conversation", href: "/appointments/conversation" },
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
  const { user } = useAuth();
  const { data: userMetadata } = useUserMetadata();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  const userName =
    userMetadata != null
      ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim()
      : user?.displayName ?? undefined;

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
        <nav className="flex flex-col gap-0.5" aria-label="Menu">
          {DRAWER_MENU_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setDrawerOpen(false)}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </Drawer>
    </DrawerContext.Provider>
  );
}
