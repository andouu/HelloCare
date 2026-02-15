/**
 * Conversation flow views.
 * To add a new view:
 * 1. Add the id to ConversationViewId and to ConversationViewPropsMap.
 * 2. Create views/MyView.tsx and export from views/index.
 * 3. Add VIEW_CARD_CLASS and VIEW_COMPONENTS entries in views/index.tsx.
 *    (Full-page views like visitSummary skip VIEW_CARD_CLASS.)
 * 4. Add a case in page.tsx renderView().
 */
export type ConversationViewId = "idle" | "recording" | "summary" | "retry" | "confirmed" | "visitSummary";

/** Views that take over the full page (no card wrapper, no shared header/footer). */
export const FULL_PAGE_VIEWS: ReadonlySet<ConversationViewId> = new Set(["visitSummary"]);

export interface ConversationViewPropsMap {
  idle: {
    onStartRecording: () => Promise<void>;
    canRecord: boolean;
    isStarting: boolean;
  };
  recording: {
    trailingWords: string;
    onStopRecording: () => Promise<void>;
    isStopping: boolean;
    canRecord: boolean;
  };
  summary: {
    segments: string[];
    languageTag: string;
    onMarkCorrect: () => void;
    onMarkIncorrect: () => void;
  };
  retry: {
    onRerecord: () => void;
    onMarkCorrect: () => void;
  };
  confirmed: {
    onContinueRecording: () => void;
    onDone: () => void;
    onMarkIncorrect: () => void;
  };
  visitSummary: {
    segments: string[];
    dateLabel: string;
    appointmentDate: Date;
    languageTag: string;
    onGoHome: () => void;
  };
}
