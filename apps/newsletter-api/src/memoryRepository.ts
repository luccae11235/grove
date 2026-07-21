import type {
  BroadcastRecord,
  PendingSubscriber,
  SubscriberStatus,
  SubscriptionRequest,
  WebhookRecord,
} from "./domain.js";
import { emptyIssueMetrics, type NewsletterRepository } from "./repository.js";

interface StoredSubscriber extends PendingSubscriber {
  status: SubscriberStatus;
  tokenHash: string | null;
  requestedAt: Date;
  providerContactId?: string;
}

export class MemoryNewsletterRepository implements NewsletterRepository {
  readonly subscribers = new Map<string, StoredSubscriber>();
  readonly events = new Map<string, WebhookRecord>();
  readonly broadcasts = new Map<string, BroadcastRecord>();

  async requestSubscription(input: SubscriptionRequest) {
    const email = input.email.toLowerCase();
    const current = this.subscribers.get(email);
    if (current?.status === "active") {
      return { shouldSendConfirmation: false };
    }
    if (
      current?.status === "pending" &&
      input.requestedAt.getTime() - current.requestedAt.getTime() < 10 * 60 * 1000
    ) {
      return { shouldSendConfirmation: false };
    }
    this.subscribers.set(email, {
      subscriberId: current?.subscriberId ?? input.subscriberId,
      email,
      locale: input.locale,
      source: input.source,
      expiresAt: input.expiresAt,
      status: "pending",
      tokenHash: input.tokenHash,
      requestedAt: input.requestedAt,
    });
    return { shouldSendConfirmation: true };
  }

  async findPendingByTokenHash(tokenHash: string, now: Date) {
    return [...this.subscribers.values()].find(
      (subscriber) =>
        subscriber.status === "pending" &&
        subscriber.tokenHash === tokenHash &&
        subscriber.expiresAt.getTime() > now.getTime(),
    ) ?? null;
  }

  async activateSubscriber(subscriberId: string, providerContactId: string, _now: Date) {
    const subscriber = [...this.subscribers.values()].find(
      (candidate) => candidate.subscriberId === subscriberId,
    );
    if (!subscriber || subscriber.status !== "pending") return false;
    subscriber.status = "active";
    subscriber.tokenHash = null;
    subscriber.providerContactId = providerContactId;
    return true;
  }

  async recordWebhook(event: WebhookRecord) {
    if (this.events.has(event.svixId)) return false;
    this.events.set(event.svixId, event);
    return true;
  }

  async markSubscriberStatusByEmail(email: string, status: SubscriberStatus) {
    const subscriber = this.subscribers.get(email.toLowerCase());
    if (subscriber) subscriber.status = status;
  }

  async recordBroadcast(record: BroadcastRecord) {
    this.broadcasts.set(record.issueId, record);
  }

  async getBroadcast(issueId: string) {
    return this.broadcasts.get(issueId) ?? null;
  }

  async markBroadcastSent(providerBroadcastId: string) {
    const broadcast = [...this.broadcasts.values()].find(
      (candidate) => candidate.providerBroadcastId === providerBroadcastId,
    );
    if (broadcast) broadcast.status = "sent";
  }

  async getIssueMetrics(issueId: string) {
    const metrics = emptyIssueMetrics(issueId);
    const broadcast = this.broadcasts.get(issueId);
    if (!broadcast) return metrics;
    metrics.providerBroadcastId = broadcast.providerBroadcastId;
    metrics.status = broadcast.status;
    const matching = [...this.events.values()].filter(
      (event) => event.providerBroadcastId === broadcast.providerBroadcastId,
    );
    const recipients = (type: string) =>
      new Set(matching.filter((event) => event.eventType === type).map((event) => event.recipientHash).filter(Boolean)).size;
    metrics.sent = recipients("email.sent");
    metrics.delivered = recipients("email.delivered");
    metrics.uniqueOpened = recipients("email.opened");
    metrics.uniqueClicked = recipients("email.clicked");
    metrics.bounced = recipients("email.bounced");
    metrics.complained = recipients("email.complained");
    metrics.suppressed = recipients("email.suppressed");
    const links = new Map<string, Set<string>>();
    for (const event of matching.filter((candidate) => candidate.eventType === "email.clicked")) {
      if (!event.clickedUrl || !event.recipientHash) continue;
      const clicks = links.get(event.clickedUrl) ?? new Set<string>();
      clicks.add(event.recipientHash);
      links.set(event.clickedUrl, clicks);
    }
    metrics.topLinks = [...links].map(([url, clicks]) => ({ url, uniqueClicks: clicks.size }))
      .sort((left, right) => right.uniqueClicks - left.uniqueClicks);
    metrics.deliveryRate = rate(metrics.delivered, metrics.sent);
    metrics.uniqueOpenRate = rate(metrics.uniqueOpened, metrics.delivered);
    metrics.uniqueClickRate = rate(metrics.uniqueClicked, metrics.delivered);
    return metrics;
  }

  async inspectRetention(pendingBefore: Date, eventsBefore: Date) {
    return {
      pendingSubscribers: [...this.subscribers.values()].filter(
        (subscriber) => subscriber.status === "pending" && subscriber.requestedAt < pendingBefore,
      ).length,
      events: [...this.events.values()].filter(
        (event) => event.eventCreatedAt < eventsBefore,
      ).length,
    };
  }

  async applyRetention(pendingBefore: Date, eventsBefore: Date) {
    const result = await this.inspectRetention(pendingBefore, eventsBefore);
    for (const [email, subscriber] of this.subscribers) {
      if (subscriber.status === "pending" && subscriber.requestedAt < pendingBefore) {
        this.subscribers.delete(email);
      }
    }
    for (const [svixId, event] of this.events) {
      if (event.eventCreatedAt < eventsBefore) this.events.delete(svixId);
    }
    return result;
  }

  async health() {}
  async close() {}
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}
