'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { HiOutlineMenuAlt4 } from "react-icons/hi";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { ChatWidget, HomeSummary } from "@/app/components";
import type { ChatMessage } from "@/app/components/ChatWidget";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useUserMetadata } from "@/lib/firestore";

export default function Home() {
  const { loading, isOnboarded } = useUserMetadata();
  const router = useRouter();
  const { openDrawer } = useDrawer() ?? {};
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!isOnboarded) {
      router.replace("/onboarding");
    }
  }, [loading, isOnboarded, router]);

  const handleSend = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    // TODO: call assistant API and append response
  }, []);

  if (loading || !isOnboarded) return null;

  const showSummary = messages.length === 0;

  return (
    <div className="w-full min-h-screen flex flex-col">
      <header className="flex items-center justify-between pl-4 pr-2 py-3 shrink-0">
        <button
          type="button"
          onClick={() => openDrawer?.()}
          className="p-2 -ml-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          aria-label="Open menu"
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/appointments/conversation")}
          className="flex items-center gap-2 rounded-full bg-neutral-200 px-4 py-2.5 text-sm text-neutral-900 transition-colors hover:bg-neutral-300"
        >
          <HiOutlineChatBubbleLeftRight className="h-5 w-5 shrink-0" />
          <span>I&apos;m at a doctor&apos;s visit</span>
        </button>
      </header>
      <div className="flex-1 flex flex-col overflow-auto pb-32">
        {showSummary ? (
          <div className="sticky top-0 z-10 bg-white shrink-0">
            <HomeSummary />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 px-4 py-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-neutral-800 text-white"
                      : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ChatWidget onSend={handleSend} />
    </div>
  );
}
