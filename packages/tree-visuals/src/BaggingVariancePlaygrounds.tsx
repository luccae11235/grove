import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./BaggingVariancePlaygrounds.module.css";

export interface SinePoint {
  id: string;
  x: number;
  y: number;
}

export type RegressionTree =
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
      left: RegressionTree;
      right: RegressionTree;
    };

export interface TreeFitFrame {
  depth: number;
  tree: RegressionTree;
}

export interface BaggingEpisode {
  dataset: SinePoint[];
  treeFrames: TreeFitFrame[];
  tree: RegressionTree;
  singlePrediction: number;
  bootstrapTrees: RegressionTree[];
  bootstrapPredictions: number[];
  ensemblePredictions: Record<number, number>;
}

export interface BaggingTrial {
  dataset: SinePoint[];
  trees: RegressionTree[];
  treePredictions: number[];
  means: Record<number, number>;
}

export interface BaggingExperiment {
  treeCounts: number[];
  trials: BaggingTrial[];
  distributions: Record<number, number[]>;
}

export interface HistogramBin {
  lower: number;
  upper: number;
  count: number;
}

type EpisodePhase = "idle" | "sampling" | "fitting" | "predicting" | "transferring" | "committed";
type ExperimentMode = "single" | "ensemble";

const X_MIN = -3;
const X_MAX = 3;
const Y_MIN = -1.55;
const Y_MAX = 1.55;
const X_ZERO = 0.8;
const SAMPLE_SIZE = 38;
const TREE_COUNTS = [1, 2, 5, 10, 25];
const SPEEDS = [0.25, 0.5, 1];
const CHART = {
  width: 720,
  height: 360,
  left: 48,
  plotRight: 522,
  histogramLeft: 578,
  histogramRight: 700,
  top: 31,
  bottom: 314,
};

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

function labelFor(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : `P${index + 1}`;
}

export function generateSineSample(seed: number, count = SAMPLE_SIZE): SinePoint[] {
  const random = createRandom(seed);
  const points = Array.from({ length: count }, (_, index) => {
    const x = X_MIN + random() * (X_MAX - X_MIN);
    return { id: labelFor(index), x, y: Math.sin(x) + normal(random) * 0.28 };
  }).sort((left, right) => left.x - right.x);

  return points.map((point, index) => ({ ...point, id: labelFor(index) }));
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function squaredError(points: SinePoint[], prediction = average(points.map((point) => point.y))): number {
  return points.reduce((sum, point) => sum + (point.y - prediction) ** 2, 0);
}

export function sampleVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const center = average(values);
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length;
}

export function histogramBins(
  values: number[],
  binCount = 12,
  minimum = Y_MIN,
  maximum = Y_MAX,
): HistogramBin[] {
  const width = (maximum - minimum) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    lower: minimum + index * width,
    upper: minimum + (index + 1) * width,
    count: 0,
  }));
  for (const value of values) {
    const index = Math.max(0, Math.min(binCount - 1, Math.floor((value - minimum) / width)));
    bins[index].count += 1;
  }
  return bins;
}

export function fitRegressionTree(
  input: SinePoint[],
  depth = 0,
  maxDepth = 4,
  minimumLeafSize = 2,
): RegressionTree {
  const points = [...input].sort((left, right) => left.x - right.x);
  const prediction = average(points.map((point) => point.y));
  const leaf = (): RegressionTree => ({ kind: "leaf", prediction, sampleCount: points.length, depth });
  if (depth >= maxDepth || points.length < minimumLeafSize * 2) return leaf();

  const parentError = squaredError(points, prediction);
  let best: { threshold: number; error: number; left: SinePoint[]; right: SinePoint[] } | undefined;
  for (let index = minimumLeafSize; index <= points.length - minimumLeafSize; index += 1) {
    const previous = points[index - 1].x;
    const next = points[index].x;
    if (Math.abs(previous - next) < 1e-9) continue;
    const left = points.slice(0, index);
    const right = points.slice(index);
    const error = squaredError(left) + squaredError(right);
    if (!best || error < best.error - 1e-9) {
      best = { threshold: (previous + next) / 2, error, left, right };
    }
  }
  if (!best || parentError - best.error < 1e-6) return leaf();

  return {
    kind: "split",
    prediction,
    sampleCount: points.length,
    depth,
    threshold: best.threshold,
    left: fitRegressionTree(best.left, depth + 1, maxDepth, minimumLeafSize),
    right: fitRegressionTree(best.right, depth + 1, maxDepth, minimumLeafSize),
  };
}

