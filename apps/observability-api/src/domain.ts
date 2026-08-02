export const eventNames = [
  "page_view",
  "lab_started",
  "lab_completed",
  "cta_clicked",
  "newsletter_signup_submitted",
  "newsletter_signup_accepted",
  "newsletter_confirmed",
  "outbound_navigation",
  "web_vital",
  "client_error",
] as const;

export type AnalyticsEventName = typeof eventNames[number];
export type Locale = "en" | "pt-BR";
export type DeviceClass = "mobile" | "tablet" | "desktop";
export type ContentType = "page" | "article" | "issue";
export type EventProperty = string | number | boolean;

export interface SessionInput {
  sessionId: string;
  startedAt: Date;
  locale: Locale;
  deviceClass: DeviceClass;
}

export interface AnalyticsEventInput {
  eventId: string;
  eventName: AnalyticsEventName;
  occurredAt: Date;
  contentType?: ContentType;
  contentId?: string;
  path: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  properties: Record<string, EventProperty>;
}

export interface EngagementInput {
  pageViewId: string;
  visitorId: string;
  session: SessionInput;
  contentType: ContentType;
  contentId?: string;
  locale: Locale;
  path: string;
  startedAt: Date;
  occurredAt: Date;
  engagedMs: number;
  maxScrollPercent: number;
  completed: boolean;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface IdentityLink {
  subscriberId: string;
  expiresAt: Date;
  nonce: string;
}

export const feedbackSentiments = ["helpful", "not_helpful"] as const;
export const feedbackReasons = [
  "clear",
  "useful_example",
  "too_difficult",
  "too_basic",
  "confusing",
  "missing_example",
] as const;

export type FeedbackSentiment = typeof feedbackSentiments[number];
export type FeedbackReason = typeof feedbackReasons[number];

export interface ArticleFeedbackInput {
  feedbackId: string;
  contentId: string;
  locale: Locale;
  path: string;
  sentiment: FeedbackSentiment;
  reason?: FeedbackReason;
  comment?: string;
  submittedAt: Date;
}

export type FeedbackCreateResult = "created" | "duplicate" | "conflict";

export interface RetentionCounts {
  visitors: number;
  sessions: number;
  events: number;
  engagements: number;
  feedbackComments: number;
}
