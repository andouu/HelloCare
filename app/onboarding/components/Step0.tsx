import { BaseStepProps } from "../types";

export function Step0({ onContinue }: BaseStepProps) {
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
