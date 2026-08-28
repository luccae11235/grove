import { describe, expect, it } from "vitest";
import {
  createPongEpisode,
  enumeratePongStarts,
  evaluatePongPolicy,
  pongObservationCount,
  pongObservationIndex,
  stepMarkovPong,
  trainPongPair,
} from "./experiment";

describe("Markov Pong experiment", () => {
  it("reflects from the side and top walls", () => {
    const side = stepMarkovPong(createPongEpisode(0, 4, -1, 1), 1).state;
    expect(side.ballX).toBe(1);
    expect(side.ballVx).toBe(1);
    const top = stepMarkovPong(createPongEpisode(4, 0, 1, -1), 1).state;
    expect(top.ballY).toBe(1);
    expect(top.ballVy).toBe(1);
  });

  it("returns the exact sparse reward at the paddle", () => {
    const miss = stepMarkovPong(createPongEpisode(4, 7, 1, 1), 2);
    expect(miss.reward).toBe(-1);
    const hit = stepMarkovPong(createPongEpisode(4, 7, 1, 1), 1);
    expect(hit.state.ballX).toBe(5);
    expect(hit.state.paddleX).toBe(5);
    expect(hit.reward).toBe(1);
    expect(hit.done).toBe(true);
  });

  it("only adds velocity to the Markov observation", () => {
    const left = createPongEpisode(5, 4, -1, 1);
    const right = createPongEpisode(5, 4, 1, 1);
    expect(pongObservationIndex(left, "position")).toBe(
      pongObservationIndex(right, "position"),
    );
    expect(pongObservationIndex(left, "velocity")).not.toBe(
      pongObservationIndex(right, "velocity"),
    );
    expect(pongObservationIndex(right, "velocity")).toBeLessThan(
      pongObservationCount("velocity"),
    );
  });

  it("enumerates every held-out launch exactly once", () => {
    const starts = enumeratePongStarts();
    expect(starts).toHaveLength(176);
    expect(new Set(starts.map(({ ballX, ballY, ballVx, ballVy }) =>
      `${ballX},${ballY},${ballVx},${ballVy}`,
    )).size).toBe(176);
  });

  it("produces deterministic matched training results", () => {
    const first = trainPongPair({ episodes: 250, evaluationInterval: 125 });
    const second = trainPongPair({ episodes: 250, evaluationInterval: 125 });
    expect(first.position.curve).toEqual(second.position.curve);
    expect(first.velocity.curve).toEqual(second.velocity.curve);
  });

  it("evaluates without mutating a learned policy", () => {
    const pair = trainPongPair({ episodes: 250, evaluationInterval: 125 });
    const before = new Float64Array(pair.velocity.qValues);
    evaluatePongPolicy(pair.velocity.qValues, "velocity");
    expect(pair.velocity.qValues).toEqual(before);
  });

  it("reproduces the representation gap reported in the article", () => {
    const pair = trainPongPair();
    expect(pair.velocity.finalHitRate).toBeGreaterThanOrEqual(0.98);
    expect(pair.position.finalHitRate).toBeLessThan(0.62);
    expect(pair.velocity.finalHitRate - pair.position.finalHitRate).toBeGreaterThan(0.35);
  });

  it("preserves the result across several training seeds", () => {
    const runs = [1, 2, 3, 4, 5, 6].map((seed) => trainPongPair({ seed }));
    const positionMean = runs.reduce((sum, run) => sum + run.position.finalHitRate, 0) / runs.length;
    const velocityMean = runs.reduce((sum, run) => sum + run.velocity.finalHitRate, 0) / runs.length;
    expect(positionMean).toBeLessThan(0.6);
    expect(velocityMean).toBeGreaterThanOrEqual(0.99);
  });
});
