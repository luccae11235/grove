import { describe, expect, it } from "vitest";
import { trainDecisionStump } from "./trainDecisionStump";

const dataset = {
  features: [[0], [1], [2], [3]],
  targets: ["A", "A", "B", "B"],
  featureNames: ["Feature 1"],
};

describe("trainDecisionStump", () => {
  it("finds a perfect split and uses it for both leaves", () => {
    const result = trainDecisionStump(dataset, { criterion: "gini" });

    expect(result.bestSplit?.threshold).toBe(1.5);
    expect(result.bestSplit?.gain).toBeCloseTo(0.5);
    expect(result.model.kind).toBe("split");

    if (result.model.kind === "split") {
      expect(result.model.left.prediction).toBe("A");
      expect(result.model.right.prediction).toBe("B");
    }
  });

  it("emits a serializable, ordered training trace", () => {
    const result = trainDecisionStump(dataset, { criterion: "entropy" });
    const steps = result.trace.events.map((event) => event.step);

    expect(result.trace.version).toBe("1.0");
    expect(steps).toEqual([...steps].sort((left, right) => left - right));
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("rejects malformed datasets at the domain boundary", () => {
    expect(() =>
      trainDecisionStump({
        features: [[1], [2]],
        targets: ["A"],
        featureNames: ["Feature 1"],
      }),
    ).toThrow(/exactly one target/);
  });
});

