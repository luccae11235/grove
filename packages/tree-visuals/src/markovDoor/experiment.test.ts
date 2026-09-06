import { describe, expect, it } from "vitest";
import {
  applyDoorRolloutLimit,
  createDoorEpisode,
  doorObservationIndex,
  MARKOV_DOOR,
  stepMarkovDoor,
  trainDoorPair,
} from "./experiment";

describe("door and key environment", () => {
  it("blocks the closed door and opens it after the key is collected", () => {
    const closed = stepMarkovDoor(
      { ...createDoorEpisode(), x: MARKOV_DOOR.doorX - 1 },
      1,
    ).state;
    const open = stepMarkovDoor(
      { ...createDoorEpisode(), x: MARKOV_DOOR.doorX - 1, hasKey: true },
      1,
    ).state;

    expect(closed.x).toBe(MARKOV_DOOR.doorX - 1);
    expect(open.x).toBe(MARKOV_DOOR.doorX);
  });

  it("aliases key history only in the position representation", () => {
    const before = { ...createDoorEpisode(), x: MARKOV_DOOR.startX };
    const after = { ...before, hasKey: true };

    expect(doorObservationIndex(before, "position")).toBe(
      doorObservationIndex(after, "position"),
    );
    expect(doorObservationIndex(before, "memory")).not.toBe(
      doorObservationIndex(after, "memory"),
    );
  });

  it("keeps the visualization rollout limit outside the MDP transition", () => {
    const transition = stepMarkovDoor(
      { ...createDoorEpisode(), rolloutStep: MARKOV_DOOR.maxSteps - 1 },
      0,
    ).state;

    expect(transition.done).toBe(false);
    expect(transition.outcome).toBeNull();
    expect(applyDoorRolloutLimit(transition).outcome).toBe("timeout");
  });

  it("reproduces the performance gap from the learned policies", () => {
    const result = trainDoorPair();

    expect(result.position.finalSuccessRate).toBe(0);
    expect(result.memory.finalSuccessRate).toBe(1);
    expect(result.memory.qSnapshots).toHaveLength(result.memory.curve.length);
  });
});
