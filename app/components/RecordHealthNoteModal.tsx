'use client';

import { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { useStreamingTranscription } from "@/app/hooks/useStreamingTranscription";
import { Spinner } from "@/app/components/Spinner";
import { HiMicrophone, HiStop } from "react-icons/hi";

const DISMISS_THRESHOLD = 100;
const WAVEFORM_BARS = 40;
const BAR_DURATION_MS = 50;
const MAX_BAR_HEIGHT = 68;
const MIN_BAR_HEIGHT = 8;
const NOISE_FLOOR = 0.03;

function RecordingWaveform({ level }: { level: number }) {
  const levelRef = useRef(level);
  levelRef.current = level;
  const barStartRef = useRef(performance.now());
  const smoothedRef = useRef(MIN_BAR_HEIGHT);
  const [heights, setHeights] = useState<number[]>(
    () => Array.from({ length: WAVEFORM_BARS }, () => MIN_BAR_HEIGHT)
  );
  const [currentIndex, setCurrentIndex] = useState(0);

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
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 400], [0.4, 0]);
  const backdropColor = useTransform(backdropOpacity, (v) => `rgba(0,0,0,${v})`);

  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [screen, setScreen] = useState<"record" | "processing">("record");
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) setScreen("record");
  }, [isOpen]);

  const {
    startRecording,
    stopRecording,
    isRecording,
    segments,
    interimTranscript,
    isSupported,
    tokenStatus,
  } = useStreamingTranscription({
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

  const handleStopRecording = useCallback(() => {
    const fullTranscript = [...segments.map((s) => s.text), interimTranscript]
      .filter(Boolean)
      .join(" ");
    console.log("Transcript:", fullTranscript);
    stopRecording();
    setScreen("processing");
  }, [stopRecording, segments, interimTranscript]);

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
                    <Spinner size="lg" theme="neutral" />
                    <span className="text-sm text-neutral-500">Processing your recording…</span>
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
                    <span className="font-bold">Record Health Note</span>
                    <span className="text-neutral-400">
                      Record health incidents you&apos;re experiencing, and we&apos;ll use this information to help you.
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
                      disabled={!canRecord}
                      className={`w-full h-12 font-semibold text-sm rounded-full flex items-center justify-center gap-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isRecording
                          ? "bg-red-500 text-white active:bg-red-400"
                          : "bg-neutral-900 text-white active:bg-neutral-700"
                      }`}
                      aria-pressed={isRecording}
                      aria-label={isRecording ? "Stop recording" : "Start recording"}
                    >
                      {isRecording ? <HiStop size={20} /> : <HiMicrophone size={20} />}
                      <span className="flex-1 text-center">{isRecording ? "Stop Recording" : "Start Recording"}</span>
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
