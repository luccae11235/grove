import { describe, expect, it } from "vitest";
import {
  EXTRAPOLATION_LEAF_MEANS,
  EXTRAPOLATION_POINTS,
  EXTRAPOLATION_SPLITS,
  predictExtrapolationTree,
} from "./RegressionExtrapolationPlayground";

type Point = { x: number; y: number };

// Repeat a one-dimensional squared-error CART fit independently of the visual.
function bestSplit(points: readonly Point[]) {
  const error = (group: readonly Point[]) => {
    const mean = group.reduce((sum, point) => sum + point.y, 0) / group.length;
    return group.reduce((sum, point) => sum + (point.y - mean) ** 2, 0);
  };
  return points.slice(1).map((_, index) => {
    const left = points.slice(0, index + 1);
    const right = points.slice(index + 1);
    return { threshold: (left.at(-1)!.x + right[0]!.x) / 2, score: error(left) + error(right) };
  }).sort((a, b) => a.score - b.score)[0]!.threshold;
}

describe("fixed depth-two mean-leaf CART example", () => {
  it("has a rising but non-linear dataset and reproducible fitted splits", () => {
    expect(EXTRAPOLATION_POINTS).toHaveLength(10);
    expect(EXTRAPOLATION_POINTS[2]!.y).toBeLessThan(EXTRAPOLATION_POINTS[1]!.y);
    expect(EXTRAPOLATION_POINTS.at(-1)!.y).toBeGreaterThan(EXTRAPOLATION_POINTS[0]!.y);
    const root = bestSplit(EXTRAPOLATION_POINTS);
    const left = bestSplit(EXTRAPOLATION_POINTS.filter((point) => point.x <= root));
    const right = bestSplit(EXTRAPOLATION_POINTS.filter((point) => point.x > root));
    expect([left, root, right]).toEqual(EXTRAPOLATION_SPLITS);
  });

  it("predicts the four actual leaf means, including threshold boundaries", () => {
    const limits = [-Infinity, ...EXTRAPOLATION_SPLITS, Infinity];
    for (let index = 0; index < EXTRAPOLATION_LEAF_MEANS.length; index += 1) {
      const members = EXTRAPOLATION_POINTS.filter((point) => point.x > limits[index]! && point.x <= limits[index + 1]!);
      const mean = members.reduce((sum, point) => sum + point.y, 0) / members.length;
      expect(mean).toBeCloseTo(EXTRAPOLATION_LEAF_MEANS[index]!, 8);
    }
    expect(predictExtrapolationTree(3)).toBe(2.4);
    expect(predictExtrapolationTree(3.1)).toBe(3.7);
    expect(predictExtrapolationTree(4.6)).toBe(3.7);
    expect(predictExtrapolationTree(4.7)).toBe(5.2);
    expect(predictExtrapolationTree(7)).toBe(5.2);
    expect(predictExtrapolationTree(7.1)).toBe(6.65);
  });

  it("keeps both tails flat and inside observed outcome extremes", () => {
    expect([0, 1, 8.2, 9.5, 10].map(predictExtrapolationTree)).toEqual([2.4, 2.4, 6.65, 6.65, 6.65]);
    const outcomes = EXTRAPOLATION_POINTS.map((point) => point.y);
    for (const x of [0, 2, 4, 6, 8, 10]) {
      expect(predictExtrapolationTree(x)).toBeGreaterThanOrEqual(Math.min(...outcomes));
      expect(predictExtrapolationTree(x)).toBeLessThanOrEqual(Math.max(...outcomes));
    }
  });
});
