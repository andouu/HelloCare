import { useI18n } from "@/app/components/I18nProvider";
import { BaseStepProps } from "../types";

export function Step3({ onContinue, formData, setFormData }: BaseStepProps) {
  const { t } = useI18n();

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
      <span>{t("onboarding.step3.title")}</span>
      <span className="text-neutral-400 max-w-xs text-center">{t("onboarding.step3.progress")}</span>
    </div>
    <div className="w-full flex flex-col gap-2">
      <input type="tel" placeholder={t("onboarding.step3.phonePlaceholder")} value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))} className="w-full h-12 font-medium text-sm rounded-full border border-neutral-300 flex items-center justify-center active:bg-neutral-100 px-4 text-center placeholder:tracking-tight" />
      <button onClick={onContinue} disabled={!isValid} className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none">
        {t("common.continue")}
      </button>
    </div>
  </div>;
}
