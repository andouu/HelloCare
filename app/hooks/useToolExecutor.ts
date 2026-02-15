"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  useUserData,
  writeActionItem,
  deleteActionItem,
  deleteHealthNote,
  writeHealthNote,
  writeAppointment,
  deleteAppointment,
  writeSessionMetadata,
  deleteSessionMetadata,
} from "@/lib/firestore";
import {
  PAGE_ROUTES,
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
  type NavigateInput,
  type UpdateActionItemInput,
  type DeleteActionItemInput,
  type DeleteHealthNoteInput,
  type UpdateHealthNoteTypeInput,
  type DeleteAppointmentInput,
  type DeleteSessionInput,
  type CreateActionItemInput,
  type CreateHealthNoteInput,
  type CreateAppointmentInput,
  type CreateSessionInput,
} from "@/lib/chat-actions";

interface UseToolExecutorOptions {
  onOpenHealthNoteRecorder?: () => void;
}

export function useToolExecutor(options?: UseToolExecutorOptions) {
  const { user } = useAuth();
  const userData = useUserData();
  const router = useRouter();
  const uid = user?.uid ?? null;
  const onOpenHealthNoteRecorder = options?.onOpenHealthNoteRecorder;

  const executeToolCall = useCallback(
    async (toolName: string, input: unknown) => {
      if (!uid) return;

      const invalidArgs = (name: string, errors: string[]) => {
        console.warn(`[ToolExecutor] Ignoring invalid args for ${name}:`, errors.join("; "));
      };

      switch (toolName) {
        case "navigate": {
          const parsed = navigateSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("navigate", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { page, highlightId } = parsed.data as NavigateInput;
          const route = PAGE_ROUTES[page];
          if (route) {
            const url = highlightId ? `${route}?highlight=${highlightId}` : route;
            router.push(url);
          }
          break;
        }

        case "update_action_item": {
          const parsed = updateActionItemSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("update_action_item", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { id, ...fields } = parsed.data as UpdateActionItemInput;
          const item = userData.actionItems.find((a) => a.id === id);
          if (item) {
            await writeActionItem(db, uid, { ...item, ...fields });
          }
          break;
        }

        case "delete_action_item": {
          const parsed = deleteActionItemSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("delete_action_item", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { id } = parsed.data as DeleteActionItemInput;
          await deleteActionItem(db, uid, id);
          break;
        }

        case "delete_health_note": {
          const parsed = deleteHealthNoteSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("delete_health_note", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { id } = parsed.data as DeleteHealthNoteInput;
          await deleteHealthNote(db, uid, id);
          break;
        }

        case "update_health_note_type": {
          const parsed = updateHealthNoteTypeSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("update_health_note_type", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { id, type } = parsed.data as UpdateHealthNoteTypeInput;
          const note = userData.healthNotes.find((n) => n.id === id);
          if (note) {
            await writeHealthNote(db, uid, { ...note, type });
          }
          break;
        }

        case "delete_appointment": {
          const parsed = deleteAppointmentSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("delete_appointment", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { id } = parsed.data as DeleteAppointmentInput;
          await deleteAppointment(db, uid, id);
          break;
        }

        case "delete_session": {
          const parsed = deleteSessionSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("delete_session", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { id } = parsed.data as DeleteSessionInput;
          await deleteSessionMetadata(db, uid, id);
          break;
        }

        case "open_health_note_recorder": {
          onOpenHealthNoteRecorder?.();
          break;
        }

        case "create_action_item": {
          const parsed = createActionItemSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("create_action_item", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { title, description, type, priority, dueBy } = parsed.data as CreateActionItemInput;
          const id = crypto.randomUUID();
          await writeActionItem(db, uid, {
            id,
            title,
            description: description ?? title,
            type: type ?? "Other",
            priority: priority ?? "medium",
            status: "pending",
            recurrence: "none",
            dueBy: dueBy ? new Date(dueBy) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
          break;
        }

        case "create_health_note": {
          const parsed = createHealthNoteSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("create_health_note", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { title, description, type } = parsed.data as CreateHealthNoteInput;
          const id = crypto.randomUUID();
          const now = new Date();
          await writeHealthNote(db, uid, {
            id,
            title,
            description,
            type: type ?? "Temporary pain",
            date: now,
            startedAt: now,
            endedAt: now,
          });
          break;
        }

        case "create_appointment": {
          const parsed = createAppointmentSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("create_appointment", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { appointmentTime } = parsed.data as CreateAppointmentInput;
          const id = crypto.randomUUID();
          await writeAppointment(db, uid, {
            id,
            appointmentTime: new Date(appointmentTime),
            scheduledOn: new Date(),
          });
          break;
        }

        case "create_session": {
          const parsed = createSessionSchema.safeParse(input);
          if (!parsed.success) {
            invalidArgs("create_session", parsed.error.issues.map((issue) => issue.message));
            break;
          }
          const { title, summary, date } = parsed.data as CreateSessionInput;
          const id = crypto.randomUUID();
          await writeSessionMetadata(db, uid, {
            id,
            title,
            summary: summary ?? "",
            date: date ? new Date(date) : new Date(),
            actionItemIds: [],
            documentIds: [],
          });
          break;
        }
      }
    },
    [uid, userData.actionItems, userData.healthNotes, router, onOpenHealthNoteRecorder],
  );

  return { executeToolCall };
}
