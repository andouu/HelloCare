'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUserMetadata } from "@/lib/firestore";
import { useI18n } from "@/app/components/I18nProvider";
import { DEFAULT_LANGUAGE_TAG } from "@/lib/i18n/locales";
import { OnboardingFormData } from "./types";
import { StepWrapper } from "./components/StepWrapper";
import { Step0 } from "./components/Step0";
import { Step1 } from "./components/Step1";
import { Step2 } from "./components/Step2";
import { Step3 } from "./components/Step3";
import { Step4 } from "./components/Step4";

export default function Onboarding() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { loading, isOnboarded, saveProfile } = useUserMetadata();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth");
      return;
    }
    if (!loading && isOnboarded) {
      router.replace("/");
    }
  }, [authLoading, user, loading, isOnboarded, router]);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: "",
    lastName: "",
    language: DEFAULT_LANGUAGE_TAG,
    phone: "",
  });

  const handleFinishOnboarding = async () => {
    setSaveError(null);
    setSaving(true);
    const result = await saveProfile({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: user?.email ?? undefined,
      preferredLanguage: formData.language,
      hospitalPhoneNumber: formData.phone.trim(),
    });
    setSaving(false);
    if (result.ok) {
      router.replace("/");
    } else {
      setSaveError(result.error?.message ?? t("onboarding.saveError"));
    }
  };

  const canGoBack = step > 1;
  const handleGoBack = () => setStep((s) => Math.max(0, s - 1));

  const stepProps = { formData, setFormData };

  if (authLoading || loading || !user || isOnboarded) return null;

  return <StepWrapper canGoBack={canGoBack} onGoBack={handleGoBack}>
    {step === 0 && <Step0 onContinue={() => setStep(1)} {...stepProps} />}
    {step === 1 && <Step1 onContinue={() => setStep(2)} {...stepProps} />}
    {step === 2 && <Step2 onContinue={() => setStep(3)} {...stepProps} />}
    {step === 3 && <Step3 onContinue={() => setStep(4)} {...stepProps} />}
    {step === 4 && (
      <Step4
        onContinue={handleFinishOnboarding}
        saving={saving}
        saveError={saveError}
        {...stepProps}
      />
    )}
  </StepWrapper>
}
