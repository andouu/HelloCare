import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { resolveLanguageTag } from "@/lib/i18n/locales";
import type { HealthNote, ActionItem, SessionMetadata, UserMetadata } from "@/lib/firestore/types";

/** Appointment data as sent in chat context (dates as ISO strings). */
export type ChatContextAppointment = {
  id: string;
  appointmentTime: string;
  scheduledOn: string;
};

/** Document summary as sent in chat context (uploadedAt as ISO string). */
export type ChatContextDocument = {
  id: string;
  summary: string;
  uploadedAt: string;
};

type ChatContext = {
  userMetadata?: UserMetadata | null;
  healthNotes?: HealthNote[];
  actionItems?: ActionItem[];
  sessionMetadata?: SessionMetadata[];
  appointments?: ChatContextAppointment[];
  documents?: ChatContextDocument[];
  languageTag?: string;
};

/** Format date in UTC so calendar dates match (e.g. action item due dates from LLM). */
function formatDate(d: Date | string, languageTag: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(languageTag, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Format date and time for appointment display. */
function formatDateTime(d: Date | string, languageTag: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(languageTag, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function buildSystemPrompt(context: ChatContext): string {
  const preferredLanguage = resolveLanguageTag(
    context.languageTag ?? context.userMetadata?.preferredLanguage,
  );
  const parts: string[] = [
    "You are a helpful, empathetic health assistant for HelloCare. You help users understand their health notes, action items, upcoming appointments, past visits, and uploaded documents. Be concise, clear, and supportive. Do not provide medical advice—encourage users to consult their care team for medical decisions.",
    "",
    "## Critical rules",
    "- Use ONLY the information provided in the context below. Do not invent, assume, or hallucinate any data—including dates, times, appointment details, or any other facts not explicitly listed.",
    "- Do NOT make up or guess appointment dates, times, or details. Only refer to appointments that appear in the \"Upcoming appointments\" section below. If that section is empty or missing, say you don't have upcoming appointment information.",
    "- If you do not have the information needed to answer a question, say so clearly—e.g. \"I don't have that information,\" \"Not available,\" or \"I don't know.\" It is better to say you don't know than to guess.",
    "- The \"Past sessions\" section (if present) contains PAST visits/sessions only. Do NOT use it to answer questions about upcoming or future appointments. Use only the \"Upcoming appointments\" section for future appointment questions.",
    "- For questions about the user's documents (labs, prescriptions, etc.), use ONLY the \"User documents\" section below. Do not invent or infer details not present in the provided document summaries.",
    `- Reply in ${preferredLanguage} unless the user asks for another language.`,
  ];

  if (context.userMetadata) {
    const { firstName, lastName, preferredLanguage } = context.userMetadata;
    parts.push(
      "",
      "## User information",
      `- Name: ${firstName} ${lastName}`,
      preferredLanguage ? `- Preferred language: ${preferredLanguage}` : ""
    );
  }

  if (context.healthNotes && context.healthNotes.length > 0) {
    parts.push(
      "",
      "## Health notes (from visits)",
      ...context.healthNotes.map(
        (n) =>
          `- [${formatDate(n.date, preferredLanguage)}] ${n.title}: ${n.description} (type: ${n.type})`
      )
    );
  }

  if (context.actionItems && context.actionItems.length > 0) {
    parts.push(
      "",
      "## Action items",
      ...context.actionItems.map((a) => {
        const med = a.medication
          ? ` (medication: ${a.medication.name} ${a.medication.dose}${a.medication.dosageUnit}, due by ${formatDate(a.dueBy, preferredLanguage)})`
          : "";
        return `- ${a.title || a.description}${med} [status: ${a.status}, due: ${formatDate(a.dueBy, preferredLanguage)}]`;
      })
    );
  }

  if (context.appointments && context.appointments.length > 0) {
    parts.push(
      "",
      "## Upcoming appointments",
      "The following are the user's scheduled appointments. Use only these when answering questions about upcoming or next appointments. Do not invent any other dates or times.",
      ...context.appointments.map(
        (a) =>
          `- ${formatDateTime(a.appointmentTime, preferredLanguage)} (scheduled on ${formatDateTime(a.scheduledOn, preferredLanguage)})`
      )
    );
  }

  if (context.sessionMetadata && context.sessionMetadata.length > 0) {
    parts.push(
      "",
      "## Past sessions only (NOT upcoming appointments)",
      "The following are past visits/sessions. Do NOT use this list for questions about upcoming or future appointments.",
      ...context.sessionMetadata.map(
        (s) =>
          `- [${formatDate(s.date, preferredLanguage)}] ${s.title}: ${s.summary || "(no summary)"}`
      )
    );
  }

  if (context.documents && context.documents.length > 0) {
    parts.push(
      "",
      "## User documents (uploaded / scanned)",
      "The following are summaries of documents the user has uploaded (e.g. lab results, prescriptions, visit notes). Use ONLY these summaries when answering questions about the user's documents. Do not invent or infer content not present in the summaries.",
      ...context.documents.map(
        (d) =>
          `- [${formatDate(d.uploadedAt, preferredLanguage)}] Document: ${d.summary}`
      )
    );
  }

  return parts.filter(Boolean).join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, context } = body as {
      messages: UIMessage[];
      context?: ChatContext;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages is required and must be an array" },
        { status: 400 }
      );
    }

    const systemPrompt = context ? buildSystemPrompt(context) : undefined;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Chat API error:", message, error);
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        ...(process.env.NODE_ENV === "development" && { detail: message }),
      },
      { status: 500 }
    );
  }
}
