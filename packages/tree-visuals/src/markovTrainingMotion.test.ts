import { describe, expect, it } from "vitest";
import { trainingFrameDelay } from "./markovTrainingMotion";

describe("trainingFrameDelay", () => {
  it("makes higher episode rates visibly faster", () => {
    expect(trainingFrameDelay(100)).toBe(80);
    expect(trainingFrameDelay(500)).toBe(36);
    expect(trainingFrameDelay(2_000)).toBe(18);
  });

  it("keeps the visual stream within usable browser timing bounds", () => {
    expect(trainingFrameDelay(0)).toBe(80);
    expect(trainingFrameDelay(Number.NaN)).toBe(80);
    expect(trainingFrameDelay(100_000)).toBe(18);
  });
});
