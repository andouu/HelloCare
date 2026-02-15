'use client';

import { useRouter } from "next/navigation";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { HiOutlineMenuAlt4 } from "react-icons/hi";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { motion } from "motion/react";
import { useChat } from "@ai-sdk/react";
import { useI18n } from "@/app/components/I18nProvider";
import { ChatWidget, HomeSummary, StreamingText } from "@/app/components";
import { getSuggestedPrompts } from "@/app/components/HomeSummary";
import { useDrawer } from "@/app/(dashboard)/layout";
import { useToolExecutor } from "@/app/hooks/useToolExecutor";
import { CHAT_TOOL_NAMES } from "@/lib/chat-actions";
import { useAppointments, useDocuments, useUserMetadata, useUserData } from "@/lib/firestore";
import type { UIMessage } from "ai";

const SCROLL_THRESHOLD = 80;

function getMessageText(msg: UIMessage): string {
  return (msg.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export default function Home() {
  const { t, languageTag } = useI18n();
  const { loading, isOnboarded, data: userMetadata } = useUserMetadata();
  const userData = useUserData();
  const { appointments } = useAppointments();
  const { documents } = useDocuments();
  const router = useRouter();
  const { openDrawer } = useDrawer() ?? {};
  const { messages, sendMessage, status } = useChat();

  // Scroll handling refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const userAtBottomRef = useRef(true);

  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [suggestedPromptIndex, setSuggestedPromptIndex] = useState(0);
  const [healthNoteModalOpen, setHealthNoteModalOpen] = useState(false);

  // Track which tool calls have already been executed to prevent duplicates.
  const executedToolCallsRef = useRef<Set<string>>(new Set());

  // Shared tool executor
  const { executeToolCall } = useToolExecutor({
    onOpenHealthNoteRecorder: useCallback(() => setHealthNoteModalOpen(true), []),
  });

  // ---------------------------------------------------------------------------
  // Build chat context (sent to API with every message)
  // ---------------------------------------------------------------------------

  const chatContext = useMemo(
    () => ({
      userMetadata: userMetadata
        ? {
            id: userMetadata.id,
            firstName: userMetadata.firstName,
            lastName: userMetadata.lastName,
            email: userMetadata.email,
            preferredLanguage: userMetadata.preferredLanguage,
          }
        : null,
      languageTag,
      healthNotes: userData.healthNotes.map((n) => ({
        id: n.id,
        date: n.date instanceof Date ? n.date.toISOString() : n.date,
        type: n.type,
        title: n.title,
        description: n.description,
      })),
      actionItems: userData.actionItems.map((a) => ({
        id: a.id,
        dueBy: a.dueBy instanceof Date ? a.dueBy.toISOString() : a.dueBy,
        type: a.type,
        title: a.title,
        description: a.description,
        status: a.status,
        priority: a.priority,
        medication: a.medication,
      })),
      sessionMetadata: userData.sessionMetadata.map((s) => ({
        id: s.id,
        date: s.date instanceof Date ? s.date.toISOString() : s.date,
        title: s.title,
        summary: s.summary,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        appointmentTime:
          a.appointmentTime instanceof Date ? a.appointmentTime.toISOString() : String(a.appointmentTime),
        scheduledOn:
          a.scheduledOn instanceof Date ? a.scheduledOn.toISOString() : String(a.scheduledOn),
      })),
      documents: documents.map((d) => ({
        id: d.id,
        summary: d.summary,
        uploadedAt: d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : String(d.uploadedAt),
      })),
    }),
    [
      userMetadata,
      languageTag,
      userData.healthNotes,
      userData.actionItems,
      userData.sessionMetadata,
      appointments,
      documents,
    ]
  );

  // ---------------------------------------------------------------------------
  // Scan messages for tool-call parts and execute them
  // ---------------------------------------------------------------------------

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts ?? []) {
        // In AI SDK v6, tool parts have type "tool-<toolName>"
        // and fields: toolCallId, state, input.
        // With server-side execute, state progresses to "output-available".
        for (const toolName of CHAT_TOOL_NAMES) {
          if (part.type !== `tool-${toolName}`) continue;
          const { state, toolCallId, input } = part as {
            state: string;
            toolCallId: string;
            input: unknown;
          };
          if (state !== "input-available" && state !== "output-available") continue;
          if (executedToolCallsRef.current.has(toolCallId)) continue;
          executedToolCallsRef.current.add(toolCallId);
          void executeToolCall(toolName, input);
        }
      }
    }
  }, [messages, executeToolCall]);

  // ---------------------------------------------------------------------------
  // Onboarding redirect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (loading) return;
    if (!isOnboarded) {
      router.replace("/onboarding");
    }
  }, [loading, isOnboarded, router]);

  // ---------------------------------------------------------------------------
  // Chat send
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(
        { text: content },
        { body: { context: chatContext } },
      );
    },
    [sendMessage, chatContext],
  );

  const suggestedPrompts = getSuggestedPrompts(t);
  const currentSuggestedPrompt =
    suggestedPrompts[suggestedPromptIndex % suggestedPrompts.length];
  const handlePromptClick = useCallback(
    (text: string) => {
      handleSend(text);
      setSuggestedPromptIndex((i) => i + 1);
    },
    [handleSend],
  );

  // ---------------------------------------------------------------------------
  // Scroll behaviour
  // ---------------------------------------------------------------------------

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    userAtBottomRef.current =
      scrollHeight - scrollTop - clientHeight <= SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeaderSticky(!entry.isIntersecting),
      { root: container, rootMargin: "0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!userAtBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, []);

  useEffect(() => {
    const content = messagesContentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => scrollToBottom());
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottom, messages.length]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading || !isOnboarded) return null;

  const showSummary = messages.length === 0;
  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="w-full min-h-screen flex flex-col">
      <header
        className={`sticky top-0 z-20 flex items-center justify-between pl-4 pr-2 py-3 shrink-0 bg-white transition-all duration-200 overflow-visible ${
          isHeaderSticky ? "rounded-b-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => openDrawer?.()}
          className="p-2 -ml-2 rounded-lg text-neutral-900 hover:bg-neutral-100 transition-colors"
          aria-label={t("home.openMenu")}
        >
          <HiOutlineMenuAlt4 className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/appointments/conversation")}
          className="flex items-center gap-2 rounded-full bg-neutral-200 px-4 py-2.5 text-sm text-neutral-900 transition-colors hover:bg-neutral-300"
        >
          <HiOutlineChatBubbleLeftRight className="h-5 w-5 shrink-0" />
          <span>{t("home.visitCta")}</span>
        </button>
      </header>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 min-h-0 flex flex-col overflow-auto pb-40 bg-white"
      >
        <div ref={scrollSentinelRef} className="h-px w-full shrink-0" aria-hidden />
        {showSummary ? (
          <div className="sticky top-0 z-10 bg-white shrink-0">
            <HomeSummary />
          </div>
        ) : (
          <div
            ref={messagesContentRef}
            className="flex-1 flex flex-col gap-4 px-4 py-6"
          >
            {messages.map((msg) => {
              const text = getMessageText(msg);
              if (!text) return null;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-neutral-800 text-white"
                        : "bg-neutral-100 text-neutral-900"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <StreamingText content={text} messageId={msg.id} />
                    ) : (
                      text
                    )}
                  </div>
                </motion.div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-neutral-100 text-neutral-500">
                  {t("home.thinking")}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} aria-hidden />
          </div>
        )}
      </div>
      <ChatWidget
        onSend={handleSend}
        disabled={isLoading}
        suggestedPrompt={currentSuggestedPrompt}
        onPromptClick={handlePromptClick}
        externalRecordModalOpen={healthNoteModalOpen}
        onRecordModalClose={() => setHealthNoteModalOpen(false)}
      />
    </div>
  );
}
