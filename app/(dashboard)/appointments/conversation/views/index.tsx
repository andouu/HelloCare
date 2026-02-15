'use client';

import type { ComponentType } from "react";
import type { ConversationViewId, ConversationViewPropsMap } from "../types";
import { IdleView } from "./IdleView";
import { RecordingView } from "./RecordingView";
import { SummaryView } from "./SummaryView";

export { IdleView } from "./IdleView";
export { RecordingView } from "./RecordingView";
export { SummaryView } from "./SummaryView";

/** Card wrapper class for each view (layout + theme). Add an entry when adding a new view. */
export const VIEW_CARD_CLASS: Record<ConversationViewId, string> = {
  idle: "bg-white border-neutral-200",
  recording: "bg-blue-500 border-blue-600 text-white",
  summary: "bg-white border-neutral-200 py-5",
};

/** Registry of view id → component. Add new views here. */
export const VIEW_COMPONENTS: {
  [K in ConversationViewId]: ComponentType<ConversationViewPropsMap[K]>;
} = {
  idle: IdleView,
  recording: RecordingView,
  summary: SummaryView,
};
