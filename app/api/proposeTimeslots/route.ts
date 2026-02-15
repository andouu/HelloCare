import { NextResponse } from "next/server";
import { setTimeslots, waitForConfirmation } from "@/lib/timeslot-store";

export const maxDuration = 300; // allow up to 5 min for user to confirm

export async function POST(request: Request) {
  const { timeslots }: { timeslots: string[] } = await request.json();

  setTimeslots(timeslots.map((label) => ({ label, available: false })));

  // Wait until the user confirms a timeslot from the UI
  const confirmedLabel = await waitForConfirmation();

  return NextResponse.json({ result: confirmedLabel });
}

