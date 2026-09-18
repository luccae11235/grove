import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE_PRESETS,
  BUILDER_DATASETS,
  BUILDER_POINTS,
  CART_ARCHITECTURE,
  SOFT_TREE_LEFT_VALUE,
  SOFT_TREE_RIGHT_VALUE,
  architectureComplexity,
  architectureRules,
  createDecisionSurface,
  predictArchitecture,
  sigmoid,
  softRoutingPrediction,
  type TreeArchitecture,
} from "./model";

describe("the depth-one soft-routing tree", () => {
  it("is an exact hard CART split when temperature is zero", () => {
    expect(softRoutingPrediction(-0.01, 0)).toEqual({
      pLeft: 1,
      pRight: 0,
      prediction: SOFT_TREE_LEFT_VALUE,
      hard: true,
    });
    expect(softRoutingPrediction(0, 0)).toEqual({
      pLeft: 0,
      pRight: 1,
      prediction: SOFT_TREE_RIGHT_VALUE,
      hard: true,
    });
  });

  it("splits its weight evenly at the threshold for every positive temperature", () => {
    for (const temperature of [0.1, 0.5, 1, 2]) {
      const result = softRoutingPrediction(0, temperature);
      expect(result.pLeft).toBe(0.5);
      expect(result.pRight).toBe(0.5);
      expect(result.prediction).toBe(5);
      expect(result.hard).toBe(false);
    }
  });

  it("moves probability and prediction smoothly from the left leaf to the right", () => {
    const results = [-3, -1.5, 0, 1.5, 3].map((x) => softRoutingPrediction(x, 0.7));

    expect(results.every((result) => result.pLeft + result.pRight === 1)).toBe(true);
    expect(results.every((result) => result.prediction >= SOFT_TREE_LEFT_VALUE)).toBe(true);
    expect(results.every((result) => result.prediction <= SOFT_TREE_RIGHT_VALUE)).toBe(true);
    expect(results.every((result, index) => (
      index === 0 || result.prediction > results[index - 1].prediction
    ))).toBe(true);
  });

  it("keeps the sigmoid finite for large positive and negative scores", () => {
    expect(sigmoid(-1_000)).toBe(0);
    expect(sigmoid(1_000)).toBe(1);
  });
});

describe("the deterministic architecture builder", () => {
  const allArchitectures: TreeArchitecture[] = [
    ...ARCHITECTURE_PRESETS.map((preset) => preset.architecture),
    {
      split: "oblique",
      routing: "hard",
      rules: "shared-by-depth",
      leaves: "linear",
    },
  ];

  it("offers three deterministic, balanced datasets with denser samples", () => {
    expect(BUILDER_DATASETS.map((dataset) => dataset.id)).toEqual([
      "diagonal",
      "xor",
      "offset-steps",
    ]);
    expect(BUILDER_POINTS).toBe(BUILDER_DATASETS[0].points);

    for (const dataset of BUILDER_DATASETS) {
      expect(dataset.points).toHaveLength(36);
      expect(dataset.points.filter((point) => point.label === 0)).toHaveLength(18);
      expect(dataset.points.filter((point) => point.label === 1)).toHaveLength(18);
      expect(new Set(dataset.points.map((point) => point.id)).size).toBe(36);
    }
  });

  it("shares exactly the second-depth rule in the oblivious architecture", () => {
    const shared = architectureRules({
      ...CART_ARCHITECTURE,
      rules: "shared-by-depth",
    });
    const independent = architectureRules(CART_ARCHITECTURE);

    expect(shared.left).toEqual(shared.right);
    expect(shared.root).not.toEqual(shared.left);
    expect(independent.left).not.toEqual(independent.right);
  });

  it("produces normalized leaf weights and bounded predictions for every variant", () => {
    for (const dataset of BUILDER_DATASETS) {
      for (const architecture of allArchitectures) {
        for (const point of dataset.points) {
          const result = predictArchitecture(architecture, point.x1, point.x2, dataset.id);
          expect(result.leafWeights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
          expect(result.leafWeights.every((weight) => weight >= 0 && weight <= 1)).toBe(true);
          expect(result.prediction).toBeGreaterThanOrEqual(0);
          expect(result.prediction).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("sends hard-routed observations to exactly one leaf", () => {
    const result = predictArchitecture(CART_ARCHITECTURE, -0.8, 0.4);
    expect(result.leafWeights.filter((weight) => weight === 1)).toHaveLength(1);
    expect(result.leafWeights.filter((weight) => weight === 0)).toHaveLength(3);
  });

  it("makes multiple paths contribute under soft routing", () => {
    const result = predictArchitecture(
      { ...CART_ARCHITECTURE, routing: "soft" },
      0,
      0,
    );
    expect(result.leafWeights.every((weight) => weight > 0)).toBe(true);
  });

  it("counts distinct rules and per-observation evaluations without implying fitted parameters", () => {
    expect(architectureComplexity(CART_ARCHITECTURE)).toEqual({
      distinctRules: 3,
      nodeEvaluations: 2,
    });
    expect(architectureComplexity(ARCHITECTURE_PRESETS[1].architecture)).toMatchObject({
      distinctRules: 3,
      nodeEvaluations: 3,
    });
    expect(architectureComplexity(ARCHITECTURE_PRESETS[2].architecture)).toMatchObject({
      distinctRules: 2,
      nodeEvaluations: 2,
    });
    expect(architectureComplexity(ARCHITECTURE_PRESETS[3].architecture)).toEqual({
      distinctRules: 3,
      nodeEvaluations: 3,
    });
  });

  it("regenerates the same complete surface from the same choices", () => {
    const first = createDecisionSurface(ARCHITECTURE_PRESETS[3].architecture);
    const second = createDecisionSurface(ARCHITECTURE_PRESETS[3].architecture);

    expect(first).toEqual(second);
    expect(first).toHaveLength(196);
    expect(first.every((cell) => cell.bin >= 0 && cell.bin <= 5)).toBe(true);
  });

  it("recomputes rules and surfaces when the dataset changes", () => {
    const diagonal = createDecisionSurface(CART_ARCHITECTURE, 14, "diagonal");
    const xor = createDecisionSurface(CART_ARCHITECTURE, 14, "xor");
    const diagonalBins = diagonal.map((cell) => cell.bin);
    const xorBins = xor.map((cell) => cell.bin);

    expect(xorBins).not.toEqual(diagonalBins);
    expect(architectureRules(CART_ARCHITECTURE, "xor").left.label).toBe("x₂ < 0");
    expect(architectureRules(CART_ARCHITECTURE, "offset-steps").left.label).toBe("x₂ < −0.62");
  });
});
