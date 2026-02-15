#!/usr/bin/env node

/**
 * HelloCare MCP Server
 *
 * Exposes HelloCare Firestore data as MCP tools so any LLM client
 * (Cursor, Claude Desktop, etc.) can read and write health notes,
 * action items, sessions, and user profile data via chat.
 *
 * Uses Firebase Admin SDK for direct Firestore access (bypasses client
 * security rules). Set GOOGLE_APPLICATION_CREDENTIALS or
 * FIREBASE_SERVICE_ACCOUNT_KEY env var, plus HELLOCARE_USER_ID.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

// ─── Firebase Admin Initialization ───────────────────────────────────────────

function initFirebase() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (keyJson) {
    const serviceAccount = JSON.parse(keyJson) as ServiceAccount;
    return initializeApp({ credential: cert(serviceAccount) });
  }
  if (keyPath) {
    const serviceAccount = JSON.parse(
      readFileSync(keyPath, "utf-8"),
    ) as ServiceAccount;
    return initializeApp({ credential: cert(serviceAccount) });
  }

  // Falls back to Application Default Credentials (e.g. gcloud auth)
  return initializeApp();
}

const app = initFirebase();
const db = getFirestore(app);

function getUserId(): string {
  const uid = process.env.HELLOCARE_USER_ID;
  if (!uid) {
    throw new Error(
      "HELLOCARE_USER_ID environment variable is required. " +
        "Set it to your Firebase Auth UID.",
    );
  }
  return uid;
}

// ─── Firestore Helpers ───────────────────────────────────────────────────────

/** Collection paths matching the client-side schema */
const COLLECTIONS = {
  users: "users",
  healthNotes: "healthNotes",
  actionItems: "actionItems",
  sessionMetadata: "sessionMetadata",
} as const;

function userDoc(uid: string) {
  return db.collection(COLLECTIONS.users).doc(uid);
}

function healthNotesCol(uid: string) {
  return userDoc(uid).collection(COLLECTIONS.healthNotes);
}

function actionItemsCol(uid: string) {
  return userDoc(uid).collection(COLLECTIONS.actionItems);
}

function sessionMetadataCol(uid: string) {
  return userDoc(uid).collection(COLLECTIONS.sessionMetadata);
}

/** Convert Firestore Timestamp to ISO string for JSON output */
function tsToISO(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  return new Date(0).toISOString();
}

/** Generate a random document ID (matches Firestore auto-ID style) */
function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ─── MCP Server Setup ────────────────────────────────────────────────────────

const server = new McpServer({
  name: "hellocare",
  version: "1.0.0",
});

// ─── Tool: list_health_notes ─────────────────────────────────────────────────

server.tool(
  "list_health_notes",
  "List all health notes for the user. Returns title, type, description, and dates.",
  {
    type: z
      .string()
      .optional()
      .describe(
        'Filter by note type, e.g. "Injury", "Recurring pain", "Temporary pain"',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of notes to return (default 50)"),
  },
  async ({ type, limit }) => {
    const uid = getUserId();
    let query: FirebaseFirestore.Query = healthNotesCol(uid).orderBy(
      "date",
      "desc",
    );
    if (type) {
      query = query.where("type", "==", type);
    }
    query = query.limit(limit ?? 50);

    const snap = await query.get();
    const notes = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        type: d.type ?? "",
        title: d.title ?? "",
        description: d.description ?? "",
        date: tsToISO(d.date),
        startedAt: tsToISO(d.startedAt),
        endedAt: tsToISO(d.endedAt),
      };
    });

    return {
      content: [
        {
          type: "text" as const,
          text:
            notes.length === 0
              ? "No health notes found."
              : JSON.stringify(notes, null, 2),
        },
      ],
    };
  },
);

// ─── Tool: create_health_note ────────────────────────────────────────────────

server.tool(
  "create_health_note",
  "Create a new health note. Use this when the user describes a symptom, injury, or health observation.",
  {
    title: z.string().describe("Short title for the health note"),
    type: z
      .string()
      .describe(
        'Category: "Injury", "Recurring pain", "Temporary pain", "Symptom", "Observation", or similar',
      ),
    description: z.string().describe("Detailed description of the health note"),
    date: z
      .string()
      .optional()
      .describe("ISO date string for the note date (defaults to now)"),
  },
  async ({ title, type, description, date }) => {
    const uid = getUserId();
    const id = generateId();
    const now = date ? new Date(date) : new Date();

    const noteData = {
      id,
      userId: uid,
      title,
      type,
      description,
      date: Timestamp.fromDate(now),
      startedAt: Timestamp.fromDate(now),
      endedAt: Timestamp.fromDate(now),
    };

    await healthNotesCol(uid).doc(id).set(noteData);

    return {
      content: [
        {
          type: "text" as const,
          text: `Health note created successfully.\n\n${JSON.stringify(
            { id, title, type, description, date: now.toISOString() },
            null,
            2,
          )}`,
        },
      ],
    };
  },
);

// ─── Tool: list_action_items ─────────────────────────────────────────────────

