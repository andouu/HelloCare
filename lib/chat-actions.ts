/**
 * Shared definitions for LLM-driven assistant tools.
 * Used by both the chat API route (tool schemas) and the client (tool dispatcher).
 *
 * Tool categories:
 * - navigate: Go to any app page with optional item highlighting
 * - update_action_item: Change status, priority, or type of an action item
 * - delete_action_item: Remove an action item
 * - delete_health_note: Remove a health note
 * - update_health_note_type: Change a health note's type classification
 * - delete_appointment: Remove an appointment
 * - delete_session: Remove a past session
 * - open_health_note_recorder: Open the voice health-note recording modal
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export const NAVIGATE_PAGES = [
  "home",
  "action_items",
  "health_notes",
  "appointments",
  "past_sessions",
  "schedule_appointment",
  "doctor_visit_conversation",
] as const;

export type NavigatePage = (typeof NAVIGATE_PAGES)[number];

/** Maps each navigate page to its client-side route. */
export const PAGE_ROUTES: Record<NavigatePage, string> = {
  home: "/",
  action_items: "/action-items",
  health_notes: "/health-notes",
  appointments: "/appointments",
  past_sessions: "/past-sessions",
  schedule_appointment: "/appointments/schedule",
  doctor_visit_conversation: "/appointments/conversation",
};

// ---------------------------------------------------------------------------
// Action item enums (must match lib/firestore/actionItems.ts)
// ---------------------------------------------------------------------------

export const ACTION_ITEM_STATUS_VALUES = [
  "pending",
  "in_progress",
  "done",
  "skipped",
] as const;

export const ACTION_ITEM_PRIORITY_VALUES = [
  "low",
  "medium",
  "high",
] as const;

export const ACTION_ITEM_TYPE_VALUES = [
  "Medication",
  "Exercise",
  "Appointment",
  "Other",
] as const;

// ---------------------------------------------------------------------------
// Health note enums (must match lib/firestore/healthNotes.ts)
// ---------------------------------------------------------------------------

export const HEALTH_NOTE_TYPE_VALUES = [
  "Injury",
  "Recurring pain",
  "Temporary pain",
] as const;

// ---------------------------------------------------------------------------
// Tool registry (single source of truth for names + prompt docs)
// ---------------------------------------------------------------------------

export const CHAT_TOOL_NAMES = [
  "navigate",
  "update_action_item",
  "delete_action_item",
  "delete_health_note",
  "update_health_note_type",
  "delete_appointment",
  "delete_session",
  "open_health_note_recorder",
  "create_action_item",
  "create_health_note",
  "create_appointment",
  "create_session",
] as const;

export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number];

type ToolSpec = {
  name: ChatToolName;
  action: string;
  requiredArgs: readonly string[];
  optionalArgs?: readonly string[];
  whenToUse: readonly string[];
  avoidWhen?: readonly string[];
};

export const CHAT_TOOL_SPECS: ReadonlyArray<ToolSpec> = [
  {
    name: "navigate",
    action: "Go to a page in the app",
    requiredArgs: ["page"],
    optionalArgs: ["highlightId"],
    whenToUse: [
      "User asks to open/go to/show a section",
      "User asks to schedule an appointment (use page=schedule_appointment)",
      "User says they are at a doctor visit and want to record (use page=doctor_visit_conversation)",
    ],
    avoidWhen: [
      "Pure informational question that can be answered from context",
    ],
  },
  {
    name: "update_action_item",
    action: "Update action-item fields",
    requiredArgs: ["id"],
    optionalArgs: ["status", "priority", "type"],
    whenToUse: [
      "User asks to mark an action item done/skipped/in progress",
      "User asks to change action-item priority or type",
    ],
  },
  {
    name: "delete_action_item",
    action: "Delete an action item",
    requiredArgs: ["id"],
    whenToUse: ["User explicitly asks to remove/delete an action item"],
  },
  {
    name: "delete_health_note",
    action: "Delete a health note",
    requiredArgs: ["id"],
    whenToUse: ["User explicitly asks to remove/delete a health note"],
  },
  {
    name: "update_health_note_type",
    action: "Change health-note type",
    requiredArgs: ["id", "type"],
    whenToUse: ["User asks to reclassify a health note (injury/recurring/temporary)"],
  },
  {
    name: "delete_appointment",
    action: "Delete an appointment",
    requiredArgs: ["id"],
    whenToUse: ["User explicitly asks to cancel/delete an appointment entry"],
  },
  {
    name: "delete_session",
    action: "Delete a past session",
    requiredArgs: ["id"],
    whenToUse: ["User explicitly asks to delete a past session/visit record"],
  },
  {
    name: "open_health_note_recorder",
    action: "Open voice health-note recorder",
    requiredArgs: [],
    whenToUse: ["User asks to record a health note with microphone/voice"],
    avoidWhen: ["User asks to create a text health note (use create_health_note instead)"],
  },
  {
    name: "create_action_item",
    action: "Create an action item",
    requiredArgs: ["title"],
    optionalArgs: ["description", "type", "priority", "dueBy"],
    whenToUse: ["User asks to add/create a task, reminder, or follow-up item"],
  },
  {
    name: "create_health_note",
    action: "Create a health note (text)",
    requiredArgs: ["title", "description"],
    optionalArgs: ["type"],
    whenToUse: ["User asks to log/add a health note in text"],
    avoidWhen: ["User asks to record by voice (use open_health_note_recorder)"],
  },
  {
    name: "create_appointment",
    action: "Create an appointment",
    requiredArgs: ["appointmentTime"],
    whenToUse: ["User asks to add/create an appointment"],
  },
  {
    name: "create_session",
    action: "Create a past session record",
    requiredArgs: ["title"],
    optionalArgs: ["summary", "date"],
    whenToUse: ["User asks to log a past visit/session"],
  },
] as const;

