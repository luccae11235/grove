export interface BoostingPoint {
  id: string;
  x: number;
  y: number;
}

export type BoostingTree =
  | {
      kind: "leaf";
      prediction: number;
      sampleCount: number;
      depth: number;
    }
  | {
      kind: "split";
      prediction: number;
      sampleCount: number;
      depth: number;
      threshold: number;
      left: BoostingTree;
      right: BoostingTree;
    };

export interface BoostingStage {
  index: number;
  tree: BoostingTree;
  trainingPredictions: number[];
  validationPredictions: number[];
  residualsBefore: number[];
  residualsAfter: number[];
  trainingRmse: number;
  validationRmse: number;
}

export interface BoostingRun {
  experimentId: string;
  learningRate: number;
  basePrediction: number;
  training: BoostingPoint[];
  validation: BoostingPoint[];
  stages: BoostingStage[];
}

export interface TreeLeafSegment {
  lower: number;
  upper: number;
  prediction: number;
  sampleCount: number;
}

export const BOOSTING_EXPERIMENT = Object.freeze({
  id: "regime-shift-v1",
  xMinimum: -3,
  xMaximum: 3,
  yMinimum: -1.2,
  yMaximum: 1.65,
  residualMinimum: -1.4,
  residualMaximum: 1.4,
  trainingSeed: 14_144,
  validationSeed: 53_104,
  trainingCount: 36,
  validationCount: 64,
  noiseStandardDeviation: 0.19,
  treeDepth: 2,
  minimumLeafSize: 3,
  defaultLearningRate: 0.1,
  learningRateTreeBudget: 40,
});

export const BOOSTING_COMPLEX_EXPERIMENT = Object.freeze({
  id: "layered-signal-v1",
  xMinimum: -3,
  xMaximum: 3,
  yMinimum: -1.55,
  yMaximum: 1.75,
  residualMinimum: -1.8,
  residualMaximum: 1.8,
  trainingSeed: 83_221,
  validationSeed: 19_407,
  trainingCount: 72,
  validationCount: 120,
  noiseStandardDeviation: 0.13,
  treeDepth: 2,
  minimumLeafSize: 4,
  defaultLearningRate: 0.1,
  maximumTreeCount: 200,
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

function normal(random: () => number): number {
  const first = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * random());
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function squaredError(points: BoostingPoint[], prediction = average(points.map((point) => point.y))): number {
  return points.reduce((sum, point) => sum + (point.y - prediction) ** 2, 0);
}

export function gradientBoostingTarget(x: number): number {
  return 0.32 * x
    + 0.42 * Math.sin(1.7 * x)
    + (x > 0.35 ? 0.48 : 0)
    - (x > 1.65 ? 0.52 : 0);
}

export function complexGradientBoostingTarget(x: number): number {
  const leftRise = 0.52 * Math.exp(-(((x + 1.35) / 0.42) ** 2));
  const narrowDip = -0.46 * Math.exp(-(((x - 1.15) / 0.3) ** 2));
  return 0.18 * x
    + 0.38 * Math.sin(1.45 * x)
    + 0.16 * Math.sin(4.8 * x)
    + leftRise
    + narrowDip
    + (x > 0.25 ? 0.32 : 0)
    - (x > 2.05 ? 0.28 : 0);
}

function generateDataset(
  prefix: "T" | "V",
  seed: number,
  count: number,
  offset: number,
): BoostingPoint[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const regularX = -2.9 + (5.8 * (index + offset)) / count;
    const x = Math.max(-2.95, Math.min(2.95, regularX + (random() - 0.5) * 0.07));
    return {
      id: `${prefix}${String(index + 1).padStart(2, "0")}`,
      x,
      y: gradientBoostingTarget(x) + BOOSTING_EXPERIMENT.noiseStandardDeviation * normal(random),
    };
  }).sort((left, right) => left.x - right.x);
}

export function gradientBoostingDatasets(): {
  training: BoostingPoint[];
  validation: BoostingPoint[];
} {
  return {
    training: generateDataset(
      "T",
      BOOSTING_EXPERIMENT.trainingSeed,
      BOOSTING_EXPERIMENT.trainingCount,
      0.35,
    ),
    validation: generateDataset(
      "V",
      BOOSTING_EXPERIMENT.validationSeed,
      BOOSTING_EXPERIMENT.validationCount,
      0.85,
    ),
  };
}

