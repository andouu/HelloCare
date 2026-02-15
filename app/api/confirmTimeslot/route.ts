import { NextResponse } from "next/server";
import { confirmTimeslot } from "@/lib/timeslot-store";

export async function POST(request: Request) {
  const { label }: { label: string } = await request.json();

  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  confirmTimeslot(label);

  return NextResponse.json({ ok: true });
}

