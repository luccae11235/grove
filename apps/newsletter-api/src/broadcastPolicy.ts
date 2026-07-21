export interface BroadcastPolicyInput {
  issueId: string;
  status: "draft" | "ready" | "published";
  postalAddressReady: boolean;
  send: boolean;
  scheduledAt?: string;
  confirmation?: string;
}

export function assertBroadcastPolicy(input: BroadcastPolicyInput) {
  if (input.status === "draft") {
    throw new Error("Draft issues are preview-only. Change the issue status to ready before creating a provider draft.");
  }
  if (!input.postalAddressReady) {
    throw new Error("NEWSLETTER_POSTAL_ADDRESS must be set before creating a provider broadcast.");
  }
  if ((input.send || input.scheduledAt) && input.status !== "published") {
    throw new Error("Only published issues can be sent or scheduled.");
  }
  if ((input.send || input.scheduledAt) && input.confirmation !== `SEND:${input.issueId}`) {
    throw new Error(`Sending requires --confirm SEND:${input.issueId}.`);
  }
}

export function assertEmailArtifacts(html: string, text: string) {
  const marker = "{{{RESEND_UNSUBSCRIBE_URL}}}";
  if (!html.includes(marker) || !text.includes(marker)) {
    throw new Error("Both email artifacts must contain the Resend unsubscribe placeholder.");
  }
}
