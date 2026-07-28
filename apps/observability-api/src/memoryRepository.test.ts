import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { MemoryObservabilityRepository } from "./memoryRepository.js";

test("retention removes only stale visitor-level activity", async () => {
  const repository = new MemoryObservabilityRepository();
  const cutoff = new Date("2026-01-01T00:00:00.000Z");
  const stale = randomUUID();
  const current = randomUUID();
  await repository.registerVisitor(stale, "v1", new Date("2025-01-01T00:00:00.000Z"));
  await repository.registerVisitor(current, "v1", new Date("2026-06-01T00:00:00.000Z"));
  const inspected = await repository.inspectRetention(cutoff);
  assert.equal(inspected.visitors, 1);
  await repository.applyRetention(cutoff);
  assert.equal(repository.visitors.has(stale), false);
  assert.equal(repository.visitors.has(current), true);
});
