export const SOFT_TREE_THRESHOLD = 0;
export const SOFT_TREE_LEFT_VALUE = 2;
export const SOFT_TREE_RIGHT_VALUE = 8;
export const BUILDER_SOFT_TEMPERATURE = 0.55;

export type SplitGeometry = "axis-aligned" | "oblique";
export type RoutingMode = "hard" | "soft";
export type RuleSharing = "independent" | "shared-by-depth";
export type LeafModel = "constant" | "linear";
export type BuilderDatasetId = "diagonal" | "xor" | "offset-steps";

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

type LeafValues = readonly [number, number, number, number];

interface BuilderRuleFamily {
  independent: ArchitectureRules;
  shared: SplitRule;
}

export interface BuilderDataset {
  id: BuilderDatasetId;
  label: string;
  description: string;
  points: readonly Point2D[];
  rules: Readonly<Record<SplitGeometry, BuilderRuleFamily>>;
  leafValues: Readonly<Record<SplitGeometry, LeafValues>>;
}

export interface RoutingResult {
  pLeft: number;
  pRight: number;
  prediction: number;
  hard: boolean;
}

export interface ArchitectureComplexity {
  distinctRules: number;
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

const SAMPLE_COORDINATES = [-1.65, -0.99, -0.33, 0.33, 0.99, 1.65] as const;

function createDatasetPoints(
  datasetId: BuilderDatasetId,
  classify: (x1: number, x2: number) => 0 | 1,
): readonly Point2D[] {
  return SAMPLE_COORDINATES.flatMap((baseX, column) => (
    SAMPLE_COORDINATES.map((baseY, row) => {
      // Fixed, tiny offsets keep the sample from reading as a synthetic lattice
      // without introducing randomness between renders or architecture choices.
      const x1 = baseX + ((((row * 3) + (column * 5)) % 5) - 2) * 0.025;
      const x2 = baseY + ((((row * 7) + (column * 2)) % 5) - 2) * 0.025;
      return {
        id: `${datasetId}-${column}-${row}`,
        x1,
        x2,
        label: classify(x1, x2),
      };
    })
  ));
}

const DIAGONAL_POINTS = createDatasetPoints(
  "diagonal",
  (x1, x2) => Number(x2 >= (-0.78 * x1) + 0.05) as 0 | 1,
);

const XOR_POINTS = createDatasetPoints(
  "xor",
  (x1, x2) => Number((x1 < 0) === (x2 < 0)) as 0 | 1,
);

const OFFSET_STEP_POINTS = createDatasetPoints(
  "offset-steps",
  (x1, x2) => Number(x2 >= (x1 < 0 ? -0.62 : 0.62)) as 0 | 1,
);

const ROOT_X1: SplitRule = { weights: [1, 0], threshold: 0, label: "x₁ < 0" };
const ROOT_X2: SplitRule = { weights: [0, 1], threshold: 0, label: "x₂ < 0" };

export const DEFAULT_BUILDER_DATASET_ID: BuilderDatasetId = "diagonal";

export const BUILDER_DATASETS: readonly BuilderDataset[] = [
  {
    id: "diagonal",
    label: "Diagonal",
    description: "A slanted boundary rewards a split that can rotate.",
    points: DIAGONAL_POINTS,
    rules: {
      "axis-aligned": {
        independent: {
          root: ROOT_X1,
          left: { weights: [0, 1], threshold: 0.62, label: "x₂ < 0.62" },
          right: { weights: [0, 1], threshold: -0.62, label: "x₂ < −0.62" },
        },
        shared: ROOT_X2,
      },
      oblique: {
        independent: {
          root: { weights: [0.78, 1], threshold: 0.05, label: "0.78x₁ + x₂ < 0.05" },
          left: { weights: [-0.45, 1], threshold: -0.75, label: "−0.45x₁ + x₂ < −0.75" },
          right: { weights: [-0.45, 1], threshold: 0.8, label: "−0.45x₁ + x₂ < 0.80" },
        },
        shared: { weights: [-0.45, 1], threshold: 0, label: "−0.45x₁ + x₂ < 0" },
      },
    },
    leafValues: {
      "axis-aligned": [0.08, 0.88, 0.12, 0.92],
      oblique: [0.06, 0.18, 0.82, 0.94],
    },
  },
  {
    id: "xor",
    label: "XOR",
    description: "Alternating quadrants reward a repeated depth-two rule.",
    points: XOR_POINTS,
    rules: {
      "axis-aligned": {
        independent: {
          root: ROOT_X1,
          left: ROOT_X2,
          right: ROOT_X2,
        },
        shared: ROOT_X2,
      },
      oblique: {
        independent: {
          root: { weights: [1, 1], threshold: 0, label: "x₁ + x₂ < 0" },
          left: { weights: [1, -1], threshold: 0, label: "x₁ − x₂ < 0" },
          right: { weights: [1, -1], threshold: 0, label: "x₁ − x₂ < 0" },
        },
        shared: { weights: [1, -1], threshold: 0, label: "x₁ − x₂ < 0" },
      },
    },
    leafValues: {
      "axis-aligned": [0.92, 0.08, 0.08, 0.92],
      oblique: [0.1, 0.9, 0.9, 0.1],
    },
  },
  {
    id: "offset-steps",
    label: "Offset steps",
    description: "Different local thresholds reward independent node rules.",
    points: OFFSET_STEP_POINTS,
    rules: {
      "axis-aligned": {
        independent: {
          root: ROOT_X1,
          left: { weights: [0, 1], threshold: -0.62, label: "x₂ < −0.62" },
          right: { weights: [0, 1], threshold: 0.62, label: "x₂ < 0.62" },
        },
        shared: ROOT_X2,
      },
      oblique: {
        independent: {
          root: { weights: [1, 0.18], threshold: 0, label: "x₁ + 0.18x₂ < 0" },
          left: { weights: [-0.18, 1], threshold: -0.62, label: "−0.18x₁ + x₂ < −0.62" },
          right: { weights: [0.18, 1], threshold: 0.62, label: "0.18x₁ + x₂ < 0.62" },
        },
        shared: { weights: [0, 1], threshold: 0, label: "x₂ < 0" },
      },
    },
    leafValues: {
      "axis-aligned": [0.08, 0.9, 0.1, 0.92],
      oblique: [0.08, 0.9, 0.1, 0.92],
    },
  },
] as const;

// Kept as a stable public alias for consumers that only need the default sample.
export const BUILDER_POINTS = BUILDER_DATASETS[0].points;

const LINEAR_LEAF_SLOPES = [
  { x1: 0.045, x2: 0.035 },
  { x1: 0.055, x2: -0.04 },
  { x1: -0.035, x2: 0.055 },
  { x1: 0.04, x2: 0.035 },
] as const;

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

export function getBuilderDataset(datasetId: BuilderDatasetId): BuilderDataset {
  return BUILDER_DATASETS.find((dataset) => dataset.id === datasetId) ?? BUILDER_DATASETS[0];
}

export function architectureRules(
  architecture: TreeArchitecture,
  datasetId: BuilderDatasetId = DEFAULT_BUILDER_DATASET_ID,
): ArchitectureRules {
  const family = getBuilderDataset(datasetId).rules[architecture.split];
  if (architecture.rules === "independent") return family.independent;
  return {
    root: family.independent.root,
    left: family.shared,
    right: family.shared,
  };
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

export function architectureLeafValues(
  architecture: TreeArchitecture,
  datasetId: BuilderDatasetId = DEFAULT_BUILDER_DATASET_ID,
): LeafValues {
  return getBuilderDataset(datasetId).leafValues[architecture.split];
}

function leafPrediction(
  leafIndex: number,
  x1: number,
  x2: number,
  architecture: TreeArchitecture,
  datasetId: BuilderDatasetId,
): number {
  const base = architectureLeafValues(architecture, datasetId)[leafIndex];
  if (architecture.leaves === "constant") return base;
  const slopes = LINEAR_LEAF_SLOPES[leafIndex];
  return clamp(base + slopes.x1 * x1 + slopes.x2 * x2, 0.03, 0.97);
}

export function predictArchitecture(
  architecture: TreeArchitecture,
  x1: number,
  x2: number,
  datasetId: BuilderDatasetId = DEFAULT_BUILDER_DATASET_ID,
): ArchitecturePrediction {
  const rules = architectureRules(architecture, datasetId);
  const rootRight = rightGate(rules.root, x1, x2, architecture.routing);
  if (architecture.routing === "hard") {
    const onRight = rootRight === 1;
    const childRight = rightGate(onRight ? rules.right : rules.left, x1, x2, "hard");
    const leafIndex = (onRight ? 2 : 0) + childRight;
    const leafWeights: [number, number, number, number] = [0, 0, 0, 0];
    leafWeights[leafIndex] = 1;
    return {
      prediction: leafPrediction(leafIndex, x1, x2, architecture, datasetId),
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
    total + weight * leafPrediction(leafIndex, x1, x2, architecture, datasetId)
  ), 0);

  return { prediction, leafWeights };
}

export function architectureComplexity(architecture: TreeArchitecture): ArchitectureComplexity {
  const distinctRules = architecture.rules === "independent" ? 3 : 2;
  const nodeEvaluations = architecture.routing === "hard" || architecture.rules === "shared-by-depth"
    ? 2
    : 3;

  return {
    distinctRules,
    nodeEvaluations,
  };
}

export function createDecisionSurface(
  architecture: TreeArchitecture,
  steps = 14,
  datasetId: BuilderDatasetId = DEFAULT_BUILDER_DATASET_ID,
): readonly SurfaceCell[] {
  const safeSteps = Math.max(2, Math.floor(steps));
  const span = 4;
  return Array.from({ length: safeSteps * safeSteps }, (_, index) => {
    const column = index % safeSteps;
    const row = Math.floor(index / safeSteps);
    const x1 = -2 + ((column + 0.5) / safeSteps) * span;
    const x2 = 2 - ((row + 0.5) / safeSteps) * span;
    const prediction = predictArchitecture(architecture, x1, x2, datasetId).prediction;
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
