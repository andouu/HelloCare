'use client';

import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "motion/react";
import { IoCheckmark } from "react-icons/io5";
import { BaseStepProps } from "../types";

const LANGUAGES = [
  { code: "en-US", label: "US English", native: "English" },
  { code: "en-GB", label: "UK English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "zh-cmn", label: "Mandarin Chinese", native: "普通话" },
  { code: "zh-yue", label: "Cantonese Chinese", native: "廣東話" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "tl", label: "Tagalog", native: "Tagalog" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "it", label: "Italian", native: "Italiano" },
];

const DISMISS_THRESHOLD = 120;

function LanguageModal({
  isOpen,
  onClose,
  selectedLanguage,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  onSelect: (label: string) => void;
}) {
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 400], [0.4, 0]);
  const backdropColor = useTransform(backdropOpacity, (v) => `rgba(0,0,0,${v})`);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_THRESHOLD || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            onClick={onClose}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ backgroundColor: backdropColor }}
          />
          {/* Sheet */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col"
            style={{ maxHeight: "70vh", y: dragY }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-9 h-1 rounded-full bg-neutral-300" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4 text-center flex-shrink-0">
              <span className="font-semibold text-base">Select Language</span>
            </div>

            {/* Language List */}
            <div className="overflow-y-auto flex-1 px-5 pb-10">
              <div className="flex flex-col gap-1.5">
                {LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage === lang.label;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onSelect(lang.label);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors ${isSelected
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 active:bg-neutral-200 text-neutral-900"
                        }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-semibold text-sm">{lang.label}</span>
                        <span className={`text-xs ${isSelected ? "text-neutral-400" : "text-neutral-400"}`}>
                          {lang.native}
                        </span>
                      </div>
                      {isSelected && (
                        <IoCheckmark className="text-white text-lg" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Step2({ onContinue, formData, setFormData }: BaseStepProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const selectedLabel = formData.language || "US English";

  return (
    <>
      <div className="flex flex-col gap-10 px-5">
        <div className="flex flex-col items-center leading-5 gap-1">
          <span>What&apos;s your preferred language?</span>
          <span className="text-neutral-400 max-w-xs text-center">Step 2 of 3</span>
        </div>
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full h-13 flex flex-col font-medium text-sm rounded-full border border-neutral-300 items-center justify-center active:bg-neutral-100 px-4 text-center"
          >
            <span className="font-semibold">{selectedLabel}</span>
            <span className="text-neutral-400 text-xs">Tap to change</span>
          </button>
          <button
            onClick={onContinue}
            className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700"
          >
            Continue
          </button>
        </div>
      </div>
      <LanguageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedLanguage={selectedLabel}
        onSelect={(label) => setFormData((prev) => ({ ...prev, language: label }))}
      />
    </>
  );
}