server.tool(
  "list_action_items",
  "List action items (medications, exercises, appointments, etc.) for the user.",
  {
    status: z
      .string()
      .optional()
      .describe('Filter by status: "pending", "in_progress", or "done"'),
    priority: z
      .string()
      .optional()
      .describe('Filter by priority: "low", "medium", or "high"'),
    type: z
      .string()
      .optional()
      .describe(
        'Filter by type: "Medication", "Exercise", "Appointment", or "Other"',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of items to return (default 50)"),
  },
  async ({ status, priority, type, limit }) => {
    const uid = getUserId();
    let query: FirebaseFirestore.Query = actionItemsCol(uid);

    if (status) query = query.where("status", "==", status);
    if (priority) query = query.where("priority", "==", priority);
    if (type) query = query.where("type", "==", type);
    query = query.limit(limit ?? 50);

    const snap = await query.get();
    const items = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        type: d.type ?? "",
        title: d.title ?? "",
        description: d.description ?? "",
        status: d.status ?? "",
        priority: d.priority ?? "",
        recurrence: d.recurrence ?? "none",
        dueBy: tsToISO(d.dueBy),
        medication: d.medication ?? null,
      };
    });

    return {
      content: [
        {
          type: "text" as const,
          text:
            items.length === 0
              ? "No action items found."
              : JSON.stringify(items, null, 2),
        },
      ],
    };
  },
);

// ─── Tool: create_action_item ────────────────────────────────────────────────

server.tool(
  "create_action_item",
  "Create a new action item (medication, exercise, appointment reminder, or other task).",
  {
    title: z.string().describe("Short title for the action item"),
    type: z
      .string()
      .describe('Type: "Medication", "Exercise", "Appointment", or "Other"'),
    description: z.string().describe("Detailed description of the action item"),
    priority: z
      .string()
      .default("medium")
      .describe('Priority: "low", "medium", or "high"'),
    status: z
      .string()
      .default("pending")
      .describe('Initial status: "pending", "in_progress", or "done"'),
    recurrence: z
      .string()
      .default("none")
      .describe('Recurrence: "none", "daily", "weekly", or "monthly"'),
    dueBy: z
      .string()
      .optional()
      .describe("ISO date string for due date (defaults to now)"),
    medication_name: z
      .string()
      .optional()
      .describe("Medication name (only for Medication type)"),
    medication_dose: z
      .number()
      .optional()
      .describe("Medication dose amount (only for Medication type)"),
    medication_dosageUnit: z
      .string()
      .optional()
      .describe(
        'Medication dosage unit, e.g. "mg", "ml" (only for Medication type)',
      ),
    medication_count: z
      .number()
      .optional()
      .describe("Number of doses/pills (only for Medication type)"),
    medication_route: z
      .string()
      .optional()
      .describe(
        'Route of administration, e.g. "oral", "topical" (only for Medication type)',
      ),
  },
  async (params) => {
    const uid = getUserId();
    const id = generateId();
    const dueBy = params.dueBy ? new Date(params.dueBy) : new Date();

    const medication =
      params.type === "Medication" && params.medication_name
        ? {
            name: params.medication_name,
            dose: params.medication_dose ?? 0,
            dosageUnit: params.medication_dosageUnit ?? "mg",
            count: params.medication_count ?? 1,
            route: params.medication_route ?? "oral",
          }
        : undefined;

    const itemData: Record<string, unknown> = {
      id,
      userId: uid,
      title: params.title,
      type: params.type,
      description: params.description,
      status: params.status,
      priority: params.priority,
      recurrence: params.recurrence,
      dueBy: Timestamp.fromDate(dueBy),
    };

    if (medication) {
      itemData.medication = medication;
    }

    await actionItemsCol(uid).doc(id).set(itemData);

    return {
      content: [
        {
          type: "text" as const,
          text: `Action item created successfully.\n\n${JSON.stringify(
            {
              id,
              title: params.title,
              type: params.type,
              priority: params.priority,
              status: params.status,
              dueBy: dueBy.toISOString(),
              medication: medication ?? null,
            },
            null,
            2,
          )}`,
        },
      ],
    };
  },
);

// ─── Tool: update_action_item ────────────────────────────────────────────────

