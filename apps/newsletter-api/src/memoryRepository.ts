import type {
  BroadcastRecord,
  SubscriptionActionLookup,
  SubscriptionActionRequest,
  SubscriberStatus,
  SubscriptionRequest,
  WebhookRecord,
} from "./domain.js";
import { emptyIssueMetrics, type NewsletterRepository } from "./repository.js";

interface StoredSubscriber {
  subscriberId: string;
  email: string;
  locale: "en" | "pt-BR";
  source: string;
  status: SubscriberStatus;
  requestedAt: Date;
  providerContactId?: string;
}

interface StoredAction {
  actionId: string;
  subscriberId: string;
  actionType: "confirm" | "unsubscribe";
  tokenHash: string;
  expiresAt: Date;
  requestedAt: Date;
  usedAt?: Date;
}

export class MemoryNewsletterRepository implements NewsletterRepository {
  readonly subscribers = new Map<string, StoredSubscriber>();
  readonly actions = new Map<string, StoredAction>();
  readonly events = new Map<string, WebhookRecord>();
  readonly broadcasts = new Map<string, BroadcastRecord>();

  async requestSubscription(input: SubscriptionRequest) {
    const email = input.email.toLowerCase();
    const current = this.subscribers.get(email);
    if (current?.status === "active") return "send-management" as const;
    if (
      current &&
      ["bounced", "complained", "suppressed"].includes(current.status)
    ) return "blocked" as const;
    if (
      current?.status === "pending" &&
      [...this.actions.values()].some(
        (action) =>
          action.subscriberId === current.subscriberId &&
          action.actionType === "confirm" &&
          !action.usedAt &&
          action.requestedAt > input.cooldownBefore,
      )
    ) {
      return "cooldown" as const;
    }
    const subscriberId = current?.subscriberId ?? input.subscriberId;
    this.subscribers.set(email, {
      subscriberId,
      email,
      locale: input.locale,
      source: input.source,
      status: "pending",
      requestedAt: input.requestedAt,
      providerContactId: current?.providerContactId,
    });
    this.actions.set(input.tokenHash, {
      actionId: input.actionId,
      subscriberId,
      actionType: "confirm",
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      requestedAt: input.requestedAt,
    });
    return "send-confirmation" as const;
  }

  async requestUnsubscribe(input: SubscriptionActionRequest) {
    const subscriber = this.subscribers.get(input.email.toLowerCase());
    if (!subscriber || subscriber.status !== "active") return null;
    const recent = [...this.actions.values()].some(
      (action) =>
        action.subscriberId === subscriber.subscriberId &&
        action.actionType === "unsubscribe" &&
        !action.usedAt &&
        action.requestedAt > input.cooldownBefore,
    );
    if (recent) return null;
    this.actions.set(input.tokenHash, {
      actionId: input.actionId,
      subscriberId: subscriber.subscriberId,
      actionType: "unsubscribe",
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      requestedAt: input.requestedAt,
    });
    return subscriber.locale;
  }

  async discardUnsentAction(tokenHash: string) {
    const action = this.actions.get(tokenHash);
    if (action && !action.usedAt) this.actions.delete(tokenHash);
  }

  async findConfirmationByTokenHash(tokenHash: string, now: Date) {
    return this.findAction(tokenHash, "confirm", "pending", now);
  }

  async findUnsubscribeByTokenHash(tokenHash: string, now: Date) {
    return this.findAction(tokenHash, "unsubscribe", "active", now);
  }

  private findAction(
    tokenHash: string,
    actionType: "confirm" | "unsubscribe",
    status: "pending" | "active",
    now: Date,
  ): SubscriptionActionLookup | null {
    const action = this.actions.get(tokenHash);
    if (!action || action.actionType !== actionType || action.usedAt) return null;
    const subscriber = [...this.subscribers.values()].find(
      (candidate) => candidate.subscriberId === action.subscriberId,
    );
    if (!subscriber || subscriber.status !== status) return null;
    return {
      subscriber: {
        actionId: action.actionId,
        subscriberId: subscriber.subscriberId,
        email: subscriber.email,
        locale: subscriber.locale,
        expiresAt: action.expiresAt,
      },
      expired: action.expiresAt.getTime() <= now.getTime(),
    };
  }

  async activateSubscriber(
    subscriberId: string,
    actionId: string,
    providerContactId: string,
    now: Date,
  ) {
    const subscriber = [...this.subscribers.values()].find(
      (candidate) => candidate.subscriberId === subscriberId,
    );
    const action = [...this.actions.values()].find(
      (candidate) =>
        candidate.actionId === actionId &&
        candidate.subscriberId === subscriberId &&
        candidate.actionType === "confirm",
    );
    if (
      !subscriber ||
      subscriber.status !== "pending" ||
      !action ||
      action.usedAt ||
      action.expiresAt <= now
    ) return false;
    subscriber.status = "active";
    subscriber.providerContactId = providerContactId;
    action.usedAt = now;
    return true;
  }

  async unsubscribeSubscriber(subscriberId: string, actionId: string, now: Date) {
    const subscriber = [...this.subscribers.values()].find(
      (candidate) => candidate.subscriberId === subscriberId,
    );
    const action = [...this.actions.values()].find(
      (candidate) =>
        candidate.actionId === actionId &&
        candidate.subscriberId === subscriberId &&
        candidate.actionType === "unsubscribe",
    );
    if (
      !subscriber ||
      subscriber.status !== "active" ||
      !action ||
      action.usedAt ||
      action.expiresAt <= now
    ) return false;
    subscriber.status = "unsubscribed";
    action.usedAt = now;
    return true;
  }

  async recordWebhook(event: WebhookRecord) {
    if (this.events.has(event.svixId)) return false;
    this.events.set(event.svixId, event);
    return true;
  }

  async markSubscriberStatusByEmail(email: string, status: SubscriberStatus, _now: Date) {
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
    const subscriberIds = new Set([...this.subscribers.values()].map(({ subscriberId }) => subscriberId));
    for (const [tokenHash, action] of this.actions) {
      if (!subscriberIds.has(action.subscriberId) || action.expiresAt < pendingBefore) {
        this.actions.delete(tokenHash);
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
