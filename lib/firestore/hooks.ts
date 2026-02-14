"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { debugLog } from "@/lib/logger";
import {
  readUserMetadata,
  writeUserMetadata,
  writeHealthNote,
  writeActionItem,
  writeSessionMetadata,
} from "./api";
import type { UserMetadata, UserMetadataUpdatePayload } from "./types";
import type {
  HealthNoteCreate,
  ActionItemCreate,
  SessionMetadataCreate,
} from "./types";
import type { EntryType } from "./types";

type UserMetadataState = {
  data: UserMetadata | null;
  loading: boolean;
  error: Error | null;
};

type WriteState = {
  writing: boolean;
  error: Error | null;
};

/**
 * Hook to read the authenticated user's metadata document (users/{uid}).
 * Only runs when user is signed in. Use for post-sign-in user profile/metadata.
 */
export function useUserMetadata() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [state, setState] = useState<UserMetadataState>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    if (!uid) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    const result = await readUserMetadata(db, uid);
    if (result.ok) {
      setState({ data: result.data, loading: false, error: null });
    } else {
      setState((s) => ({ ...s, loading: false, error: result.error }));
    }
  }, [uid]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const saveProfile = useCallback(
    async (payload: UserMetadataUpdatePayload) => {
      if (!uid) return { ok: false as const, error: new Error("Not signed in") };
      const result = await writeUserMetadata(db, uid, payload);
      if (result.ok) {
        setState((s) => ({ ...s, data: result.data, error: null }));
      }
      return result;
    },
    [uid]
  );

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    saveProfile,
    isAuthenticated: !!uid,
  };
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Hook to write entries to the authenticated user's subcollections.
 * Exposes save(entryType, payload) and write state.
 */
export function useSaveEntry() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [writeState, setWriteState] = useState<WriteState>({
    writing: false,
    error: null,
  });

  const save = useCallback(
    async (
      entryType: EntryType,
      payload: HealthNoteCreate | ActionItemCreate | SessionMetadataCreate
    ) => {
      if (!uid) return;
      const id = "id" in payload && payload.id ? payload.id : generateId();
      setWriteState({ writing: true, error: null });

      debugLog("Save entry: start", { entryType, id, uid });

      const dataWithId = { ...payload, id } as Record<string, unknown>;

      let result:
        | Awaited<ReturnType<typeof writeHealthNote>>
        | Awaited<ReturnType<typeof writeActionItem>>
        | Awaited<ReturnType<typeof writeSessionMetadata>>;

      switch (entryType) {
        case "healthNotes":
          result = await writeHealthNote(db, uid, dataWithId as HealthNoteCreate & { id: string });
          break;
        case "actionItems":
          result = await writeActionItem(db, uid, dataWithId as ActionItemCreate & { id: string });
          break;
        case "sessionMetadata":
          result = await writeSessionMetadata(db, uid, dataWithId as SessionMetadataCreate & { id: string });
          break;
        default:
          result = { ok: false, error: new Error(`Unknown entry type: ${entryType}`) };
      }

      if (result.ok) {
        debugLog("Save entry: success", { entryType, id });
        setWriteState({ writing: false, error: null });
      } else {
        debugLog("Save entry: failed", {
          entryType,
          id,
          error: result.error instanceof Error ? result.error.message : String(result.error),
        });
        setWriteState({ writing: false, error: result.error });
      }
    },
    [uid]
  );

  return {
    save,
    writing: writeState.writing,
    writeError: writeState.error,
    isAuthenticated: !!uid,
  };
}
