import { calculateImpurity } from "./impurity";
import type {
  ClassDistribution,
  Dataset,
  DecisionStumpResult,
  Label,
  LeafNode,
  SplitCandidate,
  TrainDecisionStumpOptions,
  TrainingEvent,
} from "./types";

const EPSILON = 1e-12;

function validateDataset(dataset: Dataset): void {
  if (dataset.features.length < 2) {
    throw new Error("A decision split needs at least two samples.");
  }

  if (dataset.features.length !== dataset.targets.length) {
    throw new Error("Every feature row must have exactly one target.");
  }

  const featureCount = dataset.features[0]?.length ?? 0;
  if (featureCount === 0 || dataset.featureNames.length !== featureCount) {
    throw new Error("Feature names must match the dataset width.");
  }

  for (const row of dataset.features) {
    if (row.length !== featureCount || row.some((value) => !Number.isFinite(value))) {
      throw new Error("Features must be a rectangular matrix of finite numbers.");
    }
  }
}

function labelsAt(dataset: Dataset, indices: number[]): Label[] {
  return indices.map((index) => dataset.targets[index] as Label);
}

function classDistribution(labels: Label[]): ClassDistribution[] {
  const counts = new Map<Label, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
    .map(([label, count]) => ({
      label,
      count,
      probability: count / labels.length,
    }));
}

function createLeaf(
  id: string,
  labels: Label[],
  criterion: "gini" | "entropy",
): LeafNode {
  const distribution = classDistribution(labels);
  const winner = [...distribution].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return String(left.label).localeCompare(String(right.label));
  })[0];

  if (!winner) throw new Error("Cannot create a leaf without samples.");

  return {
    kind: "leaf",
    id,
    prediction: winner.label,
    impurity: calculateImpurity(labels, criterion),
    sampleCount: labels.length,
    distribution,
  };
}

function candidateThresholds(values: number[]): number[] {
  const unique = [...new Set(values)].sort((left, right) => left - right);
  const thresholds: number[] = [];

  for (let index = 0; index < unique.length - 1; index += 1) {
    thresholds.push(((unique[index] as number) + (unique[index + 1] as number)) / 2);
  }

  return thresholds;
}

export function trainDecisionStump(
  dataset: Dataset,
  options: TrainDecisionStumpOptions = {},
): DecisionStumpResult {
  validateDataset(dataset);

  const criterion = options.criterion ?? "gini";
  const minSamplesLeaf = options.minSamplesLeaf ?? 1;
  if (!Number.isInteger(minSamplesLeaf) || minSamplesLeaf < 1) {
    throw new Error("minSamplesLeaf must be a positive integer.");
  }

  const parentImpurity = calculateImpurity(dataset.targets, criterion);
  const events: TrainingEvent[] = [
    {
      type: "training_started",
      step: 0,
      criterion,
      sampleCount: dataset.targets.length,
      impurity: parentImpurity,
    },
  ];

  let bestSplit: SplitCandidate | null = null;
  let step = 1;

  for (let featureIndex = 0; featureIndex < dataset.featureNames.length; featureIndex += 1) {
    const values = dataset.features.map((row) => row[featureIndex] as number);

    for (const threshold of candidateThresholds(values)) {
      const leftIndices: number[] = [];
      const rightIndices: number[] = [];

      values.forEach((value, sampleIndex) => {
        (value <= threshold ? leftIndices : rightIndices).push(sampleIndex);
      });

      if (leftIndices.length < minSamplesLeaf || rightIndices.length < minSamplesLeaf) {
        continue;
      }

      const leftImpurity = calculateImpurity(labelsAt(dataset, leftIndices), criterion);
      const rightImpurity = calculateImpurity(labelsAt(dataset, rightIndices), criterion);
      const weightedImpurity =
        (leftIndices.length / dataset.targets.length) * leftImpurity +
        (rightIndices.length / dataset.targets.length) * rightImpurity;

      const candidate: SplitCandidate = {
        featureIndex,
        featureName: dataset.featureNames[featureIndex] as string,
        threshold,
        weightedImpurity,
        gain: parentImpurity - weightedImpurity,
        leftIndices,
        rightIndices,
      };

      events.push({ type: "candidate_evaluated", step, candidate });
      step += 1;

      if (!bestSplit || candidate.gain > bestSplit.gain + EPSILON) {
        bestSplit = candidate;
      }
    }
  }

  if (!bestSplit || bestSplit.gain <= EPSILON) {
    const model = createLeaf("root", dataset.targets, criterion);
    events.push({ type: "training_completed", step, nodeId: model.id });
    return {
      model,
      bestSplit: null,
      trace: { version: "1.0", criterion, events },
    };
  }

  events.push({ type: "split_selected", step, candidate: bestSplit });
  step += 1;

  const model = {
    kind: "split" as const,
    id: "root",
    featureIndex: bestSplit.featureIndex,
    featureName: bestSplit.featureName,
    threshold: bestSplit.threshold,
    impurity: parentImpurity,
    gain: bestSplit.gain,
    sampleCount: dataset.targets.length,
    left: createLeaf("root.left", labelsAt(dataset, bestSplit.leftIndices), criterion),
    right: createLeaf("root.right", labelsAt(dataset, bestSplit.rightIndices), criterion),
  };

  events.push({ type: "training_completed", step, nodeId: model.id });

  return {
    model,
    bestSplit,
    trace: { version: "1.0", criterion, events },
  };
}

