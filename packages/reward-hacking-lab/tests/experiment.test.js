import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LAYOUT,
  createEnvironment,
  evaluatePolicy,
  initialState,
  trainAgent,
  transition,
} from "../src/experiment.js";

test("the proxy rewards repeat checkpoint entries while the aligned reward does not", () => {
  const environment = createEnvironment({
    width: 3,
    height: 2,
    start: { x: 0, y: 0 },
    checkpoints: [{ x: 1, y: 0 }],
  });

  const firstProxy = transition(environment, initialState(environment), 1, "proxy");
  const leaveProxy = transition(environment, firstProxy.state, 3, "proxy");
  const repeatProxy = transition(environment, leaveProxy.state, 1, "proxy");
  assert.equal(firstProxy.reward, 0.99);
  assert.equal(repeatProxy.reward, 0.99);

  const firstAligned = transition(environment, initialState(environment), 1, "aligned");
  const leaveAligned = transition(environment, firstAligned.state, 3, "aligned");
  const repeatAligned = transition(environment, leaveAligned.state, 1, "aligned");
  assert.equal(firstAligned.reward, 0.99);
  assert.equal(repeatAligned.reward, -0.01);
});

test("progress changes only when checkpoints are reached in order", () => {
  const environment = createEnvironment({
    width: 4,
    height: 2,
    start: { x: 0, y: 0 },
    checkpoints: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
  });
  const state = { position: { x: 2, y: 0 }, nextCheckpoint: 0 };
  const outOfOrder = transition(environment, state, 1, "aligned");
  assert.equal(outOfOrder.state.nextCheckpoint, 0);
  assert.equal(outOfOrder.event.madeProgress, false);
  assert.equal(outOfOrder.reward, -0.01);
});

test("the default experiment exposes Goodhart's law with one treatment variable", () => {
  const environment = createEnvironment(DEFAULT_LAYOUT);
  const options = { episodes: 2_500, seed: 7 };
  const proxy = evaluatePolicy(environment, trainAgent(environment, "proxy", options), "proxy");
  const aligned = evaluatePolicy(environment, trainAgent(environment, "aligned", options), "aligned");

  assert.equal(proxy.completedLap, false);
  assert.ok(proxy.repeatedEntries >= 20, `expected repeated proxy entries, received ${proxy.repeatedEntries}`);
  assert.equal(aligned.completedLap, true);
  assert.ok(proxy.reward > aligned.reward, `expected proxy reward ${proxy.reward} > aligned reward ${aligned.reward}`);
});
