import { describe, expect, it } from "vitest";
import {
  applyCheckpointRolloutLimit,
  checkpointObservationIndex,
  createCheckpointEpisode,
  MARKOV_CHECKPOINTS,
  stepMarkovCheckpoint,
  trainCheckpointPair,
} from "./experiment";

describe("ordered checkpoint environment", () => {
  it("rewards B only when B is the next expected checkpoint", () => {
    const beforeB = {
      ...createCheckpointEpisode(),
      x: MARKOV_CHECKPOINTS.hubX,
      y: 1,
    };
    const expectingA = stepMarkovCheckpoint(beforeB, 0);
    const expectingB = stepMarkovCheckpoint(
      { ...beforeB, nextCheckpoint: 1 },
      0,
    );

    expect(expectingA.state.x).toBe(expectingB.state.x);
    expect(expectingA.state.y).toBe(expectingB.state.y);
    expect(expectingA.reward).toBe(0);
    expect(expectingB.reward).toBe(1);
    expect(expectingB.state.nextCheckpoint).toBe(2);
  });

  it("aliases task history only in the position representation", () => {
    const expectingA = createCheckpointEpisode();
    const expectingC = { ...expectingA, nextCheckpoint: 2 };

    expect(checkpointObservationIndex(expectingA, "position")).toBe(
      checkpointObservationIndex(expectingC, "position"),
    );
    expect(checkpointObservationIndex(expectingA, "progress")).not.toBe(
      checkpointObservationIndex(expectingC, "progress"),
    );
  });

  it("keeps the visualization rollout limit outside the MDP transition", () => {
    const transition = stepMarkovCheckpoint(
      { ...createCheckpointEpisode(), rolloutStep: MARKOV_CHECKPOINTS.maxSteps - 1 },
      3,
    ).state;

    expect(transition.done).toBe(false);
    expect(transition.outcome).toBeNull();
    expect(applyCheckpointRolloutLimit(transition).outcome).toBe("timeout");
  });

  it("reproduces the completion gap from learned policies", () => {
    const result = trainCheckpointPair();

    expect(result.position.finalCompletionRate).toBe(0);
    expect(result.progress.finalCompletionRate).toBe(1);
    expect(result.progress.qSnapshots).toHaveLength(result.progress.curve.length);
  });
});
