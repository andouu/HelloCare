import { NextResponse } from "next/server";
import { confirmTimeslot } from "@/lib/timeslot-store";

export async function POST(request: Request) {
  console.log("[confirmTimeslot] ▶ POST received");

  let body: { label: string };
  try {
    body = await request.json();
    console.log("[confirmTimeslot] Parsed body:", JSON.stringify(body));
  } catch (err) {
    console.error("[confirmTimeslot] Failed to parse request body:", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { label } = body;

  if (!label) {
    console.error("[confirmTimeslot] Missing label in request body");
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  try {
    console.log(`[confirmTimeslot] Confirming timeslot: "${label}"`);
    await confirmTimeslot(label);
    console.log("[confirmTimeslot] ✅ Done");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[confirmTimeslot] Failed to confirm:", err);
    return NextResponse.json({ error: "Failed to confirm timeslot" }, { status: 500 });
  }
}
