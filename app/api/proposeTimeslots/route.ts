import { NextResponse } from "next/server";
import { setTimeslots } from "@/lib/timeslot-store";

export async function POST(request: Request) {
  const { timeslots }: { timeslots: string[] } = await request.json();

  setTimeslots(timeslots.map((label) => ({ label, available: false })));

  return NextResponse.json({ ok: true });
}
