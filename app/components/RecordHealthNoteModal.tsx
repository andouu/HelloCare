'use client';

import { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { useI18n } from "@/app/components/I18nProvider";
import { useStreamingTranscription } from "@/app/hooks/useStreamingTranscription";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { writeHealthNote } from "@/lib/firestore/api";
import { Spinner } from "@/app/components/Spinner";
import { HiMicrophone, HiStop, HiOutlineThumbDown, HiDownload } from "react-icons/hi";
import type { HealthNote } from "@/lib/firestore/types";

const DISMISS_THRESHOLD = 100;
const WAVEFORM_BARS = 40;

function formatRelativeDate(
  date: Date,
  languageTag: string,
  now: Date = new Date(),
): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  const formatter = new Intl.RelativeTimeFormat(languageTag, {
    numeric: "auto",
  });

  if (diffSec < 60) return formatter.format(-diffSec, "second");
  if (diffMin < 60) return formatter.format(-diffMin, "minute");
  if (diffHr < 24) return formatter.format(-diffHr, "hour");
  if (diffDay < 7) return formatter.format(-diffDay, "day");
  if (diffWeek < 4) return formatter.format(-diffWeek, "week");
  if (diffMonth < 12) return formatter.format(-diffMonth, "month");
  return formatter.format(-diffYear, "year");
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  if (sec < 60) return `${sec} Sec`;
  if (min < 60) return `${min} Min`;
  return `${hr} Hr ${min % 60} Min`;
}
const BAR_DURATION_MS = 50;
const MAX_BAR_HEIGHT = 68;
const MIN_BAR_HEIGHT = 8;
const NOISE_FLOOR = 0.03;

