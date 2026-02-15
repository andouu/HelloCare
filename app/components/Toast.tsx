"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HiCheckCircle } from "react-icons/hi";

type ToastProps = {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Defaults to 2000. */
  duration?: number;
};

export function Toast({
  message,
  visible,
  onDismiss,
  duration = 2000,
}: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-lg border border-emerald-200"
        >
          <HiCheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-sm font-medium text-emerald-700">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