export function buildToolCatalogForPrompt(): string {
  const lines: string[] = [];
  lines.push("## Available tools (action -> tool)");
  for (const spec of CHAT_TOOL_SPECS) {
    lines.push("");
    lines.push(`### ${spec.name}`);
    lines.push(`Action: ${spec.action}`);
    lines.push(
      `Required args: ${spec.requiredArgs.length > 0 ? spec.requiredArgs.join(", ") : "(none)"}`,
    );
    if (spec.optionalArgs && spec.optionalArgs.length > 0) {
      lines.push(`Optional args: ${spec.optionalArgs.join(", ")}`);
    }
    lines.push(`Use when: ${spec.whenToUse.join(" | ")}`);
    if (spec.avoidWhen && spec.avoidWhen.length > 0) {
      lines.push(`Do not use when: ${spec.avoidWhen.join(" | ")}`);
    }
  }

  lines.push("");
  lines.push("### Enum values");
  lines.push(`- navigate.page: ${NAVIGATE_PAGES.join(", ")}`);
  lines.push(`- action_item.status: ${ACTION_ITEM_STATUS_VALUES.join(", ")}`);
  lines.push(`- action_item.priority: ${ACTION_ITEM_PRIORITY_VALUES.join(", ")}`);
  lines.push(`- action_item.type: ${ACTION_ITEM_TYPE_VALUES.join(", ")}`);
  lines.push(`- health_note.type: ${HEALTH_NOTE_TYPE_VALUES.join(", ")}`);
  lines.push("- date/time fields: use valid ISO 8601 strings");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Zod schemas for each tool's input (used by the API route)
// ---------------------------------------------------------------------------

export const navigateSchema = z.object({
  page: z.enum(NAVIGATE_PAGES),
  highlightId: z
    .string()
    .optional()
    .describe("Optional item ID to scroll to / highlight on the destination page"),
});

export const updateActionItemSchema = z.object({
  id: z.string().describe("The action item ID to update"),
  status: z.enum(ACTION_ITEM_STATUS_VALUES).optional().describe("New status"),
  priority: z.enum(ACTION_ITEM_PRIORITY_VALUES).optional().describe("New priority"),
  type: z.enum(ACTION_ITEM_TYPE_VALUES).optional().describe("New type"),
});

export const deleteActionItemSchema = z.object({
  id: z.string().describe("The action item ID to delete"),
});

export const deleteHealthNoteSchema = z.object({
  id: z.string().describe("The health note ID to delete"),
});

export const updateHealthNoteTypeSchema = z.object({
  id: z.string().describe("The health note ID to update"),
  type: z.enum(HEALTH_NOTE_TYPE_VALUES).describe("New type classification"),
});

export const deleteAppointmentSchema = z.object({
  id: z.string().describe("The appointment ID to delete"),
});

export const deleteSessionSchema = z.object({
  id: z.string().describe("The past session ID to delete"),
});

// open_health_note_recorder has no parameters

// ---------------------------------------------------------------------------
// Create schemas
// ---------------------------------------------------------------------------

export const createActionItemSchema = z.object({
  title: z.string().describe("Short title for the action item"),
  description: z.string().optional().describe("Longer description of what to do"),
  type: z.enum(ACTION_ITEM_TYPE_VALUES).optional().describe("Category (defaults to Other)"),
  priority: z.enum(ACTION_ITEM_PRIORITY_VALUES).optional().describe("Priority level (defaults to medium)"),
  dueBy: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid ISO 8601 date string")
    .optional()
    .describe("ISO 8601 date string for the due date (defaults to 7 days from now)"),
});

export const createHealthNoteSchema = z.object({
  title: z.string().describe("Short title for the health note"),
  description: z.string().describe("Description of the health note"),
  type: z.enum(HEALTH_NOTE_TYPE_VALUES).optional().describe("Classification (defaults to Temporary pain)"),
});

export const createAppointmentSchema = z.object({
  appointmentTime: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid ISO 8601 date-time string")
    .describe("ISO 8601 date-time string for the appointment"),
});

export const createSessionSchema = z.object({
  title: z.string().describe("Short title for the past session / visit"),
  summary: z.string().optional().describe("Summary of what happened during the visit"),
  date: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid ISO 8601 date string")
    .optional()
    .describe("ISO 8601 date string for when the visit occurred (defaults to now)"),
});

// ---------------------------------------------------------------------------
// Discriminated union of all tool-call inputs (used by the client dispatcher)
// ---------------------------------------------------------------------------

export type NavigateInput = z.infer<typeof navigateSchema>;
export type UpdateActionItemInput = z.infer<typeof updateActionItemSchema>;
export type DeleteActionItemInput = z.infer<typeof deleteActionItemSchema>;
export type DeleteHealthNoteInput = z.infer<typeof deleteHealthNoteSchema>;
export type UpdateHealthNoteTypeInput = z.infer<typeof updateHealthNoteTypeSchema>;
export type DeleteAppointmentInput = z.infer<typeof deleteAppointmentSchema>;
export type DeleteSessionInput = z.infer<typeof deleteSessionSchema>;
export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;
export type CreateHealthNoteInput = z.infer<typeof createHealthNoteSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
