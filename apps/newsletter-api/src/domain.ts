export type SubscriberStatus =
  | "pending"
  | "active"
  | "unsubscribed"
  | "bounced"
  | "complained"
  | "suppressed";

export interface SubscriptionRequest {
  subscriberId: string;
  actionId: string;
  email: string;
  locale: "en" | "pt-BR";
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  tokenHash: string;
  expiresAt: Date;
  requestedAt: Date;
  cooldownBefore: Date;
}

export type SubscriptionRequestOutcome =
  | "send-confirmation"
  | "send-management"
  | "cooldown"
  | "blocked";

export interface SubscriptionActionRequest {
  actionId: string;
  email: string;
  locale: "en" | "pt-BR";
  tokenHash: string;
  expiresAt: Date;
  requestedAt: Date;
  cooldownBefore: Date;
}

export interface SubscriptionActionSubscriber {
  actionId: string;
  subscriberId: string;
  email: string;
  locale: "en" | "pt-BR";
  expiresAt: Date;
}

export interface SubscriptionActionLookup {
  subscriber: SubscriptionActionSubscriber;
  expired: boolean;
}

export interface WebhookRecord {
  svixId: string;
  eventType: string;
  eventCreatedAt: Date;
  providerEmailId?: string;
  providerBroadcastId?: string;
  recipientHash?: string;
  clickedUrl?: string;
  tags: Record<string, string>;
}

export interface BroadcastRecord {
  issueId: string;
  providerBroadcastId: string;
  status: "draft" | "scheduled" | "sent";
  subject: string;
  scheduledAt?: Date;
}

export interface IssueMetrics {
  issueId: string;
  providerBroadcastId: string | null;
  status: string | null;
  sent: number;
  delivered: number;
  uniqueOpened: number;
  uniqueClicked: number;
  bounced: number;
  complained: number;
  suppressed: number;
  deliveryRate: number | null;
  uniqueOpenRate: number | null;
  uniqueClickRate: number | null;
  topLinks: Array<{ url: string; uniqueClicks: number }>;
}

export interface RetentionResult {
  pendingSubscribers: number;
  events: number;
}
