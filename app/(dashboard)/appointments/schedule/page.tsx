'use client';
import { Spinner } from "@/app/components/Spinner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HiCheck, HiPhone, HiPhoneMissedCall } from "react-icons/hi";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { readUserMetadata } from "@/lib/firestore";

type SchedulingStateType = "idle" | "scheduling" | "awaiting_confirmation" | "completed" | "error";

type StateTheme = "neutral" | "amber" | "blue" | "emerald" | "rose";

const STATE_STYLES: Record<
  SchedulingStateType,
  { bg: string; text: string; theme: StateTheme }
> = {
  idle: {
    bg: "bg-neutral-100",
    text: "text-neutral-900",
    theme: "neutral",
  },
  scheduling: {
    bg: "bg-amber-400",
    text: "text-white",
    theme: "amber",
  },
  awaiting_confirmation: {
    bg: "bg-blue-500",
    text: "text-white",
    theme: "blue",
  },
  completed: {
    bg: "bg-emerald-400",
    text: "text-white",
    theme: "emerald",
  },
  error: {
    bg: "bg-rose-400",
    text: "text-white",
    theme: "rose",
  },
};

const LOADING_TEXTS = [
  "Flibbertigibbeting...",
  "Quantumizing...",
  "Dilly-dallying...",
  "Bumfuzzling...",
  "Higgledy-piggledying...",
  "Skedaddling...",
  "Lollygagging...",
];

function IdleState() {
  return <span className="text-center text-sm max-w-xs">Press the button below to start the scheduling process. This screen will refresh automatically with updates.</span>;
}

function SchedulingState({ theme }: { theme: StateTheme }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_TEXTS.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-4 items-center justify-center">
      <Spinner size="lg" theme={theme} />
      <span>{LOADING_TEXTS[index]}</span>
    </div>
  );
}

type Timeslot = {
  label: string;
  available: boolean;
};

const MAX_TIMESLOTS = 3;

function AwaitingConfirmationState({
  timeslots,
  onToggleAvailability,
}: {
  timeslots: Timeslot[];
  onToggleAvailability: (label: string) => void;
}) {
  return (
    <div className="w-full px-5">
      <div className="flex flex-col items-center">
        <span>We got some time slots!</span>
        <span className="opacity-50">Do any of these times work for you?</span>
      </div>
      <div className="w-full flex flex-col gap-2 mt-10">
        {timeslots.slice(0, MAX_TIMESLOTS).map((slot) => (
          <button
            key={slot.label}
            type="button"
            onClick={() => onToggleAvailability(slot.label)}
            className={`relative w-full h-12 border rounded-full flex items-center justify-center cursor-pointer active:opacity-80 transition-opacity ${slot.available ? "bg-white text-neutral-900 border-white" : "border-white"
              }`}
          >
            {slot.label}
            {slot.available && (
              <HiCheck className="absolute right-4 w-5 h-5 text-neutral-900" />
            )}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="w-full h-12 mt-10 rounded-full flex items-center justify-center bg-neutral-900 text-white active:bg-neutral-700"
      >
        Proceed
      </button>
    </div>
  );
}

export default function SchedulePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [schedulingState, setSchedulingState] = useState<SchedulingStateType>("idle");
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  /* eslint-disable @typescript-eslint/no-unused-vars -- reserved for future implementation */
  const [error, setError] = useState<string | null>(null);
  /* eslint-enable @typescript-eslint/no-unused-vars */

  // Subscribe to the SSE timeslot stream while scheduling
  useEffect(() => {
    if (schedulingState !== "scheduling") return;

    const es = new EventSource("/api/timeslots/stream");
    es.onmessage = (e) => {
      setTimeslots(JSON.parse(e.data));
      setSchedulingState("awaiting_confirmation");
    };
    return () => es.close();
  }, [schedulingState]);

  async function startVapiCall() {
    const uid = user?.uid;
    if (!uid) { console.error("[startVapiCall] No user uid"); return; }

    const result = await readUserMetadata(db, uid);
    const phoneNumber = result.ok ? result.data?.hospitalPhoneNumber : undefined;
    if (!phoneNumber) { console.error("[startVapiCall] No phone number found for user", uid); return; }

    const firstName = (result.ok ? result.data?.firstName : "") ?? "";
    const lastName = (result.ok ? result.data?.lastName : "") ?? "";
    const fullName = `${firstName} ${lastName}`.trim();

    console.log("[startVapiCall] Calling", fullName, "at", phoneNumber);

    try {
      const res = await fetch("/api/vapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, fullName }),
      });
      if (!res.ok) {
        console.error("[startVapiCall] API returned", res.status, await res.text());
      }
    } catch (err) {
      console.error("[startVapiCall] Failed to initiate outbound call:", err);
    }
  }

  const handleToggleAvailability = (label: string) => {
    setTimeslots((prev) =>
      prev.map((slot) =>
        slot.label === label ? { ...slot, available: !slot.available } : slot
      )
    );
  };

  return (
    <div className="w-full h-screen flex flex-col gap-5 p-5">
      <div className="flex flex-col pt-45 gap-2">
        <span className="text-xl font-bold tracking-tight">Schedule Appointment</span>
        <span className="text-neutral-400 leading-5">Automatically schedule an appointment with your healthcare provider. We&apos;ll call them, and you confirm the times.</span>
      </div>
      <div
        className={`w-full h-full flex flex-col gap-4 items-center justify-center rounded-2xl transition-[background-color] duration-300 ${STATE_STYLES[schedulingState].bg} ${STATE_STYLES[schedulingState].text}`}
      >
        {schedulingState === "scheduling" ? (
          <SchedulingState theme={STATE_STYLES[schedulingState].theme} />
        ) : schedulingState === "awaiting_confirmation" ? (
          <AwaitingConfirmationState
            timeslots={timeslots}
            onToggleAvailability={handleToggleAvailability}
          />
        ) : (
          <IdleState />
        )}
      </div>
      <div className="pb-15 flex flex-col gap-3">
        <button
          onClick={() => {
            if (schedulingState === "idle") {
              setSchedulingState("scheduling");
              startVapiCall();
            } else if (schedulingState === "completed") {
              setSchedulingState("idle");
            } else {
              setSchedulingState("idle");
            }
          }}
          className={`w-full h-12 text-sm text-white rounded-full flex items-center justify-center px-5 gap-2 ${
            schedulingState === "idle"
              ? "bg-neutral-900 active:bg-neutral-700"
              : "bg-red-500 active:bg-red-400"
          }`}
        >
          {schedulingState === "idle" ? <HiPhone className="w-4 h-4" /> : <HiPhoneMissedCall className="w-4 h-4" />}
          <span className="flex-1">
            {schedulingState === "idle"
              ? "Start Scheduling Process"
              : schedulingState === "completed"
                ? "Start Process Again"
                : "Stop Scheduling Process"}
          </span>
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full h-12 text-sm text-neutral-900 rounded-full flex items-center justify-center px-5 bg-neutral-300 active:bg-neutral-400"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}