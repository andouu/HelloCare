'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { HiOutlineMenuAlt4 } from "react-icons/hi";
import { ChatWidget, Drawer } from "@/app/components";
import { useAuth } from "@/lib/auth-context";
import { useUserMetadata } from "@/lib/firestore";

/** Drawer menu items: add entries here to extend the menu. */
const DRAWER_MENU_ITEMS = [
  { label: "Action Items", href: "/action-items" },
  { label: "Health Notes", href: "/health-notes" },
] as const;

export default function Home() {
  const { user } = useAuth();
  const { data: userMetadata, loading, isOnboarded } = useUserMetadata();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const userName =
    userMetadata != null
      ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim()
      : user?.displayName ?? undefined;

  useEffect(() => {
    if (loading) return;
    if (!isOnboarded) {
      router.replace("/onboarding");
    }
  }, [loading, isOnboarded, router]);

  if (loading || !isOnboarded) return null;

  return (
    <div className="w-full h-screen flex flex-col">
      <header className="flex items-center justify-between pl-4 pr-2 py-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          aria-label="Open menu"
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-neutral-200 px-4 py-2.5 text-sm text-neutral-900 transition-colors hover:bg-neutral-300"
        >
          <HiOutlineChatBubbleLeftRight className="h-5 w-5 shrink-0" />
          <span>I&apos;m at a doctor&apos;s visit</span>
        </button>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <span className="text-neutral-400">Home</span>
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
            <button
              key={href}
              type="button"
              onClick={() => {
                router.push(href);
                setDrawerOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            >
              {label}
            </button>
          ))}
        </nav>
      </Drawer>
      <ChatWidget />
    </div>
  );
}
