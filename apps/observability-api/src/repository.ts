import type {
  ArticleFeedbackInput,
  AnalyticsEventInput,
  EngagementInput,
  IdentityLink,
  RetentionCounts,
  SessionInput,
  FeedbackCreateResult,
} from "./domain.js";

export interface ObservabilityRepository {
  createFeedback(input: ArticleFeedbackInput): Promise<FeedbackCreateResult>;
  updateFeedback(input: ArticleFeedbackInput): Promise<boolean>;
  registerVisitor(visitorId: string, consentVersion: string, consentedAt: Date): Promise<void>;
  recordEvents(
    visitorId: string,
    session: SessionInput,
    events: AnalyticsEventInput[],
    receivedAt: Date,
  ): Promise<{ consentActive: boolean; inserted: number }>;
  upsertEngagement(input: EngagementInput): Promise<boolean>;
  linkVisitor(visitorId: string, link: IdentityLink, now: Date): Promise<boolean>;
  deleteVisitor(visitorId: string): Promise<void>;
  inspectRetention(cutoff: Date): Promise<RetentionCounts>;
  applyRetention(cutoff: Date): Promise<RetentionCounts>;
  health(): Promise<void>;
  close(): Promise<void>;
}
