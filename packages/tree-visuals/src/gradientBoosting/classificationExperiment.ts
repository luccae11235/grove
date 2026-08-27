import {
  fitBoostingTree,
  predictBoostingTree,
  type BoostingPoint,
  type BoostingTree,
} from "./experiment";

export interface ClassificationPoint {
  id: string;
  x: number;
  y: 0 | 1;
}

export interface ClassificationStage {
  index: number;
  tree: BoostingTree;
  trainingLogits: number[];
  validationLogits: number[];
  trainingProbabilities: number[];
  validationProbabilities: number[];
  pseudoResidualsBefore: number[];
  pseudoResidualsAfter: number[];
  trainingLogLoss: number;
  validationLogLoss: number;
}

export interface ClassificationRun {
  experimentId: string;
  learningRate: number;
  baseProbability: number;
  baseLogit: number;
  training: ClassificationPoint[];
  validation: ClassificationPoint[];
  stages: ClassificationStage[];
}

export const BOOSTING_CLASSIFICATION_EXPERIMENT = Object.freeze({
  id: "regional-classes-v1",
  xMinimum: -3,
  xMaximum: 3,
  trainingSeed: 9,
  validationSeed: 7_217,
  trainingCount: 40,
  validationCount: 80,
  treeDepth: 2,
  minimumLeafSize: 4,
  defaultLearningRate: 0.8,
  maximumTreeCount: 20,
  focusIndices: [6, 15, 18, 25, 34],
});

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function logit(probability: number): number {
  if (!(probability > 0 && probability < 1)) {
    throw new Error("Logit needs a probability strictly between zero and one.");
  }
  return Math.log(probability / (1 - probability));
}

export function classificationProbability(x: number): number {
  const latent = -0.55
    + 0.55 * x
    + 0.75 * Math.sin(1.65 * x)
    + (x > 0.25 ? 1.15 : 0)
    - (x > 1.75 ? 1.25 : 0);
  return sigmoid(latent);
}

function generateClassificationDataset(
  prefix: "C" | "H",
  seed: number,
  count: number,
  offset: number,
): ClassificationPoint[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const regularX = -2.9 + (5.8 * (index + offset)) / count;
    const x = Math.max(-2.96, Math.min(2.96, regularX + (random() - 0.5) * 0.045));
    return {
      id: `${prefix}${String(index + 1).padStart(2, "0")}`,
      x,
      y: (random() < classificationProbability(x) ? 1 : 0) as 0 | 1,
    };
  }).sort((left, right) => left.x - right.x);
}

export function classificationDatasets(): {
  training: ClassificationPoint[];
  validation: ClassificationPoint[];
} {
  return {
    training: generateClassificationDataset(
      "C",
      BOOSTING_CLASSIFICATION_EXPERIMENT.trainingSeed,
      BOOSTING_CLASSIFICATION_EXPERIMENT.trainingCount,
      0.5,
    ),
    validation: generateClassificationDataset(
      "H",
      BOOSTING_CLASSIFICATION_EXPERIMENT.validationSeed,
      BOOSTING_CLASSIFICATION_EXPERIMENT.validationCount,
      0.82,
    ),
  };
}

export function binaryLogLoss(actual: number[], probabilities: number[]): number {
  if (actual.length !== probabilities.length || actual.length === 0) {
    throw new Error("Log loss needs equally sized, non-empty arrays.");
  }
  return actual.reduce((sum, target, index) => {
    const probability = Math.max(1e-9, Math.min(1 - 1e-9, probabilities[index]));
    return sum - target * Math.log(probability) - (1 - target) * Math.log(1 - probability);
  }, 0) / actual.length;
}

export function runClassificationBoosting(
  learningRate: number = BOOSTING_CLASSIFICATION_EXPERIMENT.defaultLearningRate,
  treeCount: number = BOOSTING_CLASSIFICATION_EXPERIMENT.maximumTreeCount,
): ClassificationRun {
  if (!(learningRate > 0)) throw new Error("The learning rate must be positive.");
  if (!Number.isInteger(treeCount) || treeCount < 0 || treeCount > BOOSTING_CLASSIFICATION_EXPERIMENT.maximumTreeCount) {
    throw new Error(`The classification tree count must be an integer from 0 to ${BOOSTING_CLASSIFICATION_EXPERIMENT.maximumTreeCount}.`);
  }

  const { training, validation } = classificationDatasets();
  const baseProbability = training.reduce((sum, point) => sum + point.y, 0) / training.length;
  const baseLogit = logit(baseProbability);
  let trainingLogits = training.map(() => baseLogit);
  let validationLogits = validation.map(() => baseLogit);
  const stages: ClassificationStage[] = [];

  for (let index = 0; index < treeCount; index += 1) {
    const trainingProbabilitiesBefore = trainingLogits.map(sigmoid);
    const pseudoResidualsBefore = training.map((point, pointIndex) =>
      point.y - trainingProbabilitiesBefore[pointIndex]);
    const residualDataset: BoostingPoint[] = training.map((point, pointIndex) => ({
      id: point.id,
      x: point.x,
      y: pseudoResidualsBefore[pointIndex],
    }));
    const tree = fitBoostingTree(
      residualDataset,
      0,
      BOOSTING_CLASSIFICATION_EXPERIMENT.treeDepth,
      BOOSTING_CLASSIFICATION_EXPERIMENT.minimumLeafSize,
    );
    trainingLogits = trainingLogits.map((value, pointIndex) =>
      value + learningRate * predictBoostingTree(tree, training[pointIndex].x));
    validationLogits = validationLogits.map((value, pointIndex) =>
      value + learningRate * predictBoostingTree(tree, validation[pointIndex].x));
    const trainingProbabilities = trainingLogits.map(sigmoid);
    const validationProbabilities = validationLogits.map(sigmoid);
    const pseudoResidualsAfter = training.map((point, pointIndex) =>
      point.y - trainingProbabilities[pointIndex]);

    stages.push({
      index: index + 1,
      tree,
      trainingLogits: [...trainingLogits],
      validationLogits: [...validationLogits],
      trainingProbabilities,
      validationProbabilities,
      pseudoResidualsBefore,
      pseudoResidualsAfter,
      trainingLogLoss: binaryLogLoss(training.map((point) => point.y), trainingProbabilities),
      validationLogLoss: binaryLogLoss(validation.map((point) => point.y), validationProbabilities),
    });
  }

  return {
    experimentId: BOOSTING_CLASSIFICATION_EXPERIMENT.id,
    learningRate,
    baseProbability,
    baseLogit,
    training,
    validation,
    stages,
  };
}

export function predictClassificationLogit(
  run: ClassificationRun,
  x: number,
  treeCount = run.stages.length,
): number {
  return run.baseLogit + run.learningRate * run.stages
    .slice(0, Math.max(0, Math.min(treeCount, run.stages.length)))
    .reduce((sum, stage) => sum + predictBoostingTree(stage.tree, x), 0);
}

export function predictClassificationProbability(
  run: ClassificationRun,
  x: number,
  treeCount = run.stages.length,
): number {
  return sigmoid(predictClassificationLogit(run, x, treeCount));
}

export function classificationFocusPoints(run: ClassificationRun): ClassificationPoint[] {
  return BOOSTING_CLASSIFICATION_EXPERIMENT.focusIndices.map((index) => run.training[index]);
}
