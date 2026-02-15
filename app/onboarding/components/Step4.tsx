import { useI18n } from "@/app/components/I18nProvider";
import { Spinner } from "@/app/components/Spinner";
import { Step4Props } from "../types";

export function Step4({ onContinue, saving, saveError }: Step4Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-10 px-5">
      <div className="flex flex-col items-center leading-5 gap-1">
        <span>{t("onboarding.step4.title")}</span>
        <span className="text-neutral-400 max-w-xs text-center">{t("onboarding.step4.subtitle")}</span>
      </div>
      {saveError && (
        <p className="text-sm text-red-600 text-center">{saveError}</p>
      )}
      <button
        onClick={onContinue}
        disabled={saving}
        className="w-full h-12 font-semibold text-sm text-white bg-neutral-900 rounded-full flex items-center justify-center active:bg-neutral-700 disabled:opacity-50 disabled:pointer-events-none"
      >
        {saving ? <Spinner size="sm" /> : t("common.finish")}
      </button>
    </div>
  );
}
