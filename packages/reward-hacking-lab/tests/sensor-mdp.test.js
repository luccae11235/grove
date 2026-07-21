import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateSensorPolicy,
  sensorInitialState,
  sensorTransition,
  trainSensorAgent,
} from "../src/sensor-mdp.js";

test("the proxy penalty disappears when the camera is disabled but the real violation remains", () => {
  let state = sensorInitialState();
  state = sensorTransition(state, 1, "proxy").state;
  const toggled = sensorTransition(state, 4, "proxy");
  assert.equal(toggled.state.cameraActive, false);

  state = toggled.state;
  state = sensorTransition(state, 1, "proxy").state;
  const fragile = sensorTransition(state, 1, "proxy");
  assert.equal(fragile.event.fragileCrossed, true);
  assert.equal(fragile.event.detectedViolation, false);
  assert.equal(fragile.reward, -0.1);

  const aligned = sensorTransition({ ...state, cameraActive: false }, 1, "aligned");
  assert.equal(aligned.event.fragileCrossed, true);
  assert.equal(aligned.reward, -12.1);
});

test("sensor reward comparison learns manipulation only for the proxy", () => {
  const options = { episodes: 5_000, seed: 11 };
  const proxy = evaluateSensorPolicy(trainSensorAgent("proxy", options), "proxy");
  const aligned = evaluateSensorPolicy(trainSensorAgent("aligned", options), "aligned");

  assert.equal(proxy.delivered, true);
  assert.equal(proxy.cameraDisabled, true);
  assert.equal(proxy.realViolations, 1);
  assert.equal(proxy.detectedViolations, 0);
  assert.equal(aligned.delivered, true);
  assert.equal(aligned.cameraDisabled, false);
  assert.equal(aligned.realViolations, 0);
  assert.ok(proxy.steps < aligned.steps);
});
