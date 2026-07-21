import type {
  BroadcastRecord,
  IssueMetrics,
  PendingSubscriber,
  RetentionResult,
  SubscriberStatus,
  SubscriptionRequest,
  WebhookRecord,
} from "./domain.js";

export interface NewsletterRepository {
  requestSubscription(input: SubscriptionRequest): Promise<{ shouldSendConfirmation: boolean }>;
  findPendingByTokenHash(tokenHash: string, now: Date): Promise<PendingSubscriber | null>;
  activateSubscriber(subscriberId: string, providerContactId: string, now: Date): Promise<boolean>;
  recordWebhook(event: WebhookRecord): Promise<boolean>;
  markSubscriberStatusByEmail(email: string, status: SubscriberStatus, now: Date): Promise<void>;
  recordBroadcast(record: BroadcastRecord): Promise<void>;
  getBroadcast(issueId: string): Promise<BroadcastRecord | null>;
  markBroadcastSent(providerBroadcastId: string): Promise<void>;
  getIssueMetrics(issueId: string): Promise<IssueMetrics>;
  inspectRetention(pendingBefore: Date, eventsBefore: Date): Promise<RetentionResult>;
  applyRetention(pendingBefore: Date, eventsBefore: Date): Promise<RetentionResult>;
  health(): Promise<void>;
  close(): Promise<void>;
}

export function emptyIssueMetrics(issueId: string): IssueMetrics {
  return {
    issueId,
    providerBroadcastId: null,
    status: null,
    sent: 0,
    delivered: 0,
    uniqueOpened: 0,
    uniqueClicked: 0,
    bounced: 0,
    complained: 0,
    suppressed: 0,
    deliveryRate: null,
    uniqueOpenRate: null,
    uniqueClickRate: null,
    topLinks: [],
  };
}
