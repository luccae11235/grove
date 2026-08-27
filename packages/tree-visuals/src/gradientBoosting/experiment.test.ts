import { describe, expect, it } from "vitest";
import {
  BOOSTING_COMPLEX_EXPERIMENT,
  BOOSTING_EXPERIMENT,
  complexGradientBoostingDatasets,
  fitBoostingTree,
  gradientBoostingDatasets,
  predictBoostingTree,
  runComplexGradientBoosting,
  runGradientBoosting,
} from "./experiment";

describe("the locked gradient boosting experiment", () => {
  it("regenerates one stable, ordered training and validation problem", () => {
    const first = gradientBoostingDatasets();
    const second = gradientBoostingDatasets();

    expect(first).toEqual(second);
    expect(BOOSTING_EXPERIMENT.id).toBe("regime-shift-v1");
    expect(first.training).toHaveLength(36);
    expect(first.validation).toHaveLength(64);
    expect(first.training.every((point, index) =>
      index === 0 || first.training[index - 1].x < point.x)).toBe(true);
  });

  it("starts at the target mean and leaves a zero-centered, structured residual target", () => {
    const run = runGradientBoosting(1, 1);
    const firstStage = run.stages[0];
    const residualMean = firstStage.residualsBefore.reduce((sum, value) => sum + value, 0)
      / firstStage.residualsBefore.length;

    expect(run.basePrediction).toBeCloseTo(0.1269, 4);
    expect(residualMean).toBeCloseTo(0, 10);
    expect(predictBoostingTree(firstStage.tree, -1.5)).toBeLessThan(-0.5);
    expect(predictBoostingTree(firstStage.tree, 0.8)).toBeGreaterThan(0.8);
  });

  it("makes the first residual tree a vertical translation of the same tree fitted to y", () => {
    const run = runGradientBoosting(1, 1);
    const directTree = fitBoostingTree(run.training);
    const residualTree = run.stages[0].tree;

    for (const point of run.validation) {
      expect(run.basePrediction + predictBoostingTree(residualTree, point.x)).toBeCloseTo(
        predictBoostingTree(directTree, point.x),
        10,
      );
    }
  });

  it("shows one fixed residual tree can transfer slightly better with a sub-unit step", () => {
    const shrunkRun = runGradientBoosting(0.95, 1);
    const fullRun = runGradientBoosting(1, 1);
    const aggressiveRun = runGradientBoosting(1.4, 1);
    const shrunk = shrunkRun.stages[0];
    const full = fullRun.stages[0];
    const aggressive = aggressiveRun.stages[0];

    expect(shrunk.tree).toEqual(full.tree);
    expect(aggressive.tree).toEqual(full.tree);
    expect(shrunk.validationRmse).toBeCloseTo(0.243, 3);
    expect(full.validationRmse).toBeCloseTo(0.247, 3);
    expect(aggressive.validationRmse).toBeCloseTo(0.401, 3);
    expect(shrunk.validationRmse).toBeLessThan(full.validationRmse);
    expect(full.validationRmse).toBeLessThan(aggressive.validationRmse);
  });

  it("shows that shrinkage needs more trees and can generalize better at a fixed larger budget", () => {
    const smallStepFourTrees = runGradientBoosting(0.1, 4).stages[3];
    const fullStepFourTrees = runGradientBoosting(1, 4).stages[3];
    const smallStepFortyTrees = runGradientBoosting(0.1, 40).stages[39];
    const fullStepFortyTrees = runGradientBoosting(1, 40).stages[39];

    expect(smallStepFourTrees.validationRmse).toBeCloseTo(0.470, 3);
    expect(fullStepFourTrees.validationRmse).toBeCloseTo(0.237, 3);
    expect(smallStepFourTrees.validationRmse).toBeGreaterThan(fullStepFourTrees.validationRmse);
    expect(smallStepFortyTrees.validationRmse).toBeCloseTo(0.196, 3);
    expect(fullStepFortyTrees.validationRmse).toBeCloseTo(0.251, 3);
    expect(smallStepFortyTrees.validationRmse).toBeLessThan(fullStepFortyTrees.validationRmse);
    expect(smallStepFortyTrees.trainingRmse).toBeGreaterThan(fullStepFortyTrees.trainingRmse);
  });

  it("contains a real later correction that reverses an aggressive earlier update", () => {
    const run = runGradientBoosting(1.3, 2);
    const firstCorrection = predictBoostingTree(run.stages[0].tree, 0.8);
    const secondCorrection = predictBoostingTree(run.stages[1].tree, 0.8);

    expect(firstCorrection).toBeGreaterThan(0);
    expect(secondCorrection).toBeLessThan(0);
  });

  it("makes every later tree fit the residuals left by the complete previous ensemble", () => {
    const run = runGradientBoosting(0.6, 4);

    for (let stageIndex = 1; stageIndex < run.stages.length; stageIndex += 1) {
      const previous = run.stages[stageIndex - 1];
      const current = run.stages[stageIndex];
      current.residualsBefore.forEach((residual, pointIndex) => {
        expect(residual).toBeCloseTo(
          run.training[pointIndex].y - previous.trainingPredictions[pointIndex],
          12,
        );
      });
    }
  });

  it("supports the four-round contraction animation with genuinely decreasing training error", () => {
    const run = runGradientBoosting(0.6, 4);
    const baselineRmse = Math.sqrt(run.training.reduce(
      (sum, point) => sum + (point.y - run.basePrediction) ** 2,
      0,
    ) / run.training.length);
    const errors = [baselineRmse, ...run.stages.map((stage) => stage.trainingRmse)];

    expect(errors[0]).toBeCloseTo(0.719, 3);
    expect(errors[4]).toBeCloseTo(0.167, 3);
    expect(errors.every((error, index) => index === 0 || error < errors[index - 1])).toBe(true);
  });

  it("keeps every learning-rate playground state inside its fixed comparison scales", () => {
    for (let step = 1; step <= 30; step += 1) {
      const run = runGradientBoosting(step * 0.05, 40);
      const stage = run.stages[39];
      expect(Math.min(...stage.validationPredictions)).toBeGreaterThanOrEqual(
        BOOSTING_EXPERIMENT.yMinimum,
      );
      expect(Math.max(...stage.validationPredictions)).toBeLessThanOrEqual(
        BOOSTING_EXPERIMENT.yMaximum,
      );
      const residuals = run.validation.map((point, index) =>
        point.y - stage.validationPredictions[index]);
      expect(Math.max(...residuals.map(Math.abs))).toBeLessThanOrEqual(0.9);
    }
  });
});

