'use client';

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { IoCheckmark } from "react-icons/io5";
import { useI18n } from "@/app/components/I18nProvider";
import { LANGUAGE_OPTIONS } from "@/lib/i18n/locales";
import { BaseStepProps } from "../types";

const DISMISS_THRESHOLD = 100;

function LanguageModal({
  isOpen,
  onClose,
  selectedLanguageCode,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguageCode: string;
  onSelect: (code: string) => void;
}) {
  const { t } = useI18n();
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 400], [0.4, 0]);
  const backdropColor = useTransform(backdropOpacity, (v) => `rgba(0,0,0,${v})`);

  const startYRef = useRef(0);
  const draggingRef = useRef(false);

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

  return (
    <AnimatePresence onExitComplete={() => dragY.jump(0)}>
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
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl"
            style={{ height: "70vh", y: dragY }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: "circOut" }}
          >
            {/* Handle + Header — ONLY drag zone */}
            <div
              className="touch-none select-none"
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
            >
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-9 h-1 rounded-full bg-neutral-300" />
              </div>
              <div className="px-5 pt-2 pb-4 text-center">
                <span className="font-semibold text-base">{t("onboarding.step2.selectLanguage")}</span>
              </div>
            </div>

            {/* Scrollable language list */}
            <div
              className="overflow-y-auto overscroll-contain px-5 pb-10"
              style={{ position: "absolute", top: 76, left: 0, right: 0, bottom: 0 }}
            >
              <div className="flex flex-col gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isSelected = selectedLanguageCode === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onSelect(lang.code);
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
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);

  const selectedLanguage =
    LANGUAGE_OPTIONS.find((opt) => opt.code === formData.language) ??
    LANGUAGE_OPTIONS[0];

  return (
    <>
      <div className="flex flex-col gap-10 px-5">
        <div className="flex flex-col items-center leading-5 gap-1">
          <span>{t("onboarding.step2.title")}</span>
          <span className="text-neutral-400 max-w-xs text-center">{t("onboarding.step2.progress")}</span>
        </div>
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full h-13 flex flex-col font-medium text-sm rounded-full border border-neutral-300 items-center justify-center active:bg-neutral-100 px-4 text-center"
          >
            <span className="font-semibold">{selectedLanguage.label}</span>
            <span className="text-neutral-400 text-xs">{t("onboarding.step2.tapToChange")}</span>
          </button>
          <button
            onClick={onContinue}
            className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700"
          >
            {t("common.continue")}
          </button>
        </div>
      </div>
      <LanguageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedLanguageCode={selectedLanguage.code}
        onSelect={(code) => setFormData((prev) => ({ ...prev, language: code }))}
      />
    </>
  );
}
