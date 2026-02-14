import { BaseStepProps } from "../types";

export function Step4({ onContinue }: BaseStepProps) {
  return <div className="flex flex-col gap-10 px-5">
    <div className="flex flex-col items-center leading-5 gap-1">
      <span>You&apos;re all set!</span>
      <span className="text-neutral-400 max-w-xs text-center">Welcome to hellocare.</span>
    </div>
    <button onClick={onContinue} className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700">Finish</button>
  </div>
}
