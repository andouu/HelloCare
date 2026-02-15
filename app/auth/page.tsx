'use client';

import { useI18n } from "@/app/components/I18nProvider";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Brand } from "../components/Brand";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  const { t } = useI18n();
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return <div className="w-full h-screen flex flex-col items-center justify-center px-4 gap-12 tracking-tight">
    <div className="">
      <div className="flex flex-col items-center gap-2">
        <Brand />
        <div className="flex flex-col items-center leading-5">
          <span>{t("auth.tagline")}</span>
          <span className="text-neutral-400">{t("auth.signInSubtitle")}</span>
        </div>
      </div>
    </div>
    <div className="w-full flex flex-col gap-2">
      <button onClick={signInWithGoogle} className="w-full h-12 text-sm rounded-full border border-neutral-300 flex items-center justify-center gap-2 active:bg-neutral-100">
        <FcGoogle size="18" /> <span>{t("auth.continueWithGoogle")}</span>
      </button>
    </div>
  </div>;
}
