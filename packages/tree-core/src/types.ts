export type Label = string | number;

export type Criterion = "gini" | "entropy";

export interface Dataset {
  features: number[][];
  targets: Label[];
  featureNames: string[];
}

export interface ClassDistribution {
  label: Label;
  count: number;
  probability: number;
}

export interface LeafNode {
  kind: "leaf";
  id: string;
  prediction: Label;
  impurity: number;
  sampleCount: number;
  distribution: ClassDistribution[];
}

export interface SplitNode {
  kind: "split";
  id: string;
  featureIndex: number;
  featureName: string;
  threshold: number;
  impurity: number;
  gain: number;
  sampleCount: number;
  left: LeafNode;
  right: LeafNode;
}

export type DecisionStump = LeafNode | SplitNode;

export interface SplitCandidate {
  featureIndex: number;
  featureName: string;
  threshold: number;
  weightedImpurity: number;
  gain: number;
  leftIndices: number[];
  rightIndices: number[];
}

export type TrainingEvent =
  | {
      type: "training_started";
      step: number;
      criterion: Criterion;
      sampleCount: number;
      impurity: number;
    }
  | {
      type: "candidate_evaluated";
      step: number;
      candidate: SplitCandidate;
    }
  | {
      type: "split_selected";
      step: number;
      candidate: SplitCandidate;
    }
  | {
      type: "training_completed";
      step: number;
      nodeId: string;
    };

export interface TrainingTrace {
  version: "1.0";
  criterion: Criterion;
  events: TrainingEvent[];
}

export interface TrainDecisionStumpOptions {
  criterion?: Criterion;
  minSamplesLeaf?: number;
}

export interface DecisionStumpResult {
  model: DecisionStump;
  bestSplit: SplitCandidate | null;
  trace: TrainingTrace;
}

