import { NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";

const vapi = new VapiClient({ token: process.env.VAPI_PRIVATE_KEY! });

export async function POST(request: Request) {
  const { phoneNumber } = await request.json();

  if (!phoneNumber) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }

  await vapi.calls.create({
    assistantId: process.env.VAPI_ASSISTANT_ID!,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID!,
    customer: {
      number: "+1 " + phoneNumber,
    },
  });

  return NextResponse.json(null, { status: 200 });
}