server.tool(
  "update_action_item",
  'Update an existing action item. Commonly used to mark items as "done" or change priority.',
  {
    id: z.string().describe("The action item ID to update"),
    status: z
      .string()
      .optional()
      .describe('New status: "pending", "in_progress", or "done"'),
    priority: z
      .string()
      .optional()
      .describe('New priority: "low", "medium", or "high"'),
    title: z.string().optional().describe("Updated title"),
    description: z.string().optional().describe("Updated description"),
    dueBy: z.string().optional().describe("Updated due date (ISO string)"),
  },
  async ({ id, status, priority, title, description, dueBy }) => {
    const uid = getUserId();
    const docRef = actionItemsCol(uid).doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Action item with ID "${id}" not found.`,
          },
        ],
        isError: true,
      };
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (dueBy !== undefined)
      updates.dueBy = Timestamp.fromDate(new Date(dueBy));

    await docRef.update(updates);

    const updated = (await docRef.get()).data();
    return {
      content: [
        {
          type: "text" as const,
          text: `Action item updated successfully.\n\n${JSON.stringify(
            {
              id,
              title: updated?.title,
              status: updated?.status,
              priority: updated?.priority,
              dueBy: tsToISO(updated?.dueBy),
            },
            null,
            2,
          )}`,
        },
      ],
    };
  },
);

// ─── Tool: list_sessions ─────────────────────────────────────────────────────

server.tool(
  "list_sessions",
  "List doctor visit session summaries, including discussion topics and action items from visits.",
  {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of sessions to return (default 20)"),
  },
  async ({ limit }) => {
    const uid = getUserId();
    const snap = await sessionMetadataCol(uid)
      .orderBy("date", "desc")
      .limit(limit ?? 20)
      .get();

    const sessions = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title ?? "",
        summary: d.summary ?? "",
        date: tsToISO(d.date),
        actionItemCount: Array.isArray(d.actionItems)
          ? d.actionItems.length
          : 0,
        documentCount: Array.isArray(d.documentIds) ? d.documentIds.length : 0,
      };
    });

    return {
      content: [
        {
          type: "text" as const,
          text:
            sessions.length === 0
              ? "No doctor visit sessions found."
              : JSON.stringify(sessions, null, 2),
        },
      ],
    };
  },
);

// ─── Tool: get_session_details ───────────────────────────────────────────────

server.tool(
  "get_session_details",
  "Get full details of a doctor visit session, including its summary and all action items.",
  {
    id: z.string().describe("The session ID to retrieve"),
  },
  async ({ id }) => {
    const uid = getUserId();
    const snap = await sessionMetadataCol(uid).doc(id).get();

    if (!snap.exists) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Session with ID "${id}" not found.`,
          },
        ],
        isError: true,
      };
    }

    const d = snap.data()!;
    const actionItems = Array.isArray(d.actionItems)
      ? d.actionItems.map((item: Record<string, unknown>) => ({
          title: item.title ?? "",
          type: item.type ?? "",
          description: item.description ?? "",
          status: item.status ?? "",
          priority: item.priority ?? "",
          dueBy: tsToISO(item.dueBy),
          medication: item.medication ?? null,
        }))
      : [];

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              id: snap.id,
              title: d.title ?? "",
              summary: d.summary ?? "",
              date: tsToISO(d.date),
              actionItems,
              documentIds: d.documentIds ?? [],
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// ─── Tool: get_user_profile ──────────────────────────────────────────────────

server.tool(
  "get_user_profile",
  "Get the user's profile information including name, language preference, and hospital phone number.",
  {},
  async () => {
    const uid = getUserId();
    const snap = await userDoc(uid).get();

    if (!snap.exists) {
      return {
        content: [
          {
            type: "text" as const,
            text: "User profile not found.",
          },
        ],
        isError: true,
      };
    }

    const d = snap.data()!;
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              id: snap.id,
              firstName: d.firstName ?? "",
              lastName: d.lastName ?? "",
              email: d.email ?? "",
              preferredLanguage: d.preferredLanguage ?? "",
              hospitalPhoneNumber: d.hospitalPhoneNumber ?? "",
              createDate: tsToISO(d.createDate),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// ─── Tool: get_health_summary ────────────────────────────────────────────────

server.tool(
  "get_health_summary",
  "Get a comprehensive summary of the user's health data: counts of notes, action items by status, and recent activity.",
  {},
  async () => {
    const uid = getUserId();

    const [notesSnap, itemsSnap, sessionsSnap, profileSnap] = await Promise.all(
      [
        healthNotesCol(uid).get(),
        actionItemsCol(uid).get(),
        sessionMetadataCol(uid).get(),
        userDoc(uid).get(),
      ],
    );

    const profile = profileSnap.data();
    const notes = notesSnap.docs.map((d) => d.data());
    const items = itemsSnap.docs.map((d) => d.data());

    const statusCounts = { pending: 0, in_progress: 0, done: 0 };
    for (const item of items) {
      const s = item.status as keyof typeof statusCounts;
      if (s in statusCounts) statusCounts[s]++;
    }

    const typeCounts: Record<string, number> = {};
    for (const item of items) {
      const t = (item.type as string) || "Other";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    const recentNotes = notes
      .sort((a, b) => {
        const aDate = a.date instanceof Timestamp ? a.date.toMillis() : 0;
        const bDate = b.date instanceof Timestamp ? b.date.toMillis() : 0;
        return bDate - aDate;
      })
      .slice(0, 5)
      .map((n) => ({
        title: n.title,
        type: n.type,
        date: tsToISO(n.date),
      }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              user: profile
                ? `${profile.firstName} ${profile.lastName}`
                : "Unknown",
              totalHealthNotes: notes.length,
              totalActionItems: items.length,
              actionItemsByStatus: statusCounts,
              actionItemsByType: typeCounts,
              totalSessions: sessionsSnap.size,
              recentHealthNotes: recentNotes,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HelloCare MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
