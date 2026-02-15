import { NextResponse } from "next/server";
import { setTimeslots, waitForConfirmation } from "@/lib/timeslot-store";

export const maxDuration = 120; // allow up to 2 min for user to confirm

const CONFIRMATION_TIMEOUT_MS = maxDuration * 1000;

export async function POST(request: Request) {
  const { timeslots }: { timeslots: string[] } = await request.json();

  setTimeslots(timeslots.map((label) => ({ label, available: false })));

  // No availability offered — notify frontend and return immediately
  if (timeslots.length === 0) {
    return NextResponse.json({ result: "" });
  }

  try {
    // Wait until the user confirms a timeslot from the UI (or timeout)
    const confirmedLabel = await waitForConfirmation(CONFIRMATION_TIMEOUT_MS);
    return NextResponse.json({ result: confirmedLabel });
  } catch {
    return NextResponse.json(
      { error: "Confirmation timed out" },
      { status: 408 }
    );
  }
}

