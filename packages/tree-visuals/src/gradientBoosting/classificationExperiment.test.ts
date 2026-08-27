import { describe, expect, it } from "vitest";
import {
  BOOSTING_CLASSIFICATION_EXPERIMENT,
  classificationDatasets,
  classificationFocusPoints,
  logit,
  predictClassificationProbability,
  runClassificationBoosting,
  sigmoid,
} from "./classificationExperiment";
import { predictBoostingTree } from "./experiment";

describe("the locked classification boosting experiment", () => {
  it("reuses one deterministic regional classification problem", () => {
    const first = classificationDatasets();
    const second = classificationDatasets();

    expect(first).toEqual(second);
    expect(BOOSTING_CLASSIFICATION_EXPERIMENT.id).toBe("regional-classes-v1");
    expect(first.training).toHaveLength(40);
    expect(first.validation).toHaveLength(80);
    expect(first.training.reduce((sum, point) => sum + point.y, 0)).toBe(16);
    expect(first.training.every((point, index) => index === 0 || first.training[index - 1].x < point.x)).toBe(true);
  });

  it("starts from probability 0.40 and the matching unconstrained logit", () => {
    const run = runClassificationBoosting(0.8, 1);

    expect(run.baseProbability).toBeCloseTo(0.4, 12);
    expect(run.baseLogit).toBeCloseTo(-0.405465, 6);
    expect(sigmoid(run.baseLogit)).toBeCloseTo(run.baseProbability, 12);
    expect(logit(run.baseProbability)).toBeCloseTo(run.baseLogit, 12);
    const focus = classificationFocusPoints(run);
    expect(focus.map((point) => point.id)).toEqual(["C07", "C16", "C19", "C26", "C35"]);
    expect(focus.reduce((sum, point) => sum + point.y, 0)).toBe(2);

    const exampleIndex = run.training.findIndex((point) => point.id === "C16");
    const contribution = run.learningRate * predictBoostingTree(run.stages[0].tree, run.training[exampleIndex].x);
    expect(contribution).toBeCloseTo(0.292, 3);
    expect(run.stages[0].trainingLogits[exampleIndex]).toBeCloseTo(-0.114, 3);
    expect(run.stages[0].trainingProbabilities[exampleIndex]).toBeCloseTo(0.472, 3);
  });

  it("fits every tree to y minus the current probability", () => {
    const run = runClassificationBoosting(0.8, 4);

    run.stages.forEach((stage, stageIndex) => {
      const probabilities = stageIndex === 0
        ? run.training.map(() => run.baseProbability)
        : run.stages[stageIndex - 1].trainingProbabilities;
      stage.pseudoResidualsBefore.forEach((residual, pointIndex) => {
        expect(residual).toBeCloseTo(run.training[pointIndex].y - probabilities[pointIndex], 12);
      });
    });
  });

  it("lowers training and held-out log loss as regional corrections accumulate", () => {
    const run = runClassificationBoosting(0.8, 20);
    const baselineLoss = -(0.4 * Math.log(0.4) + 0.6 * Math.log(0.6));
    const heldOutBaselineLoss = run.validation.reduce((sum, point) => (
      sum - point.y * Math.log(run.baseProbability) - (1 - point.y) * Math.log(1 - run.baseProbability)
    ), 0) / run.validation.length;

    expect(run.stages[0].trainingLogLoss).toBeLessThan(baselineLoss);
    expect(run.stages[19].trainingLogLoss).toBeLessThan(run.stages[0].trainingLogLoss);
    expect(run.stages[19].validationLogLoss).toBeLessThan(heldOutBaselineLoss);
    expect(run.stages[0].trainingLogLoss).toBeCloseTo(0.589, 3);
    expect(run.stages[0].validationLogLoss).toBeCloseTo(0.622, 3);
    expect(run.stages.every((stage) => stage.trainingProbabilities.every((probability) => probability > 0 && probability < 1))).toBe(true);
    expect(run.stages.every((stage) => stage.pseudoResidualsAfter.every((residual) => Math.abs(residual) <= 1))).toBe(true);
  });

  it("supports four visibly improving rounds and rejects invalid controls", () => {
    const run = runClassificationBoosting(0.8, 4);

    expect(run.stages.every((stage, index) => index === 0 || stage.trainingLogLoss < run.stages[index - 1].trainingLogLoss)).toBe(true);
    expect(() => runClassificationBoosting(0, 4)).toThrow("positive");
    expect(() => runClassificationBoosting(0.8, 21)).toThrow("0 to 20");
  });

  it("produces a higher class-one probability in the learned middle region", () => {
    const run = runClassificationBoosting(0.8, 20);

    expect(predictClassificationProbability(run, 0.9)).toBeGreaterThan(
      predictClassificationProbability(run, -2),
    );
  });
});
