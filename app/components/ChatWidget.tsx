'use client';

import { useEffect, useState } from "react";
import { HiMicrophone } from "react-icons/hi";
import { HiOutlineArrowUp } from "react-icons/hi2";

export function ChatWidget() {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

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

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-30 flex items-center gap-2 transition-transform duration-200 ease-out md:left-auto md:right-6 md:w-[min(24rem,calc(100vw-3rem))]"
      style={{ transform: `translateY(-${keyboardOffset}px)` }}
    >
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-900 transition-colors hover:bg-neutral-300"
        aria-label="Options"
      >
        <HiMicrophone className="h-5 w-5" />
      </button>
      <input
        type="text"
        placeholder="Ask any question..."
        className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm"
      />
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white transition-colors hover:bg-neutral-700"
        aria-label="Send"
      >
        <HiOutlineArrowUp className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  );
}
