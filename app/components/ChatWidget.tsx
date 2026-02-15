'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { HiMicrophone } from "react-icons/hi";
import {
  HiOutlineArrowUp,
  HiOutlineCalendar,
  HiOutlinePencil,
} from "react-icons/hi2";
import { RecordHealthNoteModal } from "./RecordHealthNoteModal";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatWidgetProps = {
  onSend?: (content: string) => void;
  disabled?: boolean;
};

export function ChatWidget({ onSend, disabled }: ChatWidgetProps) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
      setKeyboardOffset(keyboardHeight);
    };
    queueMicrotask(update);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (trimmed && onSend && !disabled) {
      onSend(trimmed);
      setInputValue("");
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 flex flex-col gap-2 rounded-t-2xl bg-white px-4 pt-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out md:left-auto md:right-0 md:px-6 md:w-[min(24rem,calc(100vw-3rem))]"
      style={{ transform: `translateY(-${keyboardOffset}px)` }}
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRecordModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-2.5 text-xs text-white transition-colors hover:bg-neutral-700 active:bg-neutral-700"
        >
          <HiOutlinePencil className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Record health note
        </button>
        <Link
          href="/appointments/schedule"
          className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-2.5 text-xs text-white transition-colors hover:bg-neutral-700 active:bg-neutral-700"
        >
          <HiOutlineCalendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Schedule appointment
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-900 transition-colors hover:bg-neutral-300"
          aria-label="Options"
        >
          <HiMicrophone className="h-5 w-5" />
        </button>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          type="text"
          placeholder="Ask any question..."
          disabled={disabled}
          className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white transition-colors hover:bg-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <HiOutlineArrowUp className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
      <RecordHealthNoteModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
      />
    </div>
  );
}