function generateComplexDataset(
  prefix: "CT" | "CV",
  seed: number,
  count: number,
  offset: number,
): BoostingPoint[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const regularX = -2.94 + (5.88 * (index + offset)) / count;
    const x = Math.max(-2.97, Math.min(2.97, regularX + (random() - 0.5) * 0.045));
    return {
      id: `${prefix}${String(index + 1).padStart(3, "0")}`,
      x,
      y: complexGradientBoostingTarget(x) + BOOSTING_COMPLEX_EXPERIMENT.noiseStandardDeviation * normal(random),
    };
  }).sort((left, right) => left.x - right.x);
}

export function complexGradientBoostingDatasets(): {
  training: BoostingPoint[];
  validation: BoostingPoint[];
} {
  return {
    training: generateComplexDataset(
      "CT",
      BOOSTING_COMPLEX_EXPERIMENT.trainingSeed,
      BOOSTING_COMPLEX_EXPERIMENT.trainingCount,
      0.31,
    ),
    validation: generateComplexDataset(
      "CV",
      BOOSTING_COMPLEX_EXPERIMENT.validationSeed,
      BOOSTING_COMPLEX_EXPERIMENT.validationCount,
      0.77,
    ),
  };
}

export function fitBoostingTree(
  input: BoostingPoint[],
  depth: number = 0,
  maxDepth: number = BOOSTING_EXPERIMENT.treeDepth,
  minimumLeafSize: number = BOOSTING_EXPERIMENT.minimumLeafSize,
): BoostingTree {
  const points = [...input].sort((left, right) => left.x - right.x);
  const prediction = average(points.map((point) => point.y));
  const leaf = (): BoostingTree => ({
    kind: "leaf",
    prediction,
    sampleCount: points.length,
    depth,
  });

  if (depth >= maxDepth || points.length < minimumLeafSize * 2) return leaf();

  const parentError = squaredError(points, prediction);
  let best: {
    threshold: number;
    error: number;
    left: BoostingPoint[];
    right: BoostingPoint[];
  } | undefined;

  for (let index = minimumLeafSize; index <= points.length - minimumLeafSize; index += 1) {
    const previous = points[index - 1].x;
    const next = points[index].x;
    if (Math.abs(previous - next) < 1e-9) continue;
    const left = points.slice(0, index);
    const right = points.slice(index);
    const error = squaredError(left) + squaredError(right);
    if (!best || error < best.error - 1e-9) {
      best = {
        threshold: (previous + next) / 2,
        error,
        left,
        right,
      };
    }
  }

  if (!best || parentError - best.error < 1e-6) return leaf();

  return {
    kind: "split",
    prediction,
    sampleCount: points.length,
    depth,
    threshold: best.threshold,
    left: fitBoostingTree(best.left, depth + 1, maxDepth, minimumLeafSize),
    right: fitBoostingTree(best.right, depth + 1, maxDepth, minimumLeafSize),
  };
}

export function predictBoostingTree(tree: BoostingTree, x: number): number {
  if (tree.kind === "leaf") return tree.prediction;
  return predictBoostingTree(x <= tree.threshold ? tree.left : tree.right, x);
}

export function boostingTreeLeafSegments(
  tree: BoostingTree,
  lower: number = BOOSTING_EXPERIMENT.xMinimum,
  upper: number = BOOSTING_EXPERIMENT.xMaximum,
): TreeLeafSegment[] {
  if (tree.kind === "leaf") {
    return [{ lower, upper, prediction: tree.prediction, sampleCount: tree.sampleCount }];
  }
  return [
    ...boostingTreeLeafSegments(tree.left, lower, tree.threshold),
    ...boostingTreeLeafSegments(tree.right, tree.threshold, upper),
  ];
}

export function rootMeanSquaredError(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    throw new Error("RMSE needs equally sized, non-empty arrays.");
  }
  return Math.sqrt(average(actual.map((value, index) => (value - predicted[index]) ** 2)));
}

