'use client';

import { useState } from "react";
import { Brand } from "../components/Brand";
import { useRouter } from "next/navigation";

interface OnboardingFormData {
  firstName: string;
  lastName: string;
  language: string;
  phone: string;
}

interface BaseStepProps {
  onContinue: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
}

function StepWrapper({ children, canGoBack, onGoBack }: { children: React.ReactNode; canGoBack?: boolean; onGoBack?: () => void }) {
  return <div className="w-full h-screen flex flex-col">
    <div className="flex-4 flex flex-col items-center justify-end pb-5">
      <Brand />
    </div>
    <div className="flex-7 flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      {canGoBack && (
        <div className="px-5 pb-10">
          <button onClick={onGoBack} className="w-full h-12 font-medium text-sm text-neutral-900 rounded-full flex items-center justify-center bg-neutral-200 active:bg-neutral-300">
            Go Back
          </button>
        </div>
      )}
    </div>
  </div>
}

function Step0({ onContinue }: BaseStepProps) {
  return <div className="flex flex-col gap-10 px-5">
    <div className="flex flex-col items-center leading-5 gap-1">
      <span>Welcome! We&apos;re super excited to have you.</span>
      <span className="text-neutral-400 max-w-xs text-center">We need some information from you. Don&apos;t worry, this will be quick!</span>
    </div>
    <button onClick={onContinue} className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700">
      Get Started
    </button>
  </div>
}

function Step1({ onContinue, formData, setFormData }: BaseStepProps) {
  const namePattern = /^[\p{L}'-]+$/u;
  const isValidName = (name: string) => name.trim().length > 0 && namePattern.test(name.trim());
  const sanitizeName = (value: string) => value.replace(/[^\p{L}'-]/gu, "");
  const isValid = isValidName(formData.firstName) && isValidName(formData.lastName);

  return <div className="flex flex-col gap-10 px-5">
    <div className="flex flex-col items-center leading-5 gap-1">
      <span>First, what&apos;s your name?</span>
      <span className="text-neutral-400 max-w-xs text-center">Step 1 of 3</span>
    </div>
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData((prev) => ({ ...prev, firstName: sanitizeName(e.target.value) }))} className="w-full h-12 font-medium text-sm rounded-full border border-neutral-300 flex items-center justify-center active:bg-neutral-100 px-4 text-center placeholder:tracking-tight" />
        <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData((prev) => ({ ...prev, lastName: sanitizeName(e.target.value) }))} className="w-full h-12 font-medium text-sm rounded-full border border-neutral-300 flex items-center justify-center active:bg-neutral-100 px-4 text-center placeholder:tracking-tight" />
      </div>
      <button onClick={onContinue} disabled={!isValid} className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none">
        Continue
      </button>
    </div>
  </div>
}

function Step2({ onContinue }: BaseStepProps) {
  return <div className="flex flex-col gap-10 px-5">
    <div className="flex flex-col items-center leading-5 gap-1">
      <span>What&apos;s your preferred language?</span>
      <span className="text-neutral-400 max-w-xs text-center">Step 2 of 3</span>
    </div>
    <div className="w-full flex flex-col gap-2">
      <button className="w-full h-13 flex flex-col items-center font-medium text-sm rounded-full border border-neutral-300 flex items-center justify-center active:bg-neutral-100 px-4 text-center placeholder:tracking-tight">
        <span className="font-semibold">
          US English
        </span>
        <span className="text-neutral-400 text-xs">Tap to change</span>
      </button>
      <button onClick={onContinue} className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700">
        Continue
      </button>
    </div>
  </div>
}

function Step3({ onContinue, formData, setFormData }: BaseStepProps) {
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };
  const digits = formData.phone.replace(/\D/g, "");
  const isValid = digits.length === 10;

  return <div className="flex flex-col gap-10 px-5">
    <div className="flex flex-col items-center leading-5 gap-1">
      <span>What&apos;s your hospital&apos;s phone number?</span>
      <span className="text-neutral-400 max-w-xs text-center">Step 3 of 3</span>
    </div>
    <div className="w-full flex flex-col gap-2">
      <input type="tel" placeholder="Phone Number Here" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))} className="w-full h-12 font-medium text-sm rounded-full border border-neutral-300 flex items-center justify-center active:bg-neutral-100 px-4 text-center placeholder:tracking-tight" />
      <button onClick={onContinue} disabled={!isValid} className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none">
        Continue
      </button>
    </div>
  </div>
}

function Step4({ onContinue }: BaseStepProps) {
  return <div className="flex flex-col gap-10 px-5">
    <div className="flex flex-col items-center leading-5 gap-1">
      <span>You&apos;re all set!</span>
      <span className="text-neutral-400 max-w-xs text-center">Welcome to hellocare.</span>
    </div>
    <button onClick={onContinue} className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700">Finish</button>
  </div>
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: "",
    lastName: "",
    language: "US English",
    phone: "",
  });

  const router = useRouter();

  const handleFinishOnboarding = () => {
    router.push("/auth")
  }

  const canGoBack = step > 1;
  const handleGoBack = () => setStep((s) => Math.max(0, s - 1));

  const stepProps = { formData, setFormData };

  return <StepWrapper canGoBack={canGoBack} onGoBack={handleGoBack}>
    {step === 0 && <Step0 onContinue={() => setStep(1)} {...stepProps} />}
    {step === 1 && <Step1 onContinue={() => setStep(2)} {...stepProps} />}
    {step === 2 && <Step2 onContinue={() => setStep(3)} {...stepProps} />}
    {step === 3 && <Step3 onContinue={() => setStep(4)} {...stepProps} />}
    {step === 4 && <Step4 onContinue={handleFinishOnboarding} {...stepProps} />}
  </StepWrapper>
}