export function fitRegressionTreeWithTrace(input: SinePoint[], maxDepth = 4): TreeFitFrame[] {
  return Array.from({ length: maxDepth + 1 }, (_, depth) => ({
    depth,
    tree: fitRegressionTree(input, 0, depth),
  }));
}

export function predictTree(tree: RegressionTree, x: number): number {
  if (tree.kind === "leaf") return tree.prediction;
  return predictTree(x <= tree.threshold ? tree.left : tree.right, x);
}

export function bootstrapSample(points: SinePoint[], seed: number): SinePoint[] {
  const random = createRandom(seed);
  return Array.from({ length: points.length }, () => points[Math.floor(random() * points.length)]);
}

export function createBaggingEpisode(index: number, maximumTrees = 25): BaggingEpisode {
  const dataset = generateSineSample(120 + index * 83);
  const treeFrames = fitRegressionTreeWithTrace(dataset);
  const tree = treeFrames[treeFrames.length - 1].tree;
  const bootstrapTrees = Array.from({ length: maximumTrees }, (_, treeIndex) =>
    fitRegressionTree(bootstrapSample(dataset, 500_000 + index * 1009 + treeIndex * 37)),
  );
  const bootstrapPredictions = bootstrapTrees.map((candidate) => predictTree(candidate, X_ZERO));
  const ensemblePredictions = Object.fromEntries(
    TREE_COUNTS.filter((count) => count <= maximumTrees).map((count) => [
      count,
      average(bootstrapPredictions.slice(0, count)),
    ]),
  );
  return {
    dataset,
    treeFrames,
    tree,
    singlePrediction: predictTree(tree, X_ZERO),
    bootstrapTrees,
    bootstrapPredictions,
    ensemblePredictions,
  };
}

export function runBaggingExperiment(trialCount = 56, treeCounts = [1, 2, 5, 25]): BaggingExperiment {
  const maximumTrees = Math.max(...treeCounts);
  const trials = Array.from({ length: trialCount }, (_, trialIndex) => {
    const episode = createBaggingEpisode(trialIndex, maximumTrees);
    const means = Object.fromEntries(
      treeCounts.map((count) => [count, average(episode.bootstrapPredictions.slice(0, count))]),
    );
    return {
      dataset: episode.dataset,
      trees: episode.bootstrapTrees,
      treePredictions: episode.bootstrapPredictions,
      means,
    };
  });
  const distributions = Object.fromEntries(
    treeCounts.map((count) => [count, trials.map((trial) => trial.means[count])]),
  );
  return { treeCounts: [...treeCounts], trials, distributions };
}

function xScale(value: number): number {
  return CHART.left + ((value - X_MIN) / (X_MAX - X_MIN)) * (CHART.plotRight - CHART.left);
}

function yScale(value: number): number {
  return CHART.bottom - ((value - Y_MIN) / (Y_MAX - Y_MIN)) * (CHART.bottom - CHART.top);
}

function linePath(values: Array<{ x: number; y: number }>): string {
  return values
    .map((point, index) => `${index === 0 ? "M" : "L"}${xScale(point.x).toFixed(2)},${yScale(point.y).toFixed(2)}`)
    .join(" ");
}

function areaPath(upper: Array<{ x: number; y: number }>, lower: Array<{ x: number; y: number }>): string {
  return `${linePath(upper)} ${lower
    .slice()
    .reverse()
    .map((point) => `L${xScale(point.x).toFixed(2)},${yScale(point.y).toFixed(2)}`)
    .join(" ")} Z`;
}

function curveForTree(tree: RegressionTree): Array<{ x: number; y: number }> {
  return Array.from({ length: 121 }, (_, index) => {
    const x = X_MIN + (index / 120) * (X_MAX - X_MIN);
    return { x, y: predictTree(tree, x) };
  });
}

