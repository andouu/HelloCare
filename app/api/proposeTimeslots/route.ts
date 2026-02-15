import { NextResponse } from "next/server";
import { setTimeslots, waitForConfirmation } from "@/lib/timeslot-store";

export const maxDuration = 120; // allow up to 2 min for user to confirm

const CONFIRMATION_TIMEOUT_MS = maxDuration * 1000;

export async function POST(request: Request) {
  console.log("[proposeTimeslots] ▶ POST received");

  let body: { timeslots: string[] };
  try {
    body = await request.json();
    console.log("[proposeTimeslots] Parsed body:", JSON.stringify(body));
  } catch (err) {
    console.error("[proposeTimeslots] Failed to parse request body:", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { timeslots } = body;

  if (!Array.isArray(timeslots)) {
    console.error("[proposeTimeslots] timeslots is not an array:", typeof timeslots);
    return NextResponse.json({ error: "timeslots must be an array" }, { status: 400 });
  }

  try {
    console.log(`[proposeTimeslots] Setting ${timeslots.length} timeslot(s)…`);
    await setTimeslots(timeslots.map((label) => ({ label, available: false })));
  } catch (err) {
    console.error("[proposeTimeslots] Failed to write timeslots to Firestore:", err);
    return NextResponse.json({ error: "Failed to store timeslots" }, { status: 500 });
  }

  // No availability offered — notify frontend and return immediately
  if (timeslots.length === 0) {
    console.log("[proposeTimeslots] Empty timeslots → returning immediately");
    return NextResponse.json({ result: "" });
  }

  try {
    console.log(`[proposeTimeslots] ⏳ Waiting up to ${CONFIRMATION_TIMEOUT_MS}ms for user confirmation…`);
    const confirmedLabel = await waitForConfirmation(CONFIRMATION_TIMEOUT_MS);
    console.log(`[proposeTimeslots] ✅ User confirmed: "${confirmedLabel}"`);
    return NextResponse.json({ result: confirmedLabel });
  } catch (err) {
    console.error("[proposeTimeslots] ⏰ Confirmation timed out:", err);
    return NextResponse.json(
      { error: "Confirmation timed out" },
      { status: 408 }
    );
  }
}
