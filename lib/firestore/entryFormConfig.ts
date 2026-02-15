/**
 * Form field configuration for each entry type.
 * Used to render dynamic forms and validate payloads.
 * Extensible: add fields or entry types here and the form updates.
 */

import { ACTION_ITEM_PRIORITIES, ACTION_ITEM_STATUSES, ACTION_ITEM_TYPES } from "./actionItems";
import { HEALTH_NOTE_TYPES } from "./healthNotes";
import type {
  EntryType,
  HealthNoteCreate,
  ActionItemCreate,
  SessionMetadataCreate,
} from "./types";

export type FieldType = "text" | "textarea" | "date" | "datetime-local" | "select";

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  /** For type "select". */
  options?: { value: string; label: string }[];
};

export type EntryFormConfig = {
  entryType: EntryType;
  label: string;
  description?: string;
  fields: FieldConfig[];
};

const healthNoteFields: FieldConfig[] = [
  { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Lower back pain" },
  {
    name: "type",
    label: "Type",
    type: "select",
    required: true,
    options: [
      { value: "", label: "Select type…" },
      ...HEALTH_NOTE_TYPES.map(({ value, label }) => ({ value, label })),
    ],
  },
  { name: "description", label: "Description", type: "textarea", placeholder: "Notes…" },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "startedAt", label: "Started at", type: "datetime-local", required: true },
  { name: "endedAt", label: "Ended at", type: "datetime-local" },
];

const actionItemFields: FieldConfig[] = [
  { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Follow up with PT" },
  {
    name: "type",
    label: "Type",
    type: "select",
    required: true,
    options: [
      { value: "", label: "Select type…" },
      ...ACTION_ITEM_TYPES.map(({ value, label }) => ({ value, label })),
    ],
  },
  { name: "description", label: "Description", type: "textarea", placeholder: "Details…" },
  { name: "dueBy", label: "Due by", type: "datetime-local", required: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: ACTION_ITEM_STATUSES.map(({ value, label }) => ({ value, label })),
  },
  {
    name: "priority",
    label: "Priority",
    type: "select",
    options: ACTION_ITEM_PRIORITIES.map(({ value, label }) => ({ value, label })),
  },
  {
    name: "recurrence",
    label: "Recurrence",
    type: "select",
    options: [
      { value: "none", label: "None" },
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
    ],
  },
];

const sessionMetadataFields: FieldConfig[] = [
  { name: "title", label: "Session title", type: "text", required: true, placeholder: "e.g. PT Session 1" },
  { name: "summary", label: "Summary", type: "textarea", placeholder: "Session notes…" },
  { name: "date", label: "Date", type: "date", required: true },
];

export const ENTRY_FORM_CONFIGS: Record<EntryType, EntryFormConfig> = {
  healthNotes: {
    entryType: "healthNotes",
    label: "Health note",
    description: "Log pain, injury, or health events.",
    fields: healthNoteFields,
  },
  actionItems: {
    entryType: "actionItems",
    label: "Action item",
    description: "Tasks, medications, or follow-ups.",
    fields: actionItemFields,
  },
  sessionMetadata: {
    entryType: "sessionMetadata",
    label: "Session",
    description: "Session summary and metadata.",
    fields: sessionMetadataFields,
  },
};

export const ENTRY_TYPES: EntryType[] = ["healthNotes", "actionItems", "sessionMetadata"];

/**
 * Default values for each entry type (for form initial state).
 * Dates as ISO strings so we can bind to date inputs.
 */
export function getDefaultValues(entryType: EntryType): Record<string, string> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(0, 16);

  switch (entryType) {
    case "healthNotes":
      return {
        title: "",
        type: "",
        description: "",
        date: today,
        startedAt: time,
        endedAt: time,
      };
    case "actionItems":
      return {
        title: "",
        type: "",
        description: "",
        dueBy: time,
        status: "pending",
        priority: "medium",
        recurrence: "none",
      };
    case "sessionMetadata":
      return {
        title: "",
        summary: "",
        date: today,
      };
    default:
      return {};
  }
}

/**
 * Builds a create payload from form values (string record) for the given entry type.
 * Used when submitting the dynamic entry form.
 */
export function formValuesToEntryPayload(
  entryType: EntryType,
  values: Record<string, string>
): HealthNoteCreate | ActionItemCreate | SessionMetadataCreate {
  const parseDate = (v: string) => (v ? new Date(v) : new Date());

  switch (entryType) {
    case "healthNotes":
      return {
        id: "",
        title: values.title ?? "",
        type: values.type ?? "",
        description: values.description ?? "",
        date: parseDate(values.date),
        startedAt: parseDate(values.startedAt),
        endedAt: parseDate(values.endedAt),
      };
    case "actionItems":
      return {
        id: "",
        title: values.title ?? "",
        type: values.type ?? "",
        description: values.description ?? "",
        dueBy: parseDate(values.dueBy),
        status: values.status ?? "pending",
        priority: values.priority ?? "medium",
        recurrence: values.recurrence ?? "none",
      };
    case "sessionMetadata":
      return {
        id: "",
        title: values.title ?? "",
        summary: values.summary ?? "",
        date: parseDate(values.date),
        actionItemIds: [],
        documentIds: [],
      };
    default:
      throw new Error(`Unknown entry type: ${entryType}`);
  }
}
