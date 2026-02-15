/**
 * Conversation flow views.
 * To add a new view:
 * 1. Add the id to ConversationViewId and to ConversationViewPropsMap.
 * 2. Create views/MyView.tsx and export from views/index.
 * 3. Add VIEW_CARD_CLASS and VIEW_COMPONENTS entries in views/index.tsx.
 * 4. Add a case in page.tsx renderView().
 */
export type ConversationViewId = "idle" | "recording" | "summary";

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
  };
}