describe("the layered-signal transfer experiment", () => {
  it("regenerates one stable, denser train and held-out dataset", () => {
    const first = complexGradientBoostingDatasets();
    const second = complexGradientBoostingDatasets();

    expect(first).toEqual(second);
    expect(BOOSTING_COMPLEX_EXPERIMENT.id).toBe("layered-signal-v1");
    expect(first.training).toHaveLength(72);
    expect(first.validation).toHaveLength(120);
    expect(first.training.every((point, index) => index === 0 || first.training[index - 1].x < point.x)).toBe(true);
  });

  it("needs a larger budget to recover local detail while held-out error eventually flattens", () => {
    const run = runComplexGradientBoosting(0.1, 200);

    expect(run.stages[3].trainingRmse).toBeCloseTo(0.341, 3);
    expect(run.stages[49].trainingRmse).toBeCloseTo(0.108, 3);
    expect(run.stages[99].validationRmse).toBeCloseTo(0.143, 3);
    expect(run.stages[199].validationRmse).toBeCloseTo(0.147, 3);
    expect(run.stages[199].trainingRmse).toBeLessThan(run.stages[99].trainingRmse);
    expect(run.stages[199].validationRmse).toBeGreaterThan(run.stages[99].validationRmse);
  });

  it("keeps the transfer playground within its fixed visual domains", () => {
    for (const learningRate of [0.05, 0.1, 0.2, 0.3]) {
      const run = runComplexGradientBoosting(learningRate, 200);
      for (const treeCount of [1, 20, 50, 100, 200]) {
        const stage = run.stages[treeCount - 1];
        expect(Math.min(...stage.trainingPredictions)).toBeGreaterThanOrEqual(BOOSTING_COMPLEX_EXPERIMENT.yMinimum);
        expect(Math.max(...stage.trainingPredictions)).toBeLessThanOrEqual(BOOSTING_COMPLEX_EXPERIMENT.yMaximum);
        const residuals = run.validation.map((point, index) => point.y - stage.validationPredictions[index]);
        expect(Math.max(...residuals.map(Math.abs))).toBeLessThanOrEqual(1.5);
      }
    }
  });
});