export function runGradientBoosting(
  learningRate: number = BOOSTING_EXPERIMENT.defaultLearningRate,
  treeCount: number = BOOSTING_EXPERIMENT.learningRateTreeBudget,
): BoostingRun {
  if (!(learningRate > 0)) throw new Error("The learning rate must be positive.");
  if (!Number.isInteger(treeCount) || treeCount < 0) {
    throw new Error("The tree count must be a non-negative integer.");
  }

  return runBoostingOnDatasets({
    experimentId: BOOSTING_EXPERIMENT.id,
    learningRate,
    treeCount,
    datasets: gradientBoostingDatasets(),
    treeDepth: BOOSTING_EXPERIMENT.treeDepth,
    minimumLeafSize: BOOSTING_EXPERIMENT.minimumLeafSize,
  });
}

function runBoostingOnDatasets({
  experimentId,
  learningRate,
  treeCount,
  datasets,
  treeDepth,
  minimumLeafSize,
}: {
  experimentId: string;
  learningRate: number;
  treeCount: number;
  datasets: { training: BoostingPoint[]; validation: BoostingPoint[] };
  treeDepth: number;
  minimumLeafSize: number;
}): BoostingRun {
  const { training, validation } = datasets;
  const basePrediction = average(training.map((point) => point.y));
  let trainingPredictions = training.map(() => basePrediction);
  let validationPredictions = validation.map(() => basePrediction);
  const stages: BoostingStage[] = [];

  for (let index = 0; index < treeCount; index += 1) {
    const residualsBefore = training.map((point, pointIndex) =>
      point.y - trainingPredictions[pointIndex]);
    const residualDataset = training.map((point, pointIndex) => ({
      id: point.id,
      x: point.x,
      y: residualsBefore[pointIndex],
    }));
    const tree = fitBoostingTree(residualDataset, 0, treeDepth, minimumLeafSize);
    trainingPredictions = trainingPredictions.map((prediction, pointIndex) =>
      prediction + learningRate * predictBoostingTree(tree, training[pointIndex].x));
    validationPredictions = validationPredictions.map((prediction, pointIndex) =>
      prediction + learningRate * predictBoostingTree(tree, validation[pointIndex].x));
    const residualsAfter = training.map((point, pointIndex) =>
      point.y - trainingPredictions[pointIndex]);

    stages.push({
      index: index + 1,
      tree,
      trainingPredictions: [...trainingPredictions],
      validationPredictions: [...validationPredictions],
      residualsBefore,
      residualsAfter,
      trainingRmse: rootMeanSquaredError(
        training.map((point) => point.y),
        trainingPredictions,
      ),
      validationRmse: rootMeanSquaredError(
        validation.map((point) => point.y),
        validationPredictions,
      ),
    });
  }

  return {
    experimentId,
    learningRate,
    basePrediction,
    training,
    validation,
    stages,
  };
}

export function runComplexGradientBoosting(
  learningRate: number = BOOSTING_COMPLEX_EXPERIMENT.defaultLearningRate,
  treeCount: number = BOOSTING_COMPLEX_EXPERIMENT.maximumTreeCount,
): BoostingRun {
  if (!(learningRate > 0)) throw new Error("The learning rate must be positive.");
  if (!Number.isInteger(treeCount) || treeCount < 0 || treeCount > BOOSTING_COMPLEX_EXPERIMENT.maximumTreeCount) {
    throw new Error(`The complex experiment tree count must be an integer from 0 to ${BOOSTING_COMPLEX_EXPERIMENT.maximumTreeCount}.`);
  }
  return runBoostingOnDatasets({
    experimentId: BOOSTING_COMPLEX_EXPERIMENT.id,
    learningRate,
    treeCount,
    datasets: complexGradientBoostingDatasets(),
    treeDepth: BOOSTING_COMPLEX_EXPERIMENT.treeDepth,
    minimumLeafSize: BOOSTING_COMPLEX_EXPERIMENT.minimumLeafSize,
  });
}

export function predictBoostingRun(
  run: BoostingRun,
  x: number,
  treeCount = run.stages.length,
): number {
  const includedStages = run.stages.slice(0, Math.max(0, Math.min(treeCount, run.stages.length)));
  return run.basePrediction + run.learningRate * includedStages.reduce(
    (sum, stage) => sum + predictBoostingTree(stage.tree, x),
    0,
  );
}