function averageCurve(trees: RegressionTree[]): Array<{ x: number; y: number }> {
  return Array.from({ length: 121 }, (_, index) => {
    const x = X_MIN + (index / 120) * (X_MAX - X_MIN);
    return { x, y: average(trees.map((tree) => predictTree(tree, x))) };
  });
}

interface LeafInterval {
  lower: number;
  upper: number;
  prediction: number;
}

function collectLeaves(tree: RegressionTree, lower = X_MIN, upper = X_MAX): LeafInterval[] {
  if (tree.kind === "leaf") return [{ lower, upper, prediction: tree.prediction }];
  return [
    ...collectLeaves(tree.left, lower, Math.min(tree.threshold, upper)),
    ...collectLeaves(tree.right, Math.max(tree.threshold, lower), upper),
  ];
}

function format(value: number, digits = 3): string {
  return value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

function phaseLabel(phase: EpisodePhase, mode: ExperimentMode, frame: number, total: number): string {
  if (phase === "idle") return "Ready for a new training episode";
  if (phase === "sampling") return "1 · sample a training dataset";
  if (phase === "fitting") {
    return mode === "single"
      ? `2 · learn the tree · depth ${Math.min(frame, total - 1)} of ${total - 1}`
      : `2 · fit bootstrap tree ${Math.min(frame + 1, total)} of ${total}`;
  }
  if (phase === "predicting") return "3 · predict at the fixed input x₀";
  if (phase === "transferring") return "4 · add the prediction to its distribution";
  return "Episode complete";
}

function phaseHasData(phase: EpisodePhase): boolean {
  return phase !== "idle";
}

function phaseHasCurve(phase: EpisodePhase): boolean {
  return ["fitting", "predicting", "transferring", "committed"].includes(phase);
}

function phaseHasPrediction(phase: EpisodePhase): boolean {
  return ["predicting", "transferring", "committed"].includes(phase);
}

function BootstrapSamplingVisual() {
  const original = ["A", "B", "C", "D", "E", "F"];
  const sampled = ["A", "C", "C", "F", "B", "C"];
  return (
    <figure className={styles.bootstrapFigure} data-bagging-visual="bootstrap">
      <svg viewBox="0 0 720 226" role="img" aria-labelledby="bootstrap-figure-title bootstrap-figure-desc">
        <title id="bootstrap-figure-title">Sampling six observations with replacement</title>
        <desc id="bootstrap-figure-desc">
          The observed dataset contains A through F. The bootstrap sample draws A, C, C, F, B, and C.
          It has the same size, but C repeats and D and E do not appear.
        </desc>
        <text className={styles.staticLabel} x="24" y="37">Observed dataset</text>
        {original.map((label, index) => (
          <g key={`original-${label}`} transform={`translate(${212 + index * 70} 16)`}>
            <rect className={styles.observationBox} width="48" height="42" rx="9" />
            <text className={styles.observationText} x="24" y="27" textAnchor="middle">{label}</text>
          </g>
        ))}
        <path className={styles.bootstrapArrow} d="M360 71V115" />
        <text className={styles.drawLabel} x="375" y="98">six draws · replace after each draw</text>
        <text className={styles.staticLabel} x="24" y="159">Bootstrap sample</text>
        {sampled.map((label, index) => (
          <g key={`sampled-${index}`} transform={`translate(${212 + index * 70} 137)`}>
            <rect className={label === "C" ? styles.repeatedObservationBox : styles.observationBox} width="48" height="42" rx="9" />
            <text className={styles.observationText} x="24" y="27" textAnchor="middle">{label}</text>
          </g>
        ))}
        <path className={styles.repeatGuide} d="M306 190H446" />
        <text className={styles.repeatLabel} x="376" y="213" textAnchor="middle">C can be drawn again</text>
      </svg>
      <figcaption>
        The bootstrap sample has the same size. Some observations repeat; others do not appear.
      </figcaption>
    </figure>
  );
}

export function BaggingEnsembleOverview() {
  return (
    <figure className={styles.overview} data-bagging-visual="overview">
      <svg viewBox="0 0 720 184" role="img" aria-labelledby="bagging-overview-title bagging-overview-desc">
        <title id="bagging-overview-title">Three tree predictions become one ensemble prediction</title>
        <desc id="bagging-overview-desc">
          Three trees predict 0.42, 0.70, and 0.31 at the same input. Their arithmetic mean, 0.48,
          is the bagged prediction.
        </desc>
        {[0.42, 0.7, 0.31].map((prediction, index) => (
          <g key={prediction} transform={`translate(${70 + index * 135} 34)`}>
            <path className={styles.smallTree} d="M25 0V23M25 23L7 43M25 23L43 43" />
            <circle className={styles.smallTreeNode} cx="25" cy="0" r="6" />
            <circle className={styles.smallTreeNode} cx="7" cy="43" r="5" />
            <circle className={styles.smallTreeNode} cx="43" cy="43" r="5" />
            <text className={styles.treePrediction} x="25" y="76" textAnchor="middle">{prediction.toFixed(2)}</text>
          </g>
        ))}
        <path className={styles.averageArrow} d="M465 74H535" />
        <text className={styles.averageWord} x="500" y="60" textAnchor="middle">average</text>
        <circle className={styles.averageResult} cx="615" cy="74" r="42" />
        <text className={styles.averageValue} x="615" y="81" textAnchor="middle">0.48</text>
        <text className={styles.overviewDirectLabel} x="615" y="143" textAnchor="middle">ensemble prediction</text>
      </svg>
      <figcaption>Different trees may disagree. Bagging makes their average the model's answer.</figcaption>
    </figure>
  );
}

function ExperimentChart({
  mode,
  episode,
  phase,
  frame,
  treeCount,
  history,
  showProcess,
  reducedMotion,
}: {
  mode: ExperimentMode;
  episode: BaggingEpisode;
  phase: EpisodePhase;
  frame: number;
  treeCount: number;
  history: number[];
  showProcess: boolean;
  reducedMotion: boolean;
}) {
  const [activeLeaf, setActiveLeaf] = useState<number | null>(null);
  const dataVisible = phaseHasData(phase);
  const curveVisible = phaseHasCurve(phase);
  const predictionVisible = phaseHasPrediction(phase);
  const singleTree = episode.treeFrames[Math.min(frame, episode.treeFrames.length - 1)].tree;
  const includedTreeCount = Math.min(Math.max(frame + 1, 1), treeCount);
  const ensembleTrees = episode.bootstrapTrees.slice(0, includedTreeCount);
  const displayedTree = mode === "single" ? singleTree : episode.bootstrapTrees[includedTreeCount - 1];
  const interactionTree = mode === "single" ? singleTree : displayedTree;
  const leaves = collectLeaves(interactionTree);
  const prediction = mode === "single"
    ? episode.singlePrediction
    : episode.ensemblePredictions[treeCount];
  const bins = histogramBins(history);
  const maximumBin = Math.max(1, ...bins.map((bin) => bin.count));
  const process = Array.from({ length: 121 }, (_, index) => {
    const x = X_MIN + (index / 120) * (X_MAX - X_MIN);
    return { x, y: Math.sin(x) };
  });
  const outerUpper = process.map(({ x, y }) => ({ x, y: y + 0.56 }));
  const outerLower = process.map(({ x, y }) => ({ x, y: y - 0.56 }));
  const innerUpper = process.map(({ x, y }) => ({ x, y: y + 0.28 }));
  const innerLower = process.map(({ x, y }) => ({ x, y: y - 0.28 }));
  const activeBounds = activeLeaf === null ? undefined : leaves[activeLeaf];
  const curve = mode === "single" ? curveForTree(singleTree) : averageCurve(ensembleTrees);
  const currentTreeCurve = mode === "ensemble" ? curveForTree(displayedTree) : undefined;
  const transferStyle = { "--prediction-travel": `${CHART.histogramLeft - xScale(X_ZERO)}px` } as CSSProperties;

  const inspectLeaf = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Escape") {
      setActiveLeaf(null);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    setActiveLeaf((current) => {
      const start = current ?? (direction > 0 ? -1 : 0);
      return (start + direction + leaves.length) % leaves.length;
    });
  };

  return (
    <svg
      className={styles.experimentChart}
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      role="img"
      tabIndex={0}
      onKeyDown={inspectLeaf}
      onPointerLeave={() => setActiveLeaf(null)}
      aria-labelledby={`${mode}-chart-title ${mode}-chart-desc`}
    >
      <title id={`${mode}-chart-title`}>
        {mode === "single" ? "One tree feeding a prediction histogram" : "A bagged ensemble feeding a prediction histogram"}
      </title>
      <desc id={`${mode}-chart-desc`}>
        The input x zero and chart scales stay fixed. Each completed episode adds one prediction at the same
        vertical position to the histogram. Use the left and right arrow keys to inspect learned leaves.
      </desc>

      {[Y_MIN, -1, 0, 1, Y_MAX].map((tick) => (
        <line className={styles.gridline} x1={CHART.left} x2={CHART.histogramRight} y1={yScale(tick)} y2={yScale(tick)} key={`grid-${tick}`} />
      ))}
      {[-1, 0, 1].map((tick) => (
        <text className={styles.tick} x={CHART.left - 10} y={yScale(tick) + 5} textAnchor="end" key={`y-${tick}`}>{tick}</text>
      ))}
      {[-3, -1.5, 0, 1.5, 3].map((tick) => (
        <g key={`x-${tick}`}>
          <line className={styles.xTick} x1={xScale(tick)} x2={xScale(tick)} y1={CHART.bottom} y2={CHART.bottom + 6} />
          <text className={styles.tick} x={xScale(tick)} y={CHART.bottom + 22} textAnchor="middle">{tick}</text>
        </g>
      ))}

      {showProcess && (
        <g className={styles.processLayer} data-process-layer>
          <path className={styles.outerBand} d={areaPath(outerUpper, outerLower)} />
          <path className={styles.innerBand} d={areaPath(innerUpper, innerLower)} />
          <path className={styles.trueCurve} d={linePath(process)} />
        </g>
      )}

      <line className={styles.axis} x1={CHART.left} x2={CHART.plotRight} y1={CHART.bottom} y2={CHART.bottom} />
      <line className={styles.axis} x1={CHART.left} x2={CHART.left} y1={CHART.top} y2={CHART.bottom} />
      <text className={styles.axisLabel} x={(CHART.left + CHART.plotRight) / 2} y="356" textAnchor="middle">input x</text>
      <line className={styles.fixedInput} x1={xScale(X_ZERO)} x2={xScale(X_ZERO)} y1={CHART.top} y2={CHART.bottom} />
      <text className={styles.fixedInputLabel} x={xScale(X_ZERO) + 8} y={CHART.top + 18}>fixed x₀</text>

      {curveVisible && currentTreeCurve && (
        <path className={styles.currentTreeCurve} d={linePath(currentTreeCurve)} />
      )}
      {curveVisible && <path className={styles.modelCurve} d={linePath(curve)} />}
      {curveVisible && leaves.map((leaf, index) => (
        <line
          className={`${styles.leafHitArea} ${activeLeaf === index ? styles.activeLeaf : ""}`}
          x1={xScale(leaf.lower)}
          x2={xScale(leaf.upper)}
          y1={yScale(leaf.prediction)}
          y2={yScale(leaf.prediction)}
          onPointerEnter={() => setActiveLeaf(index)}
          key={`leaf-${leaf.lower}`}
        />
      ))}

      {episode.dataset.map((point) => {
        const leafIndex = leaves.findIndex((leaf, index) =>
          point.x >= leaf.lower && (point.x < leaf.upper || index === leaves.length - 1),
        );
        const dimmed = activeBounds && (point.x < activeBounds.lower || point.x > activeBounds.upper);
        return (
          <circle
            className={`${styles.samplePoint} ${dimmed ? styles.dimmedPoint : ""}`}
            cx={xScale(point.x)}
            cy={yScale(point.y)}
            r="5"
            opacity={dataVisible ? 1 : 0}
            onPointerEnter={() => setActiveLeaf(Math.max(0, leafIndex))}
            key={`${point.id}-${point.x}`}
          />
        );
      })}

      <text className={styles.histogramTitle} x={(CHART.histogramLeft + CHART.histogramRight) / 2} y="19" textAnchor="middle">predictions at x₀</text>
      <line className={styles.histogramAxis} x1={CHART.histogramLeft} x2={CHART.histogramLeft} y1={CHART.top} y2={CHART.bottom} />
      {bins.map((bin, index) => {
        const top = yScale(bin.upper);
        const bottom = yScale(bin.lower);
        const width = (bin.count / maximumBin) * (CHART.histogramRight - CHART.histogramLeft - 8);
        return (
          <rect
            className={styles.histogramBar}
            x={CHART.histogramLeft}
            y={top + 1}
            width={width}
            height={Math.max(0, bottom - top - 2)}
            key={`bin-${index}`}
          />
        );
      })}
      <text className={styles.histogramCount} x={CHART.histogramLeft} y={CHART.bottom + 22}>
        {history.length} {history.length === 1 ? "episode" : "episodes"}
      </text>

      {predictionVisible && phase !== "transferring" && (
        <g>
          <circle className={styles.predictionMarker} cx={xScale(X_ZERO)} cy={yScale(prediction)} r="7" />
          <text className={styles.predictionLabel} x={xScale(X_ZERO) + 12} y={yScale(prediction) - 11}>{format(prediction, 2)}</text>
        </g>
      )}
      {phase === "transferring" && (
        <circle
          className={reducedMotion ? styles.reducedTransferMarker : styles.transferMarker}
          cx={xScale(X_ZERO)}
          cy={yScale(prediction)}
          r="7"
          style={transferStyle}
        />
      )}
    </svg>
  );
}

