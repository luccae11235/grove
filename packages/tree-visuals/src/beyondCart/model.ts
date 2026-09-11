export const SOFT_TREE_THRESHOLD = 0;
export const SOFT_TREE_LEFT_VALUE = 2;
export const SOFT_TREE_RIGHT_VALUE = 8;
export const BUILDER_SOFT_TEMPERATURE = 0.55;

export type SplitGeometry = "axis-aligned" | "oblique";
export type RoutingMode = "hard" | "soft";
export type RuleSharing = "independent" | "shared-by-depth";
export type LeafModel = "constant" | "linear";

export interface TreeArchitecture {
  split: SplitGeometry;
  routing: RoutingMode;
  rules: RuleSharing;
  leaves: LeafModel;
}

export interface Point2D {
  id: string;
  x1: number;
  x2: number;
  label: 0 | 1;
}

export interface SplitRule {
  weights: readonly [number, number];
  threshold: number;
  label: string;
}

export interface ArchitectureRules {
  root: SplitRule;
  left: SplitRule;
  right: SplitRule;
}

export interface RoutingResult {
  pLeft: number;
  pRight: number;
  prediction: number;
  hard: boolean;
}

export interface ArchitectureComplexity {
  splitParameters: number;
  gateParameters: number;
  leafParameters: number;
  totalParameters: number;
  nodeEvaluations: number;
}

export interface ArchitecturePrediction {
  prediction: number;
  leafWeights: readonly [number, number, number, number];
}

export interface SurfaceCell {
  id: string;
  x1: number;
  x2: number;
  prediction: number;
  bin: number;
}

export interface ArchitecturePreset {
  id: "cart" | "soft" | "oblivious" | "relaxed";
  label: string;
  architecture: TreeArchitecture;
}

export const CART_ARCHITECTURE: TreeArchitecture = {
  split: "axis-aligned",
  routing: "hard",
  rules: "independent",
  leaves: "constant",
};

export const ARCHITECTURE_PRESETS: readonly ArchitecturePreset[] = [
  {
    id: "cart",
    label: "CART",
    architecture: CART_ARCHITECTURE,
  },
  {
    id: "soft",
    label: "Soft tree",
    architecture: {
      split: "axis-aligned",
      routing: "soft",
      rules: "independent",
      leaves: "constant",
    },
  },
  {
    id: "oblivious",
    label: "Oblivious",
    architecture: {
      split: "axis-aligned",
      routing: "hard",
      rules: "shared-by-depth",
      leaves: "constant",
    },
  },
  {
    id: "relaxed",
    label: "Highly relaxed",
    architecture: {
      split: "oblique",
      routing: "soft",
      rules: "independent",
      leaves: "linear",
    },
  },
] as const;

// One fixed problem is reused by every architecture. Labels follow a diagonal
// relationship so axis-aligned and oblique partitions have genuinely different
// work to do without introducing random data or a hidden benchmark.
export const BUILDER_POINTS: readonly Point2D[] = [
  { id: "n-1", x1: -1.65, x2: -0.95, label: 0 },
  { id: "n-2", x1: -1.5, x2: 0.15, label: 0 },
  { id: "n-3", x1: -1.15, x2: -1.35, label: 0 },
  { id: "n-4", x1: -0.85, x2: 0.65, label: 0 },
  { id: "n-5", x1: -0.65, x2: -0.35, label: 0 },
  { id: "n-6", x1: -0.25, x2: -1.5, label: 0 },
  { id: "n-7", x1: 0.25, x2: -0.75, label: 0 },
  { id: "n-8", x1: 0.55, x2: -1.05, label: 0 },
  { id: "p-1", x1: -0.9, x2: 1.45, label: 1 },
  { id: "p-2", x1: -0.45, x2: 0.95, label: 1 },
  { id: "p-3", x1: 0.05, x2: 0.45, label: 1 },
  { id: "p-4", x1: 0.35, x2: 0.15, label: 1 },
  { id: "p-5", x1: 0.45, x2: 1.4, label: 1 },
  { id: "p-6", x1: 0.8, x2: -0.35, label: 1 },
  { id: "p-7", x1: 1.15, x2: 0.45, label: 1 },
  { id: "p-8", x1: 1.55, x2: -0.15, label: 1 },
] as const;

const CONSTANT_LEAF_VALUES = [0.1, 0.34, 0.66, 0.9] as const;
const LINEAR_LEAF_MODELS = [
  { intercept: 0.16, x1: 0.07, x2: 0.04 },
  { intercept: 0.39, x1: 0.07, x2: -0.05 },
  { intercept: 0.61, x1: -0.04, x2: 0.07 },
  { intercept: 0.84, x1: 0.05, x2: 0.04 },
] as const;

const AXIS_RULES: ArchitectureRules = {
  root: { weights: [1, 0], threshold: 0, label: "x₁ < 0.0" },
  left: { weights: [0, 1], threshold: -0.2, label: "x₂ < −0.2" },
  right: { weights: [0, 1], threshold: 0.25, label: "x₂ < 0.25" },
};

const AXIS_SHARED_RULE: SplitRule = {
  weights: [0, 1],
  threshold: 0,
  label: "x₂ < 0.0",
};

const OBLIQUE_RULES: ArchitectureRules = {
  root: { weights: [0.8, 0.6], threshold: 0, label: "0.8x₁ + 0.6x₂ < 0" },
  left: { weights: [-0.45, 1], threshold: 0.05, label: "−0.45x₁ + x₂ < 0.05" },
  right: { weights: [0.65, -1], threshold: -0.1, label: "0.65x₁ − x₂ < −0.1" },
};

