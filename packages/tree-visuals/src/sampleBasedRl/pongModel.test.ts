import { describe, expect, it } from "vitest";
import {
  advanceToNextOutcome,
  choosePongAction,
  createPongState,
  predictedPaddleIntercept,
  stepPongState,
} from "./pongModel";

describe("sample-based RL Pong model", () => {
  it("uses the ball state to choose a useful horizontal action", () => {
    const state = createPongState();

    expect(predictedPaddleIntercept(state.ball)).toBeGreaterThan(state.paddleX);
    expect(choosePongAction(state, "useful")).toBe("RIGHT");
    expect(choosePongAction(state, "weak")).toBe("LEFT");
  });

  it("keeps the useful policy ahead across deterministic play", () => {
    let useful = createPongState();
    let weak = createPongState();

    for (let step = 0; step < 7_200; step += 1) {
      useful = stepPongState(useful, "useful", 1 / 120);
      weak = stepPongState(weak, "weak", 1 / 120);
    }

    expect(useful.hits).toBeGreaterThanOrEqual(3);
    expect(useful.reward).toBeGreaterThan(weak.reward);
    expect(weak.misses).toBeGreaterThan(useful.misses);
  });

  it("can advance reduced-motion playback one outcome at a time", () => {
    const useful = advanceToNextOutcome(createPongState(), "useful");
    const weak = advanceToNextOutcome(createPongState(), "weak");

    expect(useful.hits + useful.misses).toBe(1);
    expect(weak.hits + weak.misses).toBe(1);
    expect(useful.reward).toBeGreaterThan(weak.reward);
  });
});
