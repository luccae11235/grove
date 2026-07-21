import { Resend, type WebhookEventPayload } from "resend";

export interface ConfirmationMessage {
  email: string;
  locale: "en" | "pt-BR";
  confirmationUrl: string;
}

export interface BroadcastMessage {
  name: string;
  subject: string;
  previewText: string;
  html: string;
  text: string;
  send: boolean;
  scheduledAt?: string;
  topicId?: string;
}

export interface NewsletterProvider {
  sendConfirmation(message: ConfirmationMessage): Promise<void>;
  upsertContact(email: string): Promise<string>;
  verifyWebhook(payload: string, headers: {
    id: string;
    timestamp: string;
    signature: string;
  }): WebhookEventPayload;
  createBroadcast(message: BroadcastMessage): Promise<string>;
  updateBroadcast(providerBroadcastId: string, message: BroadcastMessage): Promise<void>;
  sendBroadcast(providerBroadcastId: string, scheduledAt?: string): Promise<void>;
}

export interface ResendProviderOptions {
  apiKey: string;
  webhookSecret: string;
  segmentId: string;
  topicId?: string;
  from: string;
  replyTo?: string;
}

export class ResendNewsletterProvider implements NewsletterProvider {
  private readonly resend: Resend;

  constructor(private readonly options: ResendProviderOptions) {
    this.resend = new Resend(options.apiKey);
  }

  async sendConfirmation(message: ConfirmationMessage) {
    const copy = message.locale === "pt-BR"
      ? {
          subject: "Confirme sua inscrição na Grove",
          heading: "Só falta confirmar",
          body: "Clique no botão abaixo para receber a newsletter semanal da Grove.",
          button: "Confirmar inscrição",
          note: "Se você não pediu esta inscrição, ignore esta mensagem.",
        }
      : {
          subject: "Confirm your Grove subscription",
          heading: "One last step",
          body: "Use the button below to join Grove's weekly newsletter.",
          button: "Confirm subscription",
          note: "If you did not request this, you can ignore this email.",
        };
    const url = escapeHtml(message.confirmationUrl);
    const response = await this.resend.emails.send({
      from: this.options.from,
      to: message.email,
      replyTo: this.options.replyTo,
      subject: copy.subject,
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#18251c"><h1>${copy.heading}</h1><p>${copy.body}</p><p><a href="${url}" style="background:#245f3d;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">${copy.button}</a></p><p style="color:#5d685f;font-size:14px">${copy.note}</p></body></html>`,
      text: `${copy.heading}\n\n${copy.body}\n\n${message.confirmationUrl}\n\n${copy.note}\n`,
      tags: [{ name: "kind", value: "confirmation" }],
    });
    assertResendResponse(response, "send confirmation email");
  }

  async upsertContact(email: string) {
    const existing = await this.resend.contacts.get({ email });
    if (existing.data) {
      const updated = await this.resend.contacts.update({ email, unsubscribed: false });
      assertResendResponse(updated, "reactivate newsletter contact");
      const memberships = await this.resend.contacts.segments.list({ email, limit: 100 });
      assertResendResponse(memberships, "list newsletter segments");
      if (!memberships.data.data.some((segment) => segment.id === this.options.segmentId)) {
        const segment = await this.resend.contacts.segments.add({
          email,
          segmentId: this.options.segmentId,
        });
        assertResendResponse(segment, "add newsletter segment");
      }
      if (this.options.topicId) {
        const topic = await this.resend.contacts.topics.update({
          email,
          topics: [{ id: this.options.topicId, subscription: "opt_in" }],
        });
        assertResendResponse(topic, "opt in newsletter topic");
      }
      return existing.data.id;
    }
    if (existing.error.name !== "not_found") {
      throw new Error(`Resend could not look up contact: ${existing.error.name}`);
    }

    const created = await this.resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: this.options.segmentId }],
      topics: this.options.topicId
        ? [{ id: this.options.topicId, subscription: "opt_in" }]
        : undefined,
    });
    assertResendResponse(created, "create newsletter contact");
    return created.data.id;
  }

  verifyWebhook(payload: string, headers: { id: string; timestamp: string; signature: string }) {
    return this.resend.webhooks.verify({
      payload,
      headers,
      webhookSecret: this.options.webhookSecret,
    });
  }

  async createBroadcast(message: BroadcastMessage) {
    const base = {
      name: message.name,
      segmentId: this.options.segmentId,
      topicId: message.topicId ?? this.options.topicId,
      from: this.options.from,
      replyTo: this.options.replyTo,
      subject: message.subject,
      previewText: message.previewText,
      html: message.html,
      text: message.text,
    };
    const response = message.send
      ? await this.resend.broadcasts.create({
          ...base,
          send: true,
          scheduledAt: message.scheduledAt,
        })
      : await this.resend.broadcasts.create({ ...base, send: false });
    assertResendResponse(response, "create newsletter broadcast");
    return response.data.id;
  }

  async updateBroadcast(providerBroadcastId: string, message: BroadcastMessage) {
    const response = await this.resend.broadcasts.update(providerBroadcastId, {
      name: message.name,
      segmentId: this.options.segmentId,
      topicId: message.topicId ?? this.options.topicId,
      from: this.options.from,
      replyTo: this.options.replyTo ? [this.options.replyTo] : undefined,
      subject: message.subject,
      previewText: message.previewText,
      html: message.html,
      text: message.text,
    });
    assertResendResponse(response, "update newsletter broadcast");
  }

  async sendBroadcast(providerBroadcastId: string, scheduledAt?: string) {
    const response = await this.resend.broadcasts.send(providerBroadcastId, { scheduledAt });
    assertResendResponse(response, scheduledAt ? "schedule newsletter broadcast" : "send newsletter broadcast");
  }
}

function assertResendResponse<T>(
  response: { data: T | null; error: { name: string } | null },
  operation: string,
): asserts response is { data: T; error: null } {
  if (!response.data || response.error) {
    throw new Error(`Unable to ${operation}: ${response.error?.name ?? "empty_response"}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
