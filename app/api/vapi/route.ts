import { NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";

const vapi = new VapiClient({ token: process.env.VAPI_PRIVATE_KEY! });

export async function POST(request: Request) {
  const { phoneNumber, fullName } = await request.json();

  if (!phoneNumber) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }

  try {
    await vapi.calls.create({
      assistantId: process.env.VAPI_ASSISTANT_ID!,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID!,
      customer: {
        number: "+1 " + phoneNumber,
      },
      assistantOverrides: {
        variableValues: {
          patient: { fullName: fullName ?? "" },
        },
      },
    });

    return NextResponse.json(null, { status: 200 });
  } catch (err) {
    console.error("[/api/vapi] Failed to create outbound call:", err);
    return NextResponse.json({ error: "Failed to create call" }, { status: 500 });
  }
}
