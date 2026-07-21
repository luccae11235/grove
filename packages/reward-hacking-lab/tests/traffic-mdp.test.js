import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateTrafficPolicy,
  trafficTransition,
  trainTrafficAgent,
} from "../src/traffic-mdp.js";

test("the traffic proxy omits ramp delay from its reward", () => {
  const state = { queue: 8, congestion: 0 };
  const noArrival = () => 1;
  const proxy = trafficTransition(state, 0, "proxy", noArrival);
  const aligned = trafficTransition(state, 0, "aligned", noArrival);

  assert.equal(proxy.state.queue, 8);
  assert.equal(proxy.reward, 1);
  assert.equal(aligned.reward, -8);
});

test("traffic reward comparison transfers harm to the excluded ramp", () => {
  const options = { episodes: 5_000, seed: 23 };
  const evaluation = { maxSteps: 200, arrivalSeed: 99 };
  const proxy = evaluateTrafficPolicy(trainTrafficAgent("proxy", options), "proxy", evaluation);
  const aligned = evaluateTrafficPolicy(trainTrafficAgent("aligned", options), "aligned", evaluation);

  assert.ok(proxy.averageHighwaySpeed > aligned.averageHighwaySpeed);
  assert.ok(proxy.averageQueue > 6, `expected a saturated proxy queue, received ${proxy.averageQueue}`);
  assert.ok(aligned.averageQueue < 4, `expected a controlled aligned queue, received ${aligned.averageQueue}`);
  assert.equal(proxy.releasedCars, 0);
  assert.ok(aligned.releasedCars > 40);
  assert.ok(proxy.totalSystemDelay > aligned.totalSystemDelay * 2);
});
