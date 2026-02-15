/**
 * Shared AI SDK tool definitions for the LLM assistant.
 * Used by both the chat route (streaming) and voice-command route (one-shot).
 */

import { tool } from "ai";
import { z } from "zod";
import {
  navigateSchema,
  updateActionItemSchema,
  deleteActionItemSchema,
  deleteHealthNoteSchema,
  updateHealthNoteTypeSchema,
  deleteAppointmentSchema,
  deleteSessionSchema,
  createActionItemSchema,
  createHealthNoteSchema,
  createAppointmentSchema,
  createSessionSchema,
} from "@/lib/chat-actions";

/**
 * Returns the full set of assistant tools with server-side execute functions.
 * The execute functions return acknowledgment strings; actual side-effects
 * (navigation, Firestore mutations) happen client-side via useToolExecutor.
 */
export function createAssistantTools() {
  return {
    navigate: tool({
      description:
        "Open an app page when the user asks to go/show/open a section. Use highlightId only when you already have a concrete item ID from context.",
      inputSchema: navigateSchema,
      execute: async ({ page }) => `Navigated to ${page}.`,
    }),
    update_action_item: tool({
      description:
        "Update one action item by ID (status/priority/type). Use only when the user clearly asked to modify an action item.",
      inputSchema: updateActionItemSchema,
      execute: async ({ id, ...fields }) =>
        `Updated action item ${id}: ${Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(", ")}.`,
    }),
    delete_action_item: tool({
      description: "Permanently delete one action item by ID. Use only for explicit delete/remove intent.",
      inputSchema: deleteActionItemSchema,
      execute: async ({ id }) => `Deleted action item ${id}.`,
    }),
    delete_health_note: tool({
      description: "Permanently delete one health note by ID. Use only for explicit delete/remove intent.",
      inputSchema: deleteHealthNoteSchema,
      execute: async ({ id }) => `Deleted health note ${id}.`,
    }),
    update_health_note_type: tool({
      description: "Change one health note type by ID to Injury, Recurring pain, or Temporary pain.",
      inputSchema: updateHealthNoteTypeSchema,
      execute: async ({ id, type }) =>
        `Updated health note ${id} type to ${type}.`,
    }),
    delete_appointment: tool({
      description: "Permanently delete one appointment by ID. Use for explicit cancel/remove intent.",
      inputSchema: deleteAppointmentSchema,
      execute: async ({ id }) => `Deleted appointment ${id}.`,
    }),
    delete_session: tool({
      description: "Permanently delete one past session record by ID.",
      inputSchema: deleteSessionSchema,
      execute: async ({ id }) => `Deleted session ${id}.`,
    }),
    open_health_note_recorder: tool({
      description:
        "Open the voice health-note recording modal so the user can dictate a new health note.",
      inputSchema: z.object({}),
      execute: async () => "Opened health note recorder.",
    }),
    create_action_item: tool({
      description:
        "Create a new action item when the user asks to add/create a task or reminder.",
      inputSchema: createActionItemSchema,
      execute: async ({ title }) => `Created action item: ${title}.`,
    }),
    create_health_note: tool({
      description:
        "Create a text health note. Do not use for voice-recording requests (use open_health_note_recorder instead).",
      inputSchema: createHealthNoteSchema,
      execute: async ({ title }) => `Created health note: ${title}.`,
    }),
    create_appointment: tool({
      description:
        "Create a new appointment when the user asks to add one and provides a date/time.",
      inputSchema: createAppointmentSchema,
      execute: async ({ appointmentTime }) => `Created appointment for ${appointmentTime}.`,
    }),
    create_session: tool({
      description:
        "Create a past session/visit record when the user asks to log a past visit.",
      inputSchema: createSessionSchema,
      execute: async ({ title }) => `Created past session: ${title}.`,
    }),
  };
}
