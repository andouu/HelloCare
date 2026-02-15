'use client';

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { HiX } from "react-icons/hi";

type DrawerSide = "left" | "right" | "top" | "bottom";

type AnimationTarget = { x?: string | number; y?: string | number };

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: DrawerSide;
  title?: string;
  /** User name shown next to avatar in header (e.g. "Andrew Zhou") */
  userName?: string;
  /** User avatar URL; when absent, shows blue circle with initials */
  userAvatarUrl?: string;
  /** Prevent closing when clicking the overlay */
  disableOverlayClose?: boolean;
}

const sideConfig: Record<
  DrawerSide,
  { panel: string; overlay: string; initial: AnimationTarget; animate: AnimationTarget; exit: AnimationTarget }
> = {
  left: {
    panel: "left-0 top-0 h-full",
    overlay: "",
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
  },
  right: {
    panel: "right-0 top-0 h-full",
    overlay: "",
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  },
  top: {
    panel: "left-0 top-0 w-full",
    overlay: "",
    initial: { y: "-100%" },
    animate: { y: 0 },
    exit: { y: "-100%" },
  },
  bottom: {
    panel: "left-0 bottom-0 w-full",
    overlay: "",
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Drawer({
  open,
  onClose,
  children,
  side = "right",
  title,
  userName,
  userAvatarUrl,
  disableOverlayClose = false,
}: DrawerProps) {
  const config = sideConfig[side];

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={disableOverlayClose ? undefined : onClose}
            aria-hidden="true"
          />
          {/* Panel */}
          <motion.div
            key="panel"
            className={`fixed z-50 w-full max-w-[320px] bg-background shadow-xl ${config.panel}`}
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={{ type: "tween", ease: "circOut", duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                {userName != null ? (
                  <>
                    {userAvatarUrl ? (
                      <Image
                        src={userAvatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white"
                        aria-hidden
                      >
                        {getInitials(userName)}
                      </div>
                    )}
                    <span id="drawer-title" className="text-base font-medium text-neutral-700">
                      {userName}
                    </span>
                  </>
                ) : title ? (
                  <h2 id="drawer-title" className="text-lg font-semibold">
                    {title}
                  </h2>
                ) : (
                  <span id="drawer-title" className="sr-only">
                    Drawer
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1.5 text-neutral-900 transition-colors hover:bg-neutral-100"
                aria-label="Close drawer"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
