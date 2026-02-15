/**
 * Shared system prompt builder for the LLM assistant.
 * Used by both the chat route (streaming) and voice-command route (one-shot).
 */

import type { HealthNote, ActionItem, SessionMetadata, UserMetadata } from "@/lib/firestore/types";
import { buildToolCatalogForPrompt } from "@/lib/chat-actions";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export type ChatContextAppointment = {
  id: string;
  appointmentTime: string;
  scheduledOn: string;
};

export type ChatContext = {
  userMetadata?: UserMetadata | null;
  healthNotes?: HealthNote[];
  actionItems?: ActionItem[];
  sessionMetadata?: SessionMetadata[];
  appointments?: ChatContextAppointment[];
};

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export function buildSystemPrompt(
  context: ChatContext,
  options?: { voiceCommand?: boolean },
): string {
  const isVoiceCommand = options?.voiceCommand ?? false;

  const parts: string[] = isVoiceCommand
    ? [
        "You are a voice-command assistant for HelloCare. The user just spoke a single command via the microphone. Your job is to immediately execute the appropriate tool(s).",
        "",
        "## Critical rules",
        "- This is a ONE-SHOT interaction with NO conversation history. You cannot ask follow-up questions because the user cannot reply. Execute the action immediately or explain why you cannot.",
        "- NEVER ask for confirmation (e.g. \"Are you sure?\"). There is no way for the user to respond. Just do it.",
        "- Use ONLY the information provided in the context below. Do not invent, assume, or hallucinate any data.",
        "- When the user's intent maps to a tool, you MUST call the tool. Your text reply should briefly describe what you did (e.g. \"Deleted your health note about knee pain.\").",
        "- NEVER claim you performed an action (created, deleted, updated, navigated, etc.) unless you actually called the corresponding tool in this response. If you did not call a tool, do not say you did.",
        "- If you cannot fulfill the request (e.g. no matching item found, ambiguous request with multiple matches), explain what went wrong and what the user should try instead.",
        "- Keep responses very short (1 sentence). This is a quick voice interaction.",
        "- You may call multiple tools in a single response when the user's request requires it.",
        "- Match items generously: if the user says \"delete my knee pain note\" and there is a health note with \"knee\" or \"knee pain\" in the title/description, use that one. Do your best to infer which item the user means.",
      ]
    : [
        "You are a helpful, empathetic health assistant for HelloCare. You help users understand their health notes, action items, and past visits. Be concise, clear, and supportive. Do not provide medical advice—encourage users to consult their care team for medical decisions.",
        "",
        "## Critical rules",
        "- Use ONLY the information provided in the context below. Do not invent, assume, or hallucinate any data.",
        "- If you do not have the information needed to answer a question, say so clearly—e.g. \"I don't have that information\" or \"I don't know.\" It is better to say you don't know than to guess.",
        "- The \"Past sessions\" section contains PAST visits/sessions only. Do NOT use it to answer questions about upcoming or future appointments.",
        "- When you call a tool, ALWAYS also include a short natural-language reply describing what you did (e.g. \"Opening your appointments now.\" or \"Done — I've marked that action item as complete.\").",
        "- NEVER claim you performed an action (created, deleted, updated, navigated, etc.) unless you actually called the corresponding tool in this response. If you did not call a tool, do not say you did.",
        "- For destructive actions (deleting items), describe what you deleted in your text reply so the user knows exactly what was removed.",
        "- You may call multiple tools in a single response when the user's request requires it (e.g. \"mark all my action items as done\").",
      ];

  // ---- User info ----------------------------------------------------------
  if (context.userMetadata) {
    const { firstName, lastName, preferredLanguage } = context.userMetadata;
    parts.push(
      "",
      "## User information",
      `- Name: ${firstName} ${lastName}`,
      preferredLanguage ? `- Preferred language: ${preferredLanguage}` : "",
    );
  }

  // ---- Health notes -------------------------------------------------------
  if (context.healthNotes && context.healthNotes.length > 0) {
    parts.push(
      "",
      "## Health notes (from visits)",
      ...context.healthNotes.map(
        (n) =>
          `- [id: ${n.id}] [${formatDate(n.date)}] ${n.title}: ${n.description} (type: ${n.type})`,
      ),
    );
  }

  // ---- Action items -------------------------------------------------------
  if (context.actionItems && context.actionItems.length > 0) {
    parts.push(
      "",
      "## Action items",
      ...context.actionItems.map((a) => {
        const med = a.medication
          ? ` (medication: ${a.medication.name} ${a.medication.dose}${a.medication.dosageUnit}, due by ${formatDate(a.dueBy)})`
          : "";
        return `- [id: ${a.id}] ${a.title || a.description}${med} [status: ${a.status}, priority: ${a.priority}, type: ${a.type}, due: ${formatDate(a.dueBy)}]`;
      }),
    );
  }

  // ---- Past sessions ------------------------------------------------------
  if (context.sessionMetadata && context.sessionMetadata.length > 0) {
    parts.push(
      "",
      "## Past sessions only (NOT upcoming appointments)",
      "The following are past visits/sessions. Do NOT use this list for questions about upcoming or future appointments.",
      ...context.sessionMetadata.map(
        (s) =>
          `- [id: ${s.id}] [${formatDate(s.date)}] ${s.title}: ${s.summary || "(no summary)"}`,
      ),
    );
  }

  // ---- Appointments -------------------------------------------------------
  if (context.appointments && context.appointments.length > 0) {
    parts.push(
      "",
      "## Upcoming appointments",
      ...context.appointments.map(
        (a) =>
          `- [id: ${a.id}] Appointment on ${formatDate(a.appointmentTime)} (scheduled ${formatDate(a.scheduledOn)})`,
      ),
    );
  }

  // ---- Tool descriptions --------------------------------------------------
  const toolCatalog = buildToolCatalogForPrompt();

  parts.push(
    "",
    toolCatalog,
    "",
    "## Tool usage guidelines",
    "- Only call tools when the user clearly intends to perform an action. For informational questions, answer from context only.",
    "- When referring to items, use the IDs from the context above—never invent IDs.",
    "- If multiple items match and the user did not specify one clearly, do not guess. Ask a clarifying question.",
    "- If exactly one item clearly matches, call the tool with that item's ID.",
    "- If the user asks to do something to \"all\" items (e.g. \"mark all action items as done\"), call the tool once per item.",
    "- When navigating, always tell the user where you're taking them.",
    "- IMPORTANT: Your text response must be truthful about what happened. Only say \"Done\", \"Deleted\", \"Created\", etc. if you actually called the tool. If you did not call a tool, say why (e.g. \"I couldn't find a matching item.\").",
  );

  return parts.filter(Boolean).join("\n");
}
