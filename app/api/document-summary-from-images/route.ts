import { NextResponse } from "next/server";
import { extractDocumentSummaryFromImages } from "@/lib/llm/queries/document-from-images";

export const maxDuration = 60; // vision LLM can be slow

export async function POST(req: Request) {
  try {
    console.log("[document-summary-from-images] POST: parsing body…");
    const body = await req.json();
    const { images } = body as { images?: unknown };

    if (!images || !Array.isArray(images)) {
      console.log("[document-summary-from-images] POST: invalid body, missing images array");
      return NextResponse.json(
        { error: "images is required and must be an array of base64 strings" },
        { status: 400 },
      );
    }

    const base64List = images.filter(
      (item: unknown): item is string => typeof item === "string" && item.length > 0,
    );
    console.log("[document-summary-from-images] POST: image count", base64List.length);

    if (base64List.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 },
      );
    }

    console.log("[document-summary-from-images] POST: calling extractDocumentSummaryFromImages…");
    const result = await extractDocumentSummaryFromImages(base64List);
    console.log("[document-summary-from-images] POST: LLM returned", {
      summaryLength: result.summary?.length ?? 0,
      hasSummary: !!result.summary,
    });

    return NextResponse.json({ summary: result.summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error.cause : undefined;
    console.error(
      "[document-summary-from-images] POST: failed —",
      message,
      cause ?? error,
    );
    return NextResponse.json(
      {
        error: "Failed to generate document summary from images",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 },
    );
  }
}
