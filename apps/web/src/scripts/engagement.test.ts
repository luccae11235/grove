import assert from "node:assert/strict";
import { test } from "node:test";
import { EngagementTracker } from "./engagement.js";

test("engagement counts only visible, focused, recently active foreground time", () => {
  let visible = true;
  let focused = true;
  const tracker = new EngagementTracker(0, () => visible, () => focused);
  assert.equal(tracker.tick(1_000).engagedMs, 1_000);
  visible = false;
  assert.equal(tracker.tick(2_000).engagedMs, 1_000);
  visible = true;
  focused = false;
  assert.equal(tracker.tick(3_000).engagedMs, 1_000);
  focused = true;
  for (let second = 4; second <= 31; second += 1) tracker.tick(second * 1_000);
  assert.equal(tracker.snapshot().engagedMs, 28_000);
  tracker.noteActivity(31_001);
  assert.equal(tracker.tick(32_001).engagedMs, 29_001);
});

test("engagement caps background gaps and completes after time plus scroll", () => {
  const tracker = new EngagementTracker(0, () => true, () => true);
  for (let second = 1; second <= 10; second += 1) tracker.tick(second * 1_000);
  tracker.noteScroll(91);
  const state = tracker.snapshot();
  assert.equal(state.engagedMs, 10_000);
  assert.equal(state.maxScrollPercent, 91);
  assert.equal(state.completed, true);

  tracker.tick(60_000);
  assert.equal(tracker.snapshot().engagedMs, 15_000);
});
