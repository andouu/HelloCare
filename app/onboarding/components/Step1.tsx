import { BaseStepProps } from "../types";

export function Step1({ onContinue, formData, setFormData }: BaseStepProps) {
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
