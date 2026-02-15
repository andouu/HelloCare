'use client';

import type { ComponentType } from "react";
import type { ConversationViewId, ConversationViewPropsMap } from "../types";
import { FULL_PAGE_VIEWS } from "../types";
import { IdleView } from "./IdleView";
import { RecordingView } from "./RecordingView";
import { SummaryView } from "./SummaryView";
import { RetryView } from "./RetryView";
import { ConfirmedView } from "./ConfirmedView";
import { VisitSummaryView } from "./VisitSummaryView";

export { IdleView } from "./IdleView";
export { RecordingView } from "./RecordingView";
export { SummaryView } from "./SummaryView";
export { RetryView } from "./RetryView";
export { ConfirmedView } from "./ConfirmedView";
export { VisitSummaryView } from "./VisitSummaryView";

/** Card-wrapped view ids (excludes full-page views). */
type CardViewId = Exclude<ConversationViewId, typeof FULL_PAGE_VIEWS extends ReadonlySet<infer T> ? T : never>;

/** Card wrapper class for each card-wrapped view (layout + theme). */
export const VIEW_CARD_CLASS: Record<CardViewId, string> = {
  idle: "bg-neutral-100",
  recording: "bg-blue-500 text-white",
  summary: "bg-neutral-100 py-5",
  retry: "bg-neutral-100",
  confirmed: "bg-neutral-100",
};

/** Registry of view id -> component. Add new views here. */
export const VIEW_COMPONENTS: {
  [K in ConversationViewId]: ComponentType<ConversationViewPropsMap[K]>;
} = {
  idle: IdleView,
  recording: RecordingView,
  summary: SummaryView,
  retry: RetryView,
  confirmed: ConfirmedView,
  visitSummary: VisitSummaryView,
};