const OBLIQUE_SHARED_RULE: SplitRule = {
  weights: [-0.6, 0.8],
  threshold: 0,
  label: "−0.6x₁ + 0.8x₂ < 0",
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function sigmoid(value: number): number {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

export function softRoutingPrediction(x: number, temperature: number): RoutingResult {
  const safeTemperature = Math.max(0, temperature);
  const pRight = safeTemperature === 0
    ? Number(x >= SOFT_TREE_THRESHOLD)
    : sigmoid((x - SOFT_TREE_THRESHOLD) / safeTemperature);
  const pLeft = 1 - pRight;

  return {
    pLeft,
    pRight,
    prediction: pLeft * SOFT_TREE_LEFT_VALUE + pRight * SOFT_TREE_RIGHT_VALUE,
    hard: safeTemperature === 0,
  };
}

export function architectureRules(architecture: TreeArchitecture): ArchitectureRules {
  const base = architecture.split === "axis-aligned" ? AXIS_RULES : OBLIQUE_RULES;
  if (architecture.rules === "independent") return base;
  const shared = architecture.split === "axis-aligned" ? AXIS_SHARED_RULE : OBLIQUE_SHARED_RULE;
  return { root: base.root, left: shared, right: shared };
}

function ruleScore(rule: SplitRule, x1: number, x2: number): number {
  return rule.weights[0] * x1 + rule.weights[1] * x2 - rule.threshold;
}

function rightGate(
  rule: SplitRule,
  x1: number,
  x2: number,
  routing: RoutingMode,
): number {
  const score = ruleScore(rule, x1, x2);
  return routing === "hard"
    ? Number(score >= 0)
    : sigmoid(score / BUILDER_SOFT_TEMPERATURE);
}

function leafPrediction(leafIndex: number, x1: number, x2: number, model: LeafModel): number {
  if (model === "constant") return CONSTANT_LEAF_VALUES[leafIndex];
  const leaf = LINEAR_LEAF_MODELS[leafIndex];
  return clamp(leaf.intercept + leaf.x1 * x1 + leaf.x2 * x2, 0.03, 0.97);
}

export function predictArchitecture(
  architecture: TreeArchitecture,
  x1: number,
  x2: number,
): ArchitecturePrediction {
  const rules = architectureRules(architecture);
  const rootRight = rightGate(rules.root, x1, x2, architecture.routing);
  if (architecture.routing === "hard") {
    const onRight = rootRight === 1;
    const childRight = rightGate(onRight ? rules.right : rules.left, x1, x2, "hard");
    const leafIndex = (onRight ? 2 : 0) + childRight;
    const leafWeights: [number, number, number, number] = [0, 0, 0, 0];
    leafWeights[leafIndex] = 1;
    return {
      prediction: leafPrediction(leafIndex, x1, x2, architecture.leaves),
      leafWeights,
    };
  }

  const leftRight = rightGate(rules.left, x1, x2, "soft");
  const rightRight = architecture.rules === "shared-by-depth"
    ? leftRight
    : rightGate(rules.right, x1, x2, "soft");
  const leafWeights: [number, number, number, number] = [
    (1 - rootRight) * (1 - leftRight),
    (1 - rootRight) * leftRight,
    rootRight * (1 - rightRight),
    rootRight * rightRight,
  ];
  const prediction = leafWeights.reduce((total, weight, leafIndex) => (
    total + weight * leafPrediction(leafIndex, x1, x2, architecture.leaves)
  ), 0);

  return { prediction, leafWeights };
}

export function architectureComplexity(architecture: TreeArchitecture): ArchitectureComplexity {
  const uniqueRuleCount = architecture.rules === "independent" ? 3 : 2;
  const parametersPerRule = architecture.split === "axis-aligned" ? 1 : 3;
  const splitParameters = uniqueRuleCount * parametersPerRule;
  // This visual's soft-tree variant learns one gate sharpness for each distinct
  // rule. The hard-tree variant has no gate parameter.
  const gateParameters = architecture.routing === "soft" ? uniqueRuleCount : 0;
  const leafParameters = architecture.leaves === "constant" ? 4 : 12;
  const nodeEvaluations = architecture.routing === "hard" || architecture.rules === "shared-by-depth"
    ? 2
    : 3;

  return {
    splitParameters,
    gateParameters,
    leafParameters,
    totalParameters: splitParameters + gateParameters + leafParameters,
    nodeEvaluations,
  };
}

export function createDecisionSurface(
  architecture: TreeArchitecture,
  steps = 14,
): readonly SurfaceCell[] {
  const safeSteps = Math.max(2, Math.floor(steps));
  const span = 4;
  return Array.from({ length: safeSteps * safeSteps }, (_, index) => {
    const column = index % safeSteps;
    const row = Math.floor(index / safeSteps);
    const x1 = -2 + ((column + 0.5) / safeSteps) * span;
    const x2 = 2 - ((row + 0.5) / safeSteps) * span;
    const prediction = predictArchitecture(architecture, x1, x2).prediction;
    return {
      id: `${row}-${column}`,
      x1,
      x2,
      prediction,
      bin: clamp(Math.floor(prediction * 6), 0, 5),
    };
  });
}

export function architecturesEqual(left: TreeArchitecture, right: TreeArchitecture): boolean {
  return left.split === right.split
    && left.routing === right.routing
    && left.rules === right.rules
    && left.leaves === right.leaves;
}

export function architectureSummary(architecture: TreeArchitecture): string {
  const split = architecture.split === "axis-aligned" ? "axis-aligned splits" : "oblique splits";
  const routing = architecture.routing === "hard" ? "hard routing" : "soft routing";
  const rules = architecture.rules === "independent" ? "independent node rules" : "rules shared by depth";
  const leaves = architecture.leaves === "constant" ? "constant leaves" : "linear leaves";
  return `${split}, ${routing}, ${rules}, and ${leaves}`;
}
