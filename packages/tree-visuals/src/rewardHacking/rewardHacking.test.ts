import { describe, it, expect } from "vitest";
import { createEnvironment, CHECKPOINT_LAYOUT, trainCheckpointAgent, evaluateCheckpointPolicy } from "./checkpointMdp";
import { trainSensorAgent, evaluateSensorPolicy } from "./sensorMdp";
import { trainTrafficAgent, evaluateTrafficPolicy } from "./trafficMdp";

describe("reward-hacking MDP fixtures", () => {
  it("checkpoint matches", () => {
    const env = createEnvironment({ ...CHECKPOINT_LAYOUT });
    const p = evaluateCheckpointPolicy(env, trainCheckpointAgent(env, "proxy"), "proxy");
    const a = evaluateCheckpointPolicy(env, trainCheckpointAgent(env, "aligned"), "aligned");
    expect(p.reward).toBeCloseTo(44.10, 2);
    expect(p.completedLap).toBe(false);
    expect(p.repeatedEntries).toBe(44);
    expect(a.reward).toBeCloseTo(13.84, 2);
    expect(a.completedLap).toBe(true);
    expect(a.steps).toBe(16);
  });
  // The article claims the proxy agent never completes a lap for ANY legal C1
  // position. That claim is load-bearing, so it is pinned here.
  it("proxy completes no lap at any legal C1 position", () => {
    const walls = new Set(CHECKPOINT_LAYOUT.walls.map((w) => `${w.x},${w.y}`));
    const others = CHECKPOINT_LAYOUT.checkpoints.slice(1);
    const otherKeys = new Set(others.map((c) => `${c.x},${c.y}`));
    let tested = 0;
    let laps = 0;
    for (let y = 0; y < CHECKPOINT_LAYOUT.height; y += 1) {
      for (let x = 0; x < CHECKPOINT_LAYOUT.width; x += 1) {
        const key = `${x},${y}`;
        if (walls.has(key) || otherKeys.has(key) || key === "1,1") continue;
        const env = createEnvironment({
          ...CHECKPOINT_LAYOUT,
          checkpoints: [{ x, y }, ...others],
        });
        const run = evaluateCheckpointPolicy(
          env,
          trainCheckpointAgent(env, "proxy"),
          "proxy",
        );
        tested += 1;
        if (run.completedLap) laps += 1;
      }
    }
    expect(tested).toBe(42);
    expect(laps).toBe(0);
  });

  it("sensor matches", () => {
    const p = evaluateSensorPolicy(trainSensorAgent("proxy"), "proxy");
    const a = evaluateSensorPolicy(trainSensorAgent("aligned"), "aligned");
    expect(p.reward).toBeCloseTo(9.30, 2);
    expect(p.steps).toBe(7);
    expect(p.realViolations).toBe(1);
    expect(p.detectedViolations).toBe(0);
    expect(p.cameraDisabled).toBe(true);
    expect(a.reward).toBeCloseTo(9.00, 2);
    expect(a.steps).toBe(10);
    expect(a.realViolations).toBe(0);
    expect(a.cameraDisabled).toBe(false);
  });
  it("traffic matches", () => {
    const p = evaluateTrafficPolicy(trainTrafficAgent("proxy"), "proxy");
    const a = evaluateTrafficPolicy(trainTrafficAgent("aligned"), "aligned");
    expect(Math.round(p.averageHighwaySpeed * 100)).toBe(100);
    expect(p.releasedCars).toBe(0);
    expect(p.averageQueue).toBeCloseTo(7.42, 2);
    expect(Math.round(a.averageHighwaySpeed * 100)).toBe(89);
    expect(a.releasedCars).toBe(38);
    expect(a.averageQueue).toBeCloseTo(0.77, 2);
    expect(p.totalSystemDelay / a.totalSystemDelay).toBeCloseTo(2.44, 1);
  });
});