function RecordingWaveform({ level }: { level: number }) {
  const levelRef = useRef(level);
  const barStartRef = useRef(0);
  const smoothedRef = useRef(MIN_BAR_HEIGHT);
  const [heights, setHeights] = useState<number[]>(
    () => Array.from({ length: WAVEFORM_BARS }, () => MIN_BAR_HEIGHT)
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    let raf: number;
    barStartRef.current = performance.now();

    const tick = (now: number) => {
      const level = levelRef.current;
      const targetH =
        level < NOISE_FLOOR
          ? MIN_BAR_HEIGHT
          : Math.max(MIN_BAR_HEIGHT, Math.pow(level, 0.65) * MAX_BAR_HEIGHT);
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
    <div className="flex items-center justify-center gap-1 w-full h-24">
      {Array.from({ length: WAVEFORM_BARS }, (_, displayI) => {
        const dataIndex = (currentIndex + 1 + displayI) % WAVEFORM_BARS;
        const h = heights[dataIndex];
        const isActive = displayI === WAVEFORM_BARS - 1;
        const isMinHeight = h <= MIN_BAR_HEIGHT;
        const barColor = isMinHeight
          ? "bg-neutral-200"
          : isActive
            ? "bg-neutral-500"
            : "bg-neutral-700";
        return (
          <div
            key={displayI}
            className={`flex-1 min-w-[2px] rounded-sm transition-[height,background-color] duration-75 ease-out ${barColor}`}
            style={{ height: h, transformOrigin: "center" }}
          />
        );
      })}
    </div>
  );
}

function IdleWaveform() {
  const h = 8;
  return (
    <div className="flex items-center justify-center gap-1 w-full h-24">
      {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
        <div
          key={i}
          className="flex-1 min-w-[2px] rounded-sm bg-neutral-200"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

export function RecordHealthNoteModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t, languageTag } = useI18n();
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 400], [0.4, 0]);
  const backdropColor = useTransform(backdropOpacity, (v) => `rgba(0,0,0,${v})`);

  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [screen, setScreen] = useState<"record" | "processing" | "complete" | "notEnoughData">("record");
  const [processingPayload, setProcessingPayload] = useState<{
    transcript: string;
    startedAt: string;
    endedAt: string;
  } | null>(null);
  const [healthNote, setHealthNote] = useState<HealthNote | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [writeError, setWriteError] = useState<Error | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const { user } = useAuth();
  const isAuthenticated = !!user?.uid;

  useEffect(() => {
    if (isOpen) {
      setScreen("record");
      setProcessingPayload(null);
      setHealthNote(null);
      setProcessingError(null);
      setWriteError(null);
    }
  }, [isOpen]);

  const {
    startRecording,
    stopRecording,
    isRecording,
    isStarting,
    isStopping,
    isSupported,
    tokenStatus,
  } = useStreamingTranscription({
    languageTag,
    onAudioLevel: useCallback((level: number) => setAudioLevel(level), []),
  });

  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
    }
  }, [isRecording]);

  const canRecord = isSupported && tokenStatus === "ready";

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleStopRecording = useCallback(async () => {
    const startedAt = startTimeRef.current ?? Date.now();
    const endedAt = Date.now();
    const fullTranscript = await stopRecording();
    console.log("Transcript:", fullTranscript);
    setProcessingPayload({
      transcript: fullTranscript,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
    });
    setScreen("processing");
  }, [stopRecording]);

  useEffect(() => {
    if (screen !== "processing" || !processingPayload) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/health-note-from-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...processingPayload, languageTag }),
        });
        if (!res.ok) throw new Error(t("recordNote.generateFailed"));
        const data = (await res.json()) as
          | (HealthNote & { date: string; startedAt: string; endedAt: string })
          | { notEnoughData: true };
        if ("notEnoughData" in data && data.notEnoughData) {
          if (!cancelled) setScreen("notEnoughData");
          return;
        }
        const healthData = data as HealthNote & { date: string; startedAt: string; endedAt: string };
        const note: HealthNote = {
          ...healthData,
          userId: "",
          date: new Date(healthData.date),
          startedAt: new Date(healthData.startedAt),
          endedAt: new Date(healthData.endedAt),
        };
        if (!cancelled) {
          setHealthNote(note);
          setScreen("complete");
          console.log("HealthNote (generated):", JSON.stringify(note, null, 2));
        }
      } catch (err) {
        if (!cancelled) {
          setProcessingError(err instanceof Error ? err.message : t("recordNote.generateFailed"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screen, processingPayload, languageTag, t]);

  const handleRetry = useCallback(() => {
    setScreen("record");
    setProcessingPayload(null);
    setHealthNote(null);
    setProcessingError(null);
    setWriteError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!healthNote || !user?.uid) return;
    setWriting(true);
    setWriteError(null);
    const result = await writeHealthNote(db, user.uid, {
      id: healthNote.id,
      date: healthNote.date,
      startedAt: healthNote.startedAt,
      endedAt: healthNote.endedAt,
      type: healthNote.type,
      title: healthNote.title,
      description: healthNote.description,
    });
    setWriting(false);
    if (result.ok) {
      onClose();
    } else {
      setWriteError(result.error);
    }
  }, [healthNote, user?.uid, onClose]);

  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    draggingRef.current = true;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const offset = Math.max(0, e.touches[0].clientY - startYRef.current);
    dragY.set(offset);
  }, [dragY]);

  const onHandleTouchEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragY.get() > DISMISS_THRESHOLD) {
      onClose();
    } else {
      dragY.set(0);
    }
  }, [dragY, onClose]);

  const content = (
    <AnimatePresence onExitComplete={() => dragY.jump(0)}>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop — dims background (40% black), fades when dragging sheet down */}
          <motion.div
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ backgroundColor: backdropColor }}
          />

          {/* Sheet */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl"
            style={{ height: "50vh", y: dragY }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: "circOut" }}
          >
            {/* Handle */}
            <div
              className="touch-none select-none"
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
            >
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-9 h-1 rounded-full bg-neutral-300" />
              </div>
            </div>
            <div className="h-full flex flex-col px-5 pt-4 pb-15 text-center overflow-hidden">
              <AnimatePresence mode="wait">
                {screen === "processing" ? (
                  <motion.div
                    key="processing"
                    className="flex-1 flex flex-col items-center justify-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {processingError ? (
                      <>
                        <span className="text-sm text-red-600">{processingError}</span>
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="text-sm font-medium text-neutral-700 underline"
                        >
                          {t("common.retry")}
                        </button>
                      </>
                    ) : (
                      <>
                        <Spinner size="lg" theme="neutral" />
                        <span className="text-sm text-neutral-500">{t("recordNote.processing")}</span>
                      </>
                    )}
                  </motion.div>
                ) : screen === "notEnoughData" ? (
                  <motion.div
                    key="notEnoughData"
                    className="flex-1 flex flex-col items-center justify-center gap-4 px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span className="font-bold">{t("recordNote.notEnoughTitle")}</span>
                    <p className="text text-neutral-500 text-center">
                      {t("recordNote.notEnoughBody")}
                    </p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="h-12 mt-8 px-8 font-semibold text-sm rounded-full bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-700 flex items-center justify-center gap-2"
                    >
                      {t("recordNote.retryRecording")}
                    </button>
                  </motion.div>
                ) : screen === "complete" && healthNote ? (
                  <motion.div
                    key="complete"
                    className="flex flex-col h-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex-1 overflow-auto flex flex-col items-center text-center py-4 px-2">
                      <div className="flex flex-col gap-4 max-w-md">
                        <div className="flex flex-row items-center justify-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-700">
                            {healthNote.type}
                          </span>
                          <h3 className="text-lg font-bold text-neutral-900">{healthNote.title}</h3>
                        </div>
                        <div className="text-sm text-neutral-500">
                          {formatRelativeDate(healthNote.startedAt, languageTag)}
                          {healthNote.startedAt.getTime() !== healthNote.endedAt.getTime() && (
                            <> · {formatDuration(healthNote.endedAt.getTime() - healthNote.startedAt.getTime())} {t("recordNote.recordingSuffix")}</>
                          )}
                        </div>
                        <p className="text text-neutral-600 whitespace-pre-wrap">{healthNote.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-auto pt-4">
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={writing}
                        className="flex-1 h-12 font-semibold text-sm rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <HiOutlineThumbDown size={18} />
                        {t("recordNote.retryRecording")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isAuthenticated || writing}
                        className="flex-1 h-12 font-semibold text-sm rounded-full bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {writing ? <Spinner size="sm" theme="amber" /> : <HiDownload size={18} />}
                        {t("recordNote.saveNote")}
                      </button>
                    </div>
                    {writeError && (
                      <p className="text-sm text-red-600 mt-2" role="alert">{writeError.message}</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="record"
                    className="flex flex-col h-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-bold">{t("recordNote.title")}</span>
                      <span className="text-neutral-400">
                        {t("recordNote.subtitle")}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
                      {isRecording ? (
                        <>
                          <RecordingWaveform level={audioLevel} />
                          <span className="text-sm font-semibold tabular-nums text-neutral-700 mt-5">
                            {formatTime(elapsedSeconds)}
                          </span>
                        </>
                      ) : (
                        <IdleWaveform />
                      )}
                    </div>
                    <div className="mt-auto">
                      <button
                        type="button"
                        onClick={isRecording ? handleStopRecording : () => void startRecording()}
                        disabled={!canRecord || isStarting || isStopping}
                        className={`w-full h-12 font-semibold text-sm rounded-full flex items-center justify-center gap-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording
                          ? "bg-red-500 text-white active:bg-red-400"
                          : "bg-neutral-900 text-white active:bg-neutral-700"
                          }`}
                        aria-pressed={isRecording}
                        aria-label={isRecording ? t("chatWidget.stopRecording") : t("chatWidget.startRecording")}
                      >
                        {isRecording ? <HiStop size={20} /> : <HiMicrophone size={20} />}
                        <span className="flex-1 text-center flex items-center justify-center gap-2">
                          {isStarting || isStopping ? <Spinner size="sm" theme="amber" /> : isRecording ? t("recordNote.stop") : t("recordNote.start")}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
