import type { Criterion, Label } from "./types";

function classCounts(labels: Label[]): number[] {
  const counts = new Map<Label, number>();

  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.values()];
}

export function giniImpurity(labels: Label[]): number {
  if (labels.length === 0) return 0;

  return 1 - classCounts(labels).reduce((sum, count) => {
    const probability = count / labels.length;
    return sum + probability * probability;
  }, 0);
}

export function entropy(labels: Label[]): number {
  if (labels.length === 0) return 0;

  return classCounts(labels).reduce((sum, count) => {
    const probability = count / labels.length;
    return sum - probability * Math.log2(probability);
  }, 0);
}

export function calculateImpurity(
  labels: Label[],
  criterion: Criterion,
): number {
  return criterion === "gini" ? giniImpurity(labels) : entropy(labels);
}