function VarianceExperiment({ mode }: { mode: ExperimentMode }) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<EpisodePhase>("idle");
  const [frame, setFrame] = useState(0);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [speed, setSpeed] = useState(0.25);
  const [treeCount, setTreeCount] = useState(5);
  const [showProcess, setShowProcess] = useState(false);
  const [singleHistory, setSingleHistory] = useState<number[]>([]);
  const [ensembleHistories, setEnsembleHistories] = useState<Record<number, number[]>>(
    Object.fromEntries(TREE_COUNTS.map((count) => [count, []])),
  );
  const episode = useMemo(() => createBaggingEpisode(episodeIndex), [episodeIndex]);
  const history = mode === "single" ? singleHistory : ensembleHistories[treeCount];
  const fitSteps = mode === "single" ? episode.treeFrames.length : treeCount;
  const prediction = mode === "single" ? episode.singlePrediction : episode.ensemblePredictions[treeCount];

  useEffect(() => {
    if (!running) return undefined;
    const multiplier = reducedMotion ? 1 : 1 / speed;
    let timeout: ReturnType<typeof setTimeout>;
    if (phase === "sampling") {
      timeout = setTimeout(() => {
        setFrame(0);
        setPhase("fitting");
      }, (reducedMotion ? 260 : 120) * multiplier);
    } else if (phase === "fitting") {
      const frameDuration = (reducedMotion ? 700 : 470 * multiplier) / fitSteps;
      timeout = setTimeout(() => {
        if (frame < fitSteps - 1) setFrame((value) => value + 1);
        else setPhase("predicting");
      }, frameDuration);
    } else if (phase === "predicting") {
      timeout = setTimeout(() => setPhase("transferring"), (reducedMotion ? 280 : 150) * multiplier);
    } else if (phase === "transferring") {
      timeout = setTimeout(() => {
        if (mode === "single") {
          setSingleHistory((values) => [...values, episode.singlePrediction]);
        } else {
          setEnsembleHistories((histories) => Object.fromEntries(
            TREE_COUNTS.map((count) => [count, [...histories[count], episode.ensemblePredictions[count]]]),
          ));
        }
        setPhase("committed");
      }, (reducedMotion ? 300 : 210) * multiplier);
    } else if (phase === "committed") {
      if (autoplay && !reducedMotion) {
        timeout = setTimeout(() => {
          setEpisodeIndex((value) => value + 1);
          setFrame(0);
          setPhase("sampling");
        }, 50 * multiplier);
      } else {
        setRunning(false);
      }
    }
    return () => clearTimeout(timeout);
  }, [autoplay, episode, fitSteps, frame, mode, phase, reducedMotion, running, speed]);

  const start = (automatic: boolean) => {
    setAutoplay(automatic && !reducedMotion);
    setRunning(true);
    if (phase === "idle") setPhase("sampling");
    if (phase === "committed") {
      setEpisodeIndex((value) => value + 1);
      setFrame(0);
      setPhase("sampling");
    }
  };

  const reset = () => {
    setRunning(false);
    setAutoplay(false);
    setPhase("idle");
    setFrame(0);
    setEpisodeIndex(0);
    setSingleHistory([]);
    setEnsembleHistories(Object.fromEntries(TREE_COUNTS.map((count) => [count, []])));
  };

  const selectTreeCount = (count: number) => {
    setRunning(false);
    setAutoplay(false);
    setTreeCount(count);
    setPhase("idle");
    setFrame(0);
  };

  const title = mode === "single" ? "Watch one tree create model variance" : "Watch the ensemble prediction settle";
  const question = mode === "single"
    ? "Each episode changes only the sampled training data. Watch the learned tree and its answer at the same x₀."
    : "Each episode fits bootstrap trees and averages them. Only the final average enters the histogram.";
  const stage = phaseLabel(phase, mode, frame, fitSteps);
  const visibleCount = mode === "single" ? singleHistory.length : ensembleHistories[treeCount].length;

  return (
    <section
      className={styles.experiment}
      aria-labelledby={`${mode}-experiment-title`}
      data-bagging-visual={mode === "single" ? "variance" : "ensemble"}
      data-phase={phase}
      data-episode={episodeIndex + 1}
      data-playing={running}
      data-tree-count={mode === "ensemble" ? treeCount : undefined}
      data-history-count={visibleCount}
    >
      <header className={styles.experimentHeader}>
        <p>{mode === "single" ? "One unstable tree" : "One bagged model"}</p>
        <h3 id={`${mode}-experiment-title`}>{title}</h3>
        <span>{question}</span>
      </header>

      {mode === "ensemble" && (
        <div className={styles.treeCountControl} aria-label="Trees in each ensemble">
          <span>Trees</span>
          {TREE_COUNTS.map((count) => (
            <button type="button" aria-pressed={treeCount === count} onClick={() => selectTreeCount(count)} key={count}>{count}</button>
          ))}
        </div>
      )}

      <div className={styles.stageLine} aria-hidden="true">
        {stage}
        {mode === "ensemble" && phase === "fitting" ? <strong>running mean {format(average(episode.bootstrapPredictions.slice(0, Math.min(frame + 1, treeCount))), 2)}</strong> : null}
      </div>

      <ExperimentChart
        mode={mode}
        episode={episode}
        phase={phase}
        frame={frame}
        treeCount={treeCount}
        history={history}
        showProcess={showProcess}
        reducedMotion={reducedMotion}
      />

      <div className={styles.experimentControls}>
        <div className={styles.playControls}>
          <button className={styles.primaryButton} type="button" onClick={() => running ? setRunning(false) : start(true)} disabled={reducedMotion && !running}>
            {running ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={() => start(false)} disabled={running}>Run one episode</button>
          <button type="button" onClick={reset} disabled={phase === "idle" && visibleCount === 0}>Reset</button>
        </div>
        <div className={styles.speedControls} aria-label="Episode speed">
          <span>Speed</span>
          {SPEEDS.map((value) => (
            <button type="button" aria-pressed={speed === value} onClick={() => setSpeed(value)} disabled={reducedMotion} key={value}>{value}×</button>
          ))}
        </div>
        <button className={styles.processButton} type="button" aria-pressed={showProcess} onClick={() => setShowProcess((value) => !value)}>
          {showProcess ? "Hide data process" : "Show data process"}
        </button>
      </div>
      {reducedMotion && <p className={styles.motionNote}>Autoplay is off because reduced motion is enabled. Run one episode to step through the same sequence.</p>}
      <p className={styles.liveStatus} aria-live="polite">
        {phase === "committed"
          ? `Episode ${episodeIndex + 1} added ${format(prediction, 2)}. ${visibleCount} completed ${visibleCount === 1 ? "episode" : "episodes"}; empirical variance ${visibleCount > 1 ? format(sampleVariance(history)) : "needs two episodes"}.`
          : stage}
      </p>
    </section>
  );
}

export function TreeVariancePlayground() {
  return <VarianceExperiment mode="single" />;
}

export function BaggingDistributionPlayground() {
  return <VarianceExperiment mode="ensemble" />;
}

export function BootstrapSamplesPlayground() {
  return <BootstrapSamplingVisual />;
}
