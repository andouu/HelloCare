import { useI18n } from "@/app/components/I18nProvider";
import { BaseStepProps } from "../types";

export function Step0({ onContinue }: BaseStepProps) {
  const { t } = useI18n();

  return <div className="flex flex-col gap-10 px-5">
    <div className="flex flex-col items-center leading-5 gap-1">
      <span>{t("onboarding.step0.title")}</span>
      <span className="text-neutral-400 max-w-xs text-center">{t("onboarding.step0.subtitle")}</span>
    </div>
    <button onClick={onContinue} className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700">
      {t("onboarding.step0.cta")}
    </button>
  </div>;
}
