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
  subscribeHealthNotes,
  subscribeActionItems,
  subscribeSessionMetadata,
  subscribeAppointments,
  subscribeDocuments,
} from "./api";
import { sortHealthNotesByCreatedDesc } from "./healthNotes";
import { sortSessionsByDateDesc } from "./sessions";
import type {
  ActionItem,
  Appointment,
  Document,
  HealthNote,
  SessionMetadata,
  UserMetadata,
  UserMetadataUpdatePayload,
  HealthNoteCreate,
  ActionItemCreate,
  SessionMetadataCreate,
  EntryType,
} from "./types";

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
      if (!uid)
        return { ok: false as const, error: new Error("Not signed in") };
      const result = await writeUserMetadata(db, uid, payload);
      if (result.ok) {
        setState((s) => ({ ...s, data: result.data, error: null }));
      }
      return result;
    },
    [uid],
  );

  /** True once we've confirmed a user document exists for this uid. */
  const isOnboarded = !!uid && !state.loading && state.data != null;

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    saveProfile,
    isAuthenticated: !!uid,
    isOnboarded,
  };
}

function generateId(): string {
  return (
    crypto.randomUUID?.() ??
    `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
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
      payload: HealthNoteCreate | ActionItemCreate | SessionMetadataCreate,
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
          result = await writeHealthNote(
            db,
            uid,
            dataWithId as HealthNoteCreate & { id: string },
          );
          break;
        case "actionItems":
          result = await writeActionItem(
            db,
            uid,
            dataWithId as ActionItemCreate & { id: string },
          );
          break;
        case "sessionMetadata":
          result = await writeSessionMetadata(
            db,
            uid,
            dataWithId as SessionMetadataCreate & { id: string },
          );
          break;
        default:
          result = {
            ok: false,
            error: new Error(`Unknown entry type: ${entryType}`),
          };
      }

      if (result.ok) {
        debugLog("Save entry: success", { entryType, id });
        setWriteState({ writing: false, error: null });
      } else {
        debugLog("Save entry: failed", {
          entryType,
          id,
          error:
            result.error instanceof Error
              ? result.error.message
              : String(result.error),
        });
        setWriteState({ writing: false, error: result.error });
      }
      return result;
    },
    [uid],
  );

  return {
    save,
    writing: writeState.writing,
    writeError: writeState.error,
    isAuthenticated: !!uid,
  };
}

type UserDataState = {
  healthNotes: HealthNote[];
  actionItems: ActionItem[];
  sessionMetadata: SessionMetadata[];
  loading: boolean;
  error: Error | null;
};

/**
 * Hook that subscribes in real-time to the authenticated user's subcollections
 * (healthNotes, actionItems, sessionMetadata) via onSnapshot.
 * Only subscribes after auth has finished loading so the Firestore SDK has a valid token.
 */
export function useUserData() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [state, setState] = useState<UserDataState>({
    healthNotes: [],
    actionItems: [],
    sessionMetadata: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (authLoading || !uid) return;
    setState((s) => ({ ...s, loading: true, error: null }));

    const received = { current: 0 };
    const markReceived = () => {
      received.current += 1;
      if (received.current === 3) {
        setState((s) => ({ ...s, loading: false }));
      }
    };

    const onError = (err: Error) =>
      setState((s) => ({ ...s, error: s.error ?? err }));

    const unsubHn = subscribeHealthNotes(db, uid, (data) => {
      setState((s) => ({ ...s, healthNotes: sortHealthNotesByCreatedDesc(data) }));
      markReceived();
    }, onError);

    const unsubAi = subscribeActionItems(db, uid, (data) => {
      setState((s) => ({ ...s, actionItems: data }));
      markReceived();
    }, onError);

    const unsubSm = subscribeSessionMetadata(db, uid, (data) => {
      setState((s) => ({ ...s, sessionMetadata: sortSessionsByDateDesc(data) }));
      markReceived();
    }, onError);

    return () => {
      unsubHn();
      unsubAi();
      unsubSm();
    };
  }, [authLoading, uid]);

  return state;
}

type SessionMetadataState = {
  sessionMetadata: SessionMetadata[];
  loading: boolean;
  error: Error | null;
};

/**
 * Real-time subscription to the authenticated user's session metadata only.
 */
export function useSessionMetadata(): SessionMetadataState {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [state, setState] = useState<SessionMetadataState>({
    sessionMetadata: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading || !uid) {
      setState((s) => ({ ...s, loading: !!authLoading }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const unsubscribe = subscribeSessionMetadata(
      db,
      uid,
      (data) =>
        setState({
          sessionMetadata: sortSessionsByDateDesc(data),
          loading: false,
          error: null,
        }),
      (err) => setState((s) => ({ ...s, error: err, loading: false }))
    );

    return unsubscribe;
  }, [authLoading, uid]);

  return state;
}

type DocumentsState = {
  documents: Document[];
  loading: boolean;
  error: Error | null;
};

/**
 * Real-time subscription to the authenticated user's documents.
 */
export function useDocuments(): DocumentsState {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading || !uid) {
      setState((s) => ({ ...s, loading: !!authLoading }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const unsubscribe = subscribeDocuments(
      db,
      uid,
      (data) => {
        const sorted = [...data].sort(
          (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
        );
        setState({ documents: sorted, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, error: err, loading: false }))
    );

    return unsubscribe;
  }, [authLoading, uid]);

  return state;
}

type ActionItemsState = {
  actionItems: ActionItem[];
  loading: boolean;
  error: Error | null;
};

/**
 * Real-time subscription to the authenticated user's action items only.
 * Returns an unsubscribe on cleanup.
 */
export function useActionItems(): ActionItemsState {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [state, setState] = useState<ActionItemsState>({
    actionItems: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading || !uid) {
      setState((s) => ({ ...s, loading: !!authLoading }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const unsubscribe = subscribeActionItems(
      db,
      uid,
      (data) => setState({ actionItems: data, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, error: err, loading: false }))
    );

    return unsubscribe;
  }, [authLoading, uid]);

  return state;
}

type AppointmentsState = {
  appointments: Appointment[];
  loading: boolean;
  error: Error | null;
};

/**
 * Real-time subscription to the authenticated user's appointments.
 */
export function useAppointments(): AppointmentsState {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [state, setState] = useState<AppointmentsState>({
    appointments: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading || !uid) {
      setState((s) => ({ ...s, loading: !!authLoading }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const unsubscribe = subscribeAppointments(
      db,
      uid,
      (data) => setState({ appointments: data, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, error: err, loading: false }))
    );

    return unsubscribe;
  }, [authLoading, uid]);

  return state;
}

type HealthNotesState = {
  healthNotes: HealthNote[];
  loading: boolean;
  error: Error | null;
};

/**
 * Real-time subscription to the authenticated user's health notes only.
 * Returns an unsubscribe on cleanup.
 */
export function useHealthNotes(): HealthNotesState {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [state, setState] = useState<HealthNotesState>({
    healthNotes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading || !uid) {
      setState((s) => ({ ...s, loading: !!authLoading }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const unsubscribe = subscribeHealthNotes(
      db,
      uid,
      (data) =>
        setState({
          healthNotes: sortHealthNotesByCreatedDesc(data),
          loading: false,
          error: null,
        }),
      (err) => setState((s) => ({ ...s, error: err, loading: false }))
    );

    return unsubscribe;
  }, [authLoading, uid]);

  return state;
}
