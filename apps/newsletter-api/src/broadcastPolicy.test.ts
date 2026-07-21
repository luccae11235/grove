import assert from "node:assert/strict";
import { test } from "node:test";
import { assertBroadcastPolicy, assertEmailArtifacts } from "./broadcastPolicy.js";

const readyDraft = {
  issueId: "2026-001",
  status: "ready" as const,
  postalAddressReady: true,
  send: false,
};

test("ready issues may create a provider draft", () => {
  assert.doesNotThrow(() => assertBroadcastPolicy(readyDraft));
});

test("authored drafts and missing postal addresses cannot reach the provider", () => {
  assert.throws(
    () => assertBroadcastPolicy({ ...readyDraft, status: "draft" }),
    /preview-only/,
  );
  assert.throws(
    () => assertBroadcastPolicy({ ...readyDraft, postalAddressReady: false }),
    /POSTAL_ADDRESS/,
  );
});

test("sending requires a published issue and exact issue-scoped confirmation", () => {
  assert.throws(
    () => assertBroadcastPolicy({ ...readyDraft, send: true, confirmation: "SEND:2026-001" }),
    /Only published/,
  );
  assert.throws(
    () => assertBroadcastPolicy({ ...readyDraft, status: "published", send: true }),
    /--confirm SEND:2026-001/,
  );
  assert.doesNotThrow(() => assertBroadcastPolicy({
    ...readyDraft,
    status: "published",
    send: true,
    confirmation: "SEND:2026-001",
  }));
});

test("HTML and plain text must both expose an unsubscribe marker", () => {
  const marker = "{{{RESEND_UNSUBSCRIBE_URL}}}";
  assert.doesNotThrow(() => assertEmailArtifacts(`<a href="${marker}">Leave</a>`, `Leave: ${marker}`));
  assert.throws(() => assertEmailArtifacts(`<a href="${marker}">Leave</a>`, "No footer"), /Both/);
});
