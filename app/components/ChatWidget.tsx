'use client';

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiMicrophone, HiStop } from "react-icons/hi";
import {
  HiOutlineArrowUp,
  HiOutlineCalendar,
  HiOutlinePencil,
} from "react-icons/hi2";
import { RecordHealthNoteModal } from "./RecordHealthNoteModal";
import { useStreamingTranscription } from "@/app/hooks/useStreamingTranscription";
import { Spinner } from "./Spinner";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatWidgetProps = {
  onSend?: (content: string) => void;
  disabled?: boolean;
};

const WAVEFORM_BARS = 40;
const BAR_DURATION_MS = 50;
const MAX_BAR_HEIGHT = 34;
const MIN_BAR_HEIGHT = 6;
const NOISE_FLOOR = 0.03;

function RecordingWaveform({ level }: { level: number }) {
  const levelRef = useRef(level);
  const barStartRef = useRef(0);
  const smoothedRef = useRef(MIN_BAR_HEIGHT);
  const [heights, setHeights] = useState<number[]>(
    () => Array.from({ length: WAVEFORM_BARS }, () => MIN_BAR_HEIGHT),
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    let raf: number;
    barStartRef.current = performance.now();

    const tick = (now: number) => {
      const currentLevel = levelRef.current;
      const targetH =
        currentLevel < NOISE_FLOOR
          ? MIN_BAR_HEIGHT
          : Math.max(MIN_BAR_HEIGHT, Math.pow(currentLevel, 0.65) * MAX_BAR_HEIGHT);
      smoothedRef.current = smoothedRef.current * 0.6 + targetH * 0.4;
      const h = smoothedRef.current;

      setHeights((prev) => {
        const next = [...prev];
        next[currentIndex] = h;
        return next;
      });

      if (now - barStartRef.current >= BAR_DURATION_MS) {
        barStartRef.current = now;
        smoothedRef.current = h;
        setCurrentIndex((i) => (i + 1) % WAVEFORM_BARS);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentIndex]);

  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5">
      {Array.from({ length: WAVEFORM_BARS }, (_, displayI) => {
        const dataIndex = (currentIndex + 1 + displayI) % WAVEFORM_BARS;
        const h = heights[dataIndex];
        const isActive = displayI === WAVEFORM_BARS - 1;
        const isMinHeight = h <= MIN_BAR_HEIGHT;
        const barColor = isMinHeight
          ? "bg-neutral-300"
          : isActive
            ? "bg-neutral-500"
            : "bg-neutral-700";
        return (
          <div
            key={displayI}
            className={`min-w-[1px] flex-1 rounded-sm transition-[height,background-color] duration-75 ease-out ${barColor}`}
            style={{ height: h, transformOrigin: "center" }}
          />
        );
      })}
    </div>
  );
}

export function ChatWidget({ onSend, disabled }: ChatWidgetProps) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    startRecording,
    stopRecording,
    isRecording,
    isStarting,
    isStopping,
    clearError,
    clearTranscript,
    isSupported,
    tokenStatus,
  } = useStreamingTranscription({
    onAudioLevel: useCallback((level: number) => setAudioLevel(level), []),
  });

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
    if (trimmed && onSend && !disabled && !isRecording && !isStarting && !isStopping) {
      onSend(trimmed);
      setInputValue("");
    }
  };

  const handleMicToggle = useCallback(async () => {
    if (disabled || isStarting || isStopping) return;

    if (isRecording) {
      const transcript = (await stopRecording()).trim();
      if (transcript) {
        setInputValue(transcript);
      }
      inputRef.current?.focus();
      return;
    }

    clearError();
    clearTranscript();
    setAudioLevel(0);
    await startRecording();
  }, [
    clearError,
    clearTranscript,
    disabled,
    isRecording,
    isStarting,
    isStopping,
    startRecording,
    stopRecording,
  ]);

  const canRecord = isSupported && tokenStatus === "ready" && !disabled;
  const isWaveformMode = isRecording || isStarting || isStopping;

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
          onClick={() => void handleMicToggle()}
          disabled={!canRecord || isStarting || isStopping}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-900 transition-colors hover:bg-neutral-300 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isStarting || isStopping ? (
            <Spinner size="sm" />
          ) : isRecording ? (
            <HiStop className="h-5 w-5" />
          ) : (
            <HiMicrophone className="h-5 w-5" />
          )}
        </button>
        {isWaveformMode ? (
          <div className="min-w-0 h-10 flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2.5">
            <RecordingWaveform level={audioLevel} />
          </div>
        ) : (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            type="text"
            placeholder="Ask any question..."
            disabled={disabled}
            className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          />
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || isWaveformMode}
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
