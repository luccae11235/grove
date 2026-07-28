import type {
  AnalyticsEventInput,
  EngagementInput,
  IdentityLink,
  SessionInput,
} from "./domain.js";
import type { ObservabilityRepository } from "./repository.js";

type Visitor = {
  consentVersion: string;
  consentedAt: Date;
  lastSeenAt: Date;
  subscriberId?: string;
};

export class MemoryObservabilityRepository implements ObservabilityRepository {
  readonly visitors = new Map<string, Visitor>();
  readonly sessions = new Map<string, { visitorId: string; input: SessionInput; lastSeenAt: Date }>();
  readonly events = new Map<string, { visitorId: string; input: AnalyticsEventInput }>();
  readonly engagements = new Map<string, EngagementInput>();
  readonly nonces = new Set<string>();

  async registerVisitor(visitorId: string, consentVersion: string, consentedAt: Date) {
    const existing = this.visitors.get(visitorId);
    this.visitors.set(visitorId, {
      consentVersion,
      consentedAt: existing?.consentedAt ?? consentedAt,
      lastSeenAt: consentedAt,
      subscriberId: existing?.subscriberId,
    });
  }

  async recordEvents(
    visitorId: string,
    session: SessionInput,
    events: AnalyticsEventInput[],
    receivedAt: Date,
  ) {
    const visitor = this.visitors.get(visitorId);
    if (!visitor) return { consentActive: false, inserted: 0 };
    visitor.lastSeenAt = receivedAt;
    this.sessions.set(session.sessionId, { visitorId, input: session, lastSeenAt: receivedAt });
    let inserted = 0;
    for (const input of events) {
      if (this.events.has(input.eventId)) continue;
      this.events.set(input.eventId, { visitorId, input });
      inserted += 1;
    }
    return { consentActive: true, inserted };
  }

  async upsertEngagement(input: EngagementInput) {
    const visitor = this.visitors.get(input.visitorId);
    if (!visitor) return false;
    visitor.lastSeenAt = input.occurredAt;
    this.sessions.set(input.session.sessionId, {
      visitorId: input.visitorId,
      input: input.session,
      lastSeenAt: input.occurredAt,
    });
    const current = this.engagements.get(input.pageViewId);
    if (current && current.visitorId !== input.visitorId) return false;
    this.engagements.set(input.pageViewId, current ? {
      ...current,
      occurredAt: current.occurredAt > input.occurredAt ? current.occurredAt : input.occurredAt,
      engagedMs: Math.max(current.engagedMs, input.engagedMs),
      maxScrollPercent: Math.max(current.maxScrollPercent, input.maxScrollPercent),
      completed: current.completed || input.completed,
    } : input);
    return true;
  }

  async linkVisitor(visitorId: string, link: IdentityLink, now: Date) {
    const visitor = this.visitors.get(visitorId);
    if (!visitor || this.nonces.has(link.nonce) || link.expiresAt <= now) return false;
    this.nonces.add(link.nonce);
    visitor.subscriberId = link.subscriberId;
    visitor.lastSeenAt = now;
    return true;
  }

  async deleteVisitor(visitorId: string) {
    this.visitors.delete(visitorId);
    for (const [id, session] of this.sessions) {
      if (session.visitorId === visitorId) this.sessions.delete(id);
    }
    for (const [id, event] of this.events) {
      if (event.visitorId === visitorId) this.events.delete(id);
    }
    for (const [id, engagement] of this.engagements) {
      if (engagement.visitorId === visitorId) this.engagements.delete(id);
    }
  }

  async inspectRetention(cutoff: Date) {
    return {
      visitors: [...this.visitors.values()].filter((item) => item.lastSeenAt < cutoff).length,
      sessions: [...this.sessions.values()].filter((item) => item.lastSeenAt < cutoff).length,
      events: [...this.events.values()].filter((item) => item.input.occurredAt < cutoff).length,
      engagements: [...this.engagements.values()].filter((item) => item.occurredAt < cutoff).length,
    };
  }

  async applyRetention(cutoff: Date) {
    const counts = await this.inspectRetention(cutoff);
    const visitorIds = [...this.visitors.entries()]
      .filter(([, visitor]) => visitor.lastSeenAt < cutoff)
      .map(([id]) => id);
    for (const id of visitorIds) await this.deleteVisitor(id);
    return counts;
  }

  async health() {}
  async close() {}
}
