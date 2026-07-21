import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./RegressionTreePlaygrounds.module.css";

interface CropRow {
  id: string;
  fertilizer: number;
  yield: number;
}

interface RegressionCandidate {
  threshold: number;
  leftIndices: number[];
  rightIndices: number[];
  leftMean: number;
  rightMean: number;
  leftVariance: number;
  rightVariance: number;
  leftError: number;
  rightError: number;
  splitError: number;
  improvement: number;
}

type StopMode = "depth" | "leaf-size" | "variance";

interface StopConfig {
  mode: StopMode;
  value: number;
}

interface RegressionLeaf {
  kind: "leaf";
  id: string;
  depth: number;
  indices: number[];
  prediction: number;
  variance: number;
  error: number;
  stopReason: string;
}

interface RegressionSplit {
  kind: "split";
  id: string;
  depth: number;
  indices: number[];
  prediction: number;
  variance: number;
  error: number;
  threshold: number;
  improvement: number;
  left: RegressionNode;
  right: RegressionNode;
}

type RegressionNode = RegressionLeaf | RegressionSplit;

interface GrowthEvent {
  nodeId: string;
  kind: "split" | "stop";
  sampleCount: number;
  prediction: number;
  variance: number;
  threshold?: number;
  improvement?: number;
  reason?: string;
}

interface VisibleRegion {
  node: RegressionNode;
  xMin: number;
  xMax: number;
}

const CROPS: CropRow[] = [
  { id: "A", fertilizer: 0, yield: 1.5 },
  { id: "B", fertilizer: 20, yield: 2.4 },
  { id: "C", fertilizer: 40, yield: 3.8 },
  { id: "D", fertilizer: 60, yield: 5.1 },
  { id: "E", fertilizer: 80, yield: 5.7 },
  { id: "F", fertilizer: 100, yield: 5.4 },
  { id: "G", fertilizer: 120, yield: 4.8 },
  { id: "H", fertilizer: 140, yield: 4.2 },
  { id: "I", fertilizer: 160, yield: 3.7 },
];

const ALL_INDICES = CROPS.map((_, index) => index);
const EPSILON = 1e-9;
const MINIMUM_ROWS_PER_LEAF = 2;

const PLOT = {
  width: 640,
  height: 330,
  left: 58,
  right: 20,
  top: 22,
  bottom: 52,
};

const plotRight = PLOT.width - PLOT.right;
const plotBottom = PLOT.height - PLOT.bottom;
const xScale = (value: number) => PLOT.left + (value / 160) * (plotRight - PLOT.left);
const yScale = (value: number) => plotBottom - ((value - 1) / 5) * (plotBottom - PLOT.top);

function mean(indices: number[]): number {
  return indices.reduce((sum, index) => sum + CROPS[index].yield, 0) / indices.length;
}

function squaredError(indices: number[], prediction = mean(indices)): number {
  return indices.reduce((sum, index) => sum + (CROPS[index].yield - prediction) ** 2, 0);
}

function variance(indices: number[], prediction = mean(indices)): number {
  return squaredError(indices, prediction) / indices.length;
}

function candidatesFor(indices: number[], minimumLeafSize = 1): RegressionCandidate[] {
  const ordered = [...indices].sort(
    (left, right) => CROPS[left].fertilizer - CROPS[right].fertilizer,
  );
  const parentError = squaredError(ordered);
  const candidates: RegressionCandidate[] = [];

  for (let position = 1; position < ordered.length; position += 1) {
    const previous = CROPS[ordered[position - 1]].fertilizer;
    const next = CROPS[ordered[position]].fertilizer;
    if (Math.abs(previous - next) < EPSILON) continue;

    const threshold = (previous + next) / 2;
    const leftIndices = ordered.filter((index) => CROPS[index].fertilizer <= threshold);
    const rightIndices = ordered.filter((index) => CROPS[index].fertilizer > threshold);
    if (leftIndices.length < minimumLeafSize || rightIndices.length < minimumLeafSize) continue;

    const leftMean = mean(leftIndices);
    const rightMean = mean(rightIndices);
    const leftError = squaredError(leftIndices, leftMean);
    const rightError = squaredError(rightIndices, rightMean);
    const splitError = leftError + rightError;
    candidates.push({
      threshold,
      leftIndices,
      rightIndices,
      leftMean,
      rightMean,
      leftVariance: leftError / leftIndices.length,
      rightVariance: rightError / rightIndices.length,
      leftError,
      rightError,
      splitError,
      improvement: parentError - splitError,
    });
  }

  return candidates;
}

const ROOT_CANDIDATES = candidatesFor(ALL_INDICES);
const ROOT_MEAN = mean(ALL_INDICES);
const ROOT_ERROR = squaredError(ALL_INDICES, ROOT_MEAN);

function format(value: number, digits = 2): string {
  const fixed = value.toFixed(digits);
  return digits === 0 ? fixed : fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function rowWord(count: number): string {
  return count === 1 ? "row" : "rows";
}

function bestCandidate(candidates: RegressionCandidate[]): RegressionCandidate | null {
  return candidates.reduce<RegressionCandidate | null>(
    (best, candidate) =>
      best === null || candidate.splitError < best.splitError - EPSILON ? candidate : best,
    null,
  );
}

function CropPlot({
  candidate,
  regions,
  committedThresholds = [],
  titleId,
  descriptionId,
}: {
  candidate?: RegressionCandidate | null;
  regions?: VisibleRegion[];
  committedThresholds?: number[];
  titleId: string;
  descriptionId: string;
}) {
  const splitX = candidate ? xScale(candidate.threshold) : null;
  return (
    <svg
      className={styles.cropPlot}
      viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>Crop yield by fertilizer amount</title>
      <desc id={descriptionId}>
        Nine crop observations form a curved pattern. Vertical residual lines connect each
        observation to the mean prediction for its current group.
      </desc>

      {[1, 2, 3, 4, 5, 6].map((tick) => (
        <g key={`y-${tick}`}>
          <line className={styles.gridline} x1={PLOT.left} x2={plotRight} y1={yScale(tick)} y2={yScale(tick)} />
          <text className={styles.tick} x={PLOT.left - 10} y={yScale(tick) + 4} textAnchor="end">{tick}</text>
        </g>
      ))}
      {[0, 20, 40, 60, 80, 100, 120, 140, 160].map((tick) => (
        <g key={`x-${tick}`}>
          <line className={styles.gridline} x1={xScale(tick)} x2={xScale(tick)} y1={PLOT.top} y2={plotBottom} />
          <text className={styles.tick} x={xScale(tick)} y={plotBottom + 20} textAnchor="middle">{tick}</text>
        </g>
      ))}

      {regions?.map(({ node, xMin, xMax }) => (
        <g key={`prediction-${node.id}`}>
          <line
            className={styles.predictionLine}
            x1={xScale(xMin)}
            x2={xScale(xMax)}
            y1={yScale(node.prediction)}
            y2={yScale(node.prediction)}
          />
          {node.indices.map((index) => (
            <line
              className={styles.residualLine}
              x1={xScale(CROPS[index].fertilizer)}
              x2={xScale(CROPS[index].fertilizer)}
              y1={yScale(CROPS[index].yield)}
              y2={yScale(node.prediction)}
              key={`visible-residual-${node.id}-${index}`}
            />
          ))}
        </g>
      ))}

      {candidate && (
        <>
          <rect className={styles.leftRegion} x={PLOT.left} y={PLOT.top} width={(splitX ?? PLOT.left) - PLOT.left} height={plotBottom - PLOT.top} />
          <rect className={styles.rightRegion} x={splitX ?? PLOT.left} y={PLOT.top} width={plotRight - (splitX ?? PLOT.left)} height={plotBottom - PLOT.top} />
          {candidate.leftIndices.concat(candidate.rightIndices).map((index) => {
            const prediction = candidate.leftIndices.includes(index) ? candidate.leftMean : candidate.rightMean;
            return (
              <line
                className={styles.residualLine}
                x1={xScale(CROPS[index].fertilizer)}
                x2={xScale(CROPS[index].fertilizer)}
                y1={yScale(CROPS[index].yield)}
                y2={yScale(prediction)}
                key={`candidate-residual-${index}`}
              />
            );
          })}
          <line className={styles.meanLine} x1={PLOT.left} x2={splitX ?? PLOT.left} y1={yScale(candidate.leftMean)} y2={yScale(candidate.leftMean)} />
          <line className={styles.meanLine} x1={splitX ?? PLOT.left} x2={plotRight} y1={yScale(candidate.rightMean)} y2={yScale(candidate.rightMean)} />
          <line className={styles.candidateLine} x1={splitX ?? 0} x2={splitX ?? 0} y1={PLOT.top} y2={plotBottom} />
          <text className={styles.splitLabel} x={(splitX ?? 0) + 7} y={PLOT.top + 16}>≤ {format(candidate.threshold, 0)}</text>
        </>
      )}

      {!candidate && committedThresholds.map((threshold) => (
        <line
          className={styles.committedLine}
          x1={xScale(threshold)}
          x2={xScale(threshold)}
          y1={PLOT.top}
          y2={plotBottom}
          key={`committed-${threshold}`}
        />
      ))}

      <line className={styles.axis} x1={PLOT.left} x2={plotRight} y1={plotBottom} y2={plotBottom} />
      <line className={styles.axis} x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={plotBottom} />

      {CROPS.map((row) => (
        <g className={styles.cropPoint} key={row.id}>
          <circle cx={xScale(row.fertilizer)} cy={yScale(row.yield)} r="6.5" />
          <text x={xScale(row.fertilizer) + 9} y={yScale(row.yield) - 8}>{row.id}</text>
        </g>
      ))}

      <text className={styles.axisLabel} x={(PLOT.left + plotRight) / 2} y={PLOT.height - 8} textAnchor="middle">Fertilizer (kg/hectare)</text>
      <text className={styles.axisLabel} x="14" y={(PLOT.top + plotBottom) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(PLOT.top + plotBottom) / 2})`}>Yield (tons/hectare)</text>
    </svg>
  );
}

function MetricTrace({
  label,
  values,
  visitedCount,
  selectedIndex,
  lowerIsBetter = false,
}: {
  label: string;
  values: number[];
  visitedCount: number;
  selectedIndex: number;
  lowerIsBetter?: boolean;
}) {
  const chart = { width: 520, height: 112, left: 44, right: 500, top: 20, bottom: 74 };
  const maximum = Math.max(...values, 0.001) * 1.08;
  const xFor = (index: number) => chart.left + (index / Math.max(1, values.length - 1)) * (chart.right - chart.left);
  const yFor = (value: number) => chart.bottom - (value / maximum) * (chart.bottom - chart.top);
  const visitedPoints = values
    .slice(0, visitedCount)
    .map((value, index) => `${xFor(index)},${yFor(value)}`)
    .join(" ");

  return (
    <div className={styles.metricTrace}>
      <div className={styles.metricTraceHeader}>
        <strong>{label}</strong>
        <span>{lowerIsBetter ? "lower is better" : "for the current group"}</span>
      </div>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`${label} for each tested fertilizer threshold`}>
        <line className={styles.traceAxis} x1={chart.left} x2={chart.right} y1={chart.bottom} y2={chart.bottom} />
        {visitedCount > 1 && <polyline className={styles.tracePath} points={visitedPoints} />}
        {values.map((value, index) => {
          const visited = index < visitedCount;
          const current = index === selectedIndex;
          return (
            <g className={`${styles.tracePoint} ${visited ? styles.tracePointVisited : ""} ${current ? styles.tracePointCurrent : ""}`} key={`${label}-${index}`}>
              <circle cx={xFor(index)} cy={visited ? yFor(value) : chart.bottom} r={current ? 5 : 3.5} />
              <text x={xFor(index)} y={chart.bottom + 18} textAnchor="middle">{ROOT_CANDIDATES[index].threshold}</text>
            </g>
          );
        })}
        <text className={styles.traceValue} x={chart.right} y="13" textAnchor="end">
          current: {format(values[selectedIndex], 3)}
        </text>
      </svg>
    </div>
  );
}

export function RegressionSplitPlayground() {
  const [visitedCount, setVisitedCount] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const candidate = ROOT_CANDIDATES[selectedIndex];
  const done = visitedCount === ROOT_CANDIDATES.length;
  const bestSoFar = bestCandidate(ROOT_CANDIDATES.slice(0, visitedCount));

  useEffect(() => {
    if (!playing) return undefined;
    if (visitedCount >= ROOT_CANDIDATES.length) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setVisitedCount((count) => Math.min(ROOT_CANDIDATES.length, count + 1));
      setSelectedIndex((index) => Math.min(ROOT_CANDIDATES.length - 1, index + 1));
    }, 720);
    return () => window.clearTimeout(timer);
  }, [playing, visitedCount]);

  const chooseIndex = (index: number) => {
    setPlaying(false);
    setSelectedIndex(index);
    setVisitedCount((count) => Math.max(count, index + 1));
  };

  const testNext = () => {
    setPlaying(false);
    const next = Math.min(ROOT_CANDIDATES.length - 1, visitedCount);
    setVisitedCount((count) => Math.min(ROOT_CANDIDATES.length, count + 1));
    setSelectedIndex(next);
  };

  const runFullSweep = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (done) {
      setVisitedCount(1);
      setSelectedIndex(0);
      setPlaying(!reducedMotion);
      return;
    }
    if (reducedMotion) {
      const winner = bestCandidate(ROOT_CANDIDATES);
      setVisitedCount(ROOT_CANDIDATES.length);
      setSelectedIndex(winner ? ROOT_CANDIDATES.indexOf(winner) : 0);
      return;
    }
    setPlaying(true);
  };

  return (
    <section className={styles.workshop} aria-labelledby="regression-split-title">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Playground 1 · judge every split</p>
          <h2 id="regression-split-title">Sweep the fertilizer thresholds</h2>
        </div>
        <span className={styles.stepPill}>{visitedCount} of {ROOT_CANDIDATES.length} thresholds tested</span>
      </header>

      <div className={styles.controls}>
        <label className={styles.thresholdControl}>
          <span>Threshold</span>
          <input
            type="range"
            min="0"
            max={ROOT_CANDIDATES.length - 1}
            step="1"
            value={selectedIndex}
            aria-label="Fertilizer threshold"
            aria-valuetext={`fertilizer at or below ${format(candidate.threshold, 0)} kilograms per hectare`}
            onChange={(event) => chooseIndex(Number(event.target.value))}
          />
          <strong>fertilizer ≤ {format(candidate.threshold, 0)} kg/ha</strong>
        </label>
        <div className={styles.controlButtons}>
          <button type="button" onClick={testNext} disabled={done}>Next threshold →</button>
          <button className={styles.primaryButton} type="button" onClick={runFullSweep}>
            {playing ? "Pause" : done ? "Start sweep again" : "Run the full sweep"}
          </button>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        Current threshold: fertilizer at or below {format(candidate.threshold, 0)} kilograms per hectare.
        Split error {format(candidate.splitError, 3)}.
      </p>

      <div className={styles.splitLayout}>
        <div className={styles.plotPanel}>
          <div className={styles.panelTitle}>Data and two group predictions</div>
          <div className={styles.chartScroll} role="region" aria-label="Crop-yield chart" tabIndex={0}>
            <CropPlot candidate={candidate} titleId="regression-split-plot-title" descriptionId="regression-split-plot-description" />
          </div>
          <div className={styles.groupCards}>
            <div>
              <span>Left · {candidate.leftIndices.length} {rowWord(candidate.leftIndices.length)}</span>
              <strong>mean {format(candidate.leftMean)} tons/ha</strong>
              <small>variance {format(candidate.leftVariance, 3)}</small>
            </div>
            <div>
              <span>Right · {candidate.rightIndices.length} {rowWord(candidate.rightIndices.length)}</span>
              <strong>mean {format(candidate.rightMean)} tons/ha</strong>
              <small>variance {format(candidate.rightVariance, 3)}</small>
            </div>
          </div>
          <div className={styles.equation}>
            <span>split error</span>
            <strong>{candidate.leftIndices.length} × {format(candidate.leftVariance, 3)}</strong>
            <b>+</b>
            <strong>{candidate.rightIndices.length} × {format(candidate.rightVariance, 3)}</strong>
            <b>=</b>
            <em>{format(candidate.splitError, 3)}</em>
          </div>
        </div>

        <div className={styles.tracePanel}>
          <div className={styles.panelTitle}>Split error across tested thresholds</div>
          <MetricTrace label="Split error" values={ROOT_CANDIDATES.map((item) => item.splitError)} visitedCount={visitedCount} selectedIndex={selectedIndex} lowerIsBetter />
          {bestSoFar && (
            <div className={styles.bestSoFar}>
              <span>{done ? "Winner of the sweep" : "Lowest error so far"}</span>
              <strong>fertilizer ≤ {format(bestSoFar.threshold, 0)} kg/ha</strong>
              <small>split error {format(bestSoFar.splitError, 3)} · improvement {format(bestSoFar.improvement, 3)}</small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function stopReason(indices: number[], depth: number, config: StopConfig): string | null {
  if (indices.length <= 1) return "Only one training row remains.";
  if (variance(indices) <= EPSILON) return "Every target in this leaf is already the same.";
  if (config.mode === "depth" && depth >= config.value) return `The maximum depth of ${config.value} was reached.`;
  if (config.mode === "variance" && variance(indices) <= config.value) return `Variance is at or below ${format(config.value, 2)}.`;
  return null;
}

function growTree(indices: number[], depth: number, id: string, config: StopConfig): RegressionNode {
  const prediction = mean(indices);
  const nodeVariance = variance(indices, prediction);
  const error = squaredError(indices, prediction);
  const reason = stopReason(indices, depth, config);
  if (reason) {
    return { kind: "leaf", id, depth, indices, prediction, variance: nodeVariance, error, stopReason: reason };
  }

  const minimumLeafSize = config.mode === "leaf-size" ? config.value : MINIMUM_ROWS_PER_LEAF;
  const winner = bestCandidate(candidatesFor(indices, minimumLeafSize));
  if (!winner || winner.improvement <= EPSILON) {
    const noSplitReason = `No split can leave at least ${minimumLeafSize} rows on each side while reducing the squared error.`;
    return { kind: "leaf", id, depth, indices, prediction, variance: nodeVariance, error, stopReason: noSplitReason };
  }

  return {
    kind: "split",
    id,
    depth,
    indices,
    prediction,
    variance: nodeVariance,
    error,
    threshold: winner.threshold,
    improvement: winner.improvement,
    left: growTree(winner.leftIndices, depth + 1, `${id}.left`, config),
    right: growTree(winner.rightIndices, depth + 1, `${id}.right`, config),
  };
}

function collectGrowthEvents(node: RegressionNode, events: GrowthEvent[] = []): GrowthEvent[] {
  if (node.kind === "leaf") {
    events.push({
      nodeId: node.id,
      kind: "stop",
      sampleCount: node.indices.length,
      prediction: node.prediction,
      variance: node.variance,
      reason: node.stopReason,
    });
    return events;
  }
  events.push({
    nodeId: node.id,
    kind: "split",
    sampleCount: node.indices.length,
    prediction: node.prediction,
    variance: node.variance,
    threshold: node.threshold,
    improvement: node.improvement,
  });
  collectGrowthEvents(node.left, events);
  collectGrowthEvents(node.right, events);
  return events;
}

function collectVisibleRegions(
  node: RegressionNode,
  visibleSplits: Set<string>,
  xMin = 0,
  xMax = 160,
  regions: VisibleRegion[] = [],
): VisibleRegion[] {
  if (node.kind === "leaf" || !visibleSplits.has(node.id)) {
    regions.push({ node, xMin, xMax });
    return regions;
  }
  collectVisibleRegions(node.left, visibleSplits, xMin, node.threshold, regions);
  collectVisibleRegions(node.right, visibleSplits, node.threshold, xMax, regions);
  return regions;
}

function leafCount(node: RegressionNode, visibleSplits: Set<string>): number {
  if (node.kind === "leaf" || !visibleSplits.has(node.id)) return 1;
  return leafCount(node.left, visibleSplits) + leafCount(node.right, visibleSplits);
}

function RegressionTreeView({
  node,
  visibleSplits,
  stoppedLeaves,
  activeNodeId,
}: {
  node: RegressionNode;
  visibleSplits: Set<string>;
  stoppedLeaves: Set<string>;
  activeNodeId: string | null;
}): ReactNode {
  const visible = node.kind === "split" && visibleSplits.has(node.id);
  if (!visible) {
    const isFinishedLeaf = node.kind === "leaf" && stoppedLeaves.has(node.id);
    return (
      <div className={`${styles.treeNode} ${isFinishedLeaf ? styles.treeLeaf : styles.treeFrontier} ${activeNodeId === node.id ? styles.treeActive : ""}`}>
        <span>{isFinishedLeaf ? "leaf prediction" : activeNodeId === node.id ? "checking this group" : "rows waiting here"}</span>
        <strong>{isFinishedLeaf ? `${format(node.prediction)} tons/ha` : `${node.indices.length} rows`}</strong>
        <small>{node.indices.map((index) => CROPS[index].id).join(" ")} · variance {format(node.variance, 3)}</small>
      </div>
    );
  }

  const leftLeaves = leafCount(node.left, visibleSplits);
  const rightLeaves = leafCount(node.right, visibleSplits);
  const totalLeaves = leftLeaves + rightLeaves;
  const childStyle = {
    gridTemplateColumns: `${leftLeaves}fr ${rightLeaves}fr`,
    "--left-center": `${(leftLeaves / totalLeaves) * 50}%`,
    "--right-center": `${((leftLeaves + rightLeaves / 2) / totalLeaves) * 100}%`,
  } as CSSProperties;

  return (
    <div className={styles.treeBranch}>
      <div className={styles.treeQuestion}>
        <span>{node.id === "root" ? "root question" : "local question"}</span>
        <strong>fertilizer ≤ {format(node.threshold, 0)}?</strong>
        <small>error reduced by {format(node.improvement, 3)}</small>
      </div>
      <div className={styles.treeChildren} style={childStyle}>
        <div>
          <span className={styles.edgeLabel}>yes · ≤</span>
          <RegressionTreeView node={node.left} visibleSplits={visibleSplits} stoppedLeaves={stoppedLeaves} activeNodeId={activeNodeId} />
        </div>
        <div>
          <span className={styles.edgeLabel}>no · &gt;</span>
          <RegressionTreeView node={node.right} visibleSplits={visibleSplits} stoppedLeaves={stoppedLeaves} activeNodeId={activeNodeId} />
        </div>
      </div>
    </div>
  );
}

type Phase = "propose" | "judge" | "repeat";

const PHASE_STEPS: { id: Phase; label: string; blurb: string }[] = [
  { id: "propose", label: "Propose a split", blurb: "try every threshold in the group" },
  { id: "judge", label: "Judge the two groups", blurb: "keep the split only if it lowers the error" },
  { id: "repeat", label: "Repeat inside each group", blurb: "recurse until a stopping rule fires" },
];

function nodeScope(nodeId: string): string {
  if (nodeId === "root") return "the whole dataset";
  const path = nodeId
    .split(".")
    .slice(1)
    .map((step) => (step === "left" ? "≤" : ">"));
  return `the ${path.join(" ")} group`;
}

interface Narration {
  step: string;
  phase: Phase;
  headline: string;
  detail: string;
}

function narrate(
  event: GrowthEvent | null,
  frameIndex: number,
  totalEvents: number,
): Narration {
  if (event === null) {
    return {
      step: "Done",
      phase: "repeat",
      headline: "Every group has been resolved into a leaf.",
      detail:
        "No group is left to split. Each region now predicts one number — the mean of the rows that landed there.",
    };
  }

  const scope = nodeScope(event.nodeId);
  const rows = `${event.sampleCount} ${rowWord(event.sampleCount)}`;
  const stepLabel = `Step ${frameIndex + 1} of ${totalEvents}`;

  if (event.kind === "split") {
    return {
      step: stepLabel,
      phase: "judge",
      headline: `Propose & judge — the split for ${scope} wins.`,
      detail: `Across ${scope} (${rows}, mean ${format(event.prediction)} tons/ha) the search tried every threshold. The best is fertilizer ≤ ${format(event.threshold ?? 0, 0)}, which cuts the squared error by ${format(event.improvement ?? 0, 3)}. We accept it and split into two smaller groups — then repeat the same search inside each one.`,
    };
  }

  return {
    step: stepLabel,
    phase: "repeat",
    headline: `Repeat, then stop — ${scope} becomes a leaf.`,
    detail: `The search reached ${scope} (${rows}). ${event.reason ?? ""} So no further split is made: this group is a leaf that predicts ${format(event.prediction)} tons/ha.`,
  };
}

const STOP_OPTIONS: Record<StopMode, { label: string; values: number[]; formatValue: (value: number) => string; help: string }> = {
  depth: {
    label: "Maximum tree depth",
    values: [1, 2, 3],
    formatValue: (value) => `${value} level${value === 1 ? "" : "s"} of questions`,
    help: "Stop after the tree has asked a fixed number of nested questions.",
  },
  "leaf-size": {
    label: "Minimum rows per leaf",
    values: [2, 3],
    formatValue: (value) => `${value} row${value === 1 ? "" : "s"} on each side`,
    help: "Reject a split if either new leaf would contain too few training rows.",
  },
  variance: {
    label: "Small-enough variance",
    values: [0.05, 0.15, 0.5],
    formatValue: (value) => `variance ≤ ${format(value, 2)}`,
    help: "Stop splitting a group once its target values are already close together.",
  },
};

export function RegressionTreeGrowthPlayground() {
  const [mode, setMode] = useState<StopMode>("depth");
  const [valueIndex, setValueIndex] = useState(1);
  const config = useMemo<StopConfig>(() => ({ mode, value: STOP_OPTIONS[mode].values[valueIndex] ?? STOP_OPTIONS[mode].values[0] }), [mode, valueIndex]);
  const tree = useMemo(() => growTree(ALL_INDICES, 0, "root", config), [config]);
  const events = useMemo(() => collectGrowthEvents(tree), [tree]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const done = frameIndex >= events.length;
  const activeEvent = done ? null : events[frameIndex];
  const narration = narrate(activeEvent, frameIndex, events.length);
  const completedEvents = events.slice(0, frameIndex);
  const visibleSplits = new Set(completedEvents.filter((event) => event.kind === "split").map((event) => event.nodeId));
  const stoppedLeaves = new Set(completedEvents.filter((event) => event.kind === "stop").map((event) => event.nodeId));
  const regions = collectVisibleRegions(tree, visibleSplits);
  const committedThresholds = completedEvents.flatMap((event) => event.kind === "split" && event.threshold !== undefined ? [event.threshold] : []);

  useEffect(() => {
    setFrameIndex(0);
    setPlaying(false);
  }, [mode, valueIndex]);

  useEffect(() => {
    if (!playing) return undefined;
    if (frameIndex >= events.length) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setFrameIndex((index) => Math.min(events.length, index + 1)), 920);
    return () => window.clearTimeout(timer);
  }, [playing, frameIndex, events.length]);

  const changeMode = (nextMode: StopMode) => {
    setMode(nextMode);
    setValueIndex(nextMode === "depth" ? 1 : 0);
  };

  const playGrowth = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (done) {
      setFrameIndex(0);
      setPlaying(!reducedMotion);
      return;
    }
    if (reducedMotion) {
      setFrameIndex(events.length);
      return;
    }
    setPlaying(true);
  };

  return (
    <section className={styles.workshop} aria-labelledby="regression-growth-title">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Playground 2 · choose when to stop</p>
          <h2 id="regression-growth-title">Watch the same search grow a regression tree</h2>
        </div>
        <span className={styles.stepPill}>{frameIndex} of {events.length} decisions made</span>
      </header>

      <div className={styles.stopControls}>
        <label>
          <span>Stopping rule</span>
          <select value={mode} onChange={(event) => changeMode(event.target.value as StopMode)}>
            {Object.entries(STOP_OPTIONS).map(([optionMode, option]) => (
              <option value={optionMode} key={optionMode}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Rule value</span>
          <input
            type="range"
            min="0"
            max={STOP_OPTIONS[mode].values.length - 1}
            step="1"
            value={valueIndex}
            aria-label={STOP_OPTIONS[mode].label}
            aria-valuetext={STOP_OPTIONS[mode].formatValue(config.value)}
            onChange={(event) => setValueIndex(Number(event.target.value))}
          />
          <strong>{STOP_OPTIONS[mode].formatValue(config.value)}</strong>
        </label>
        <p><strong>{STOP_OPTIONS[mode].label}.</strong> {STOP_OPTIONS[mode].help}</p>
      </div>

      <div className={styles.playbackControls}>
        <button type="button" disabled={frameIndex === 0} onClick={() => { setFrameIndex((index) => Math.max(0, index - 1)); setPlaying(false); }}>← Back one step</button>
        <button type="button" onClick={playGrowth}>{playing ? "Pause" : done ? "Start over" : "Play tree growth"}</button>
        <button className={styles.primaryButton} type="button" disabled={done} onClick={() => { setFrameIndex((index) => Math.min(events.length, index + 1)); setPlaying(false); }}>Next decision →</button>
      </div>

      <div className={styles.algorithmNarration}>
        <ol className={styles.phaseTrack}>
          {PHASE_STEPS.map((step) => (
            <li
              key={step.id}
              className={`${styles.phaseStep} ${narration.phase === step.id ? styles.phaseStepActive : ""}`}
            >
              <strong>{step.label}</strong>
              <span>{step.blurb}</span>
            </li>
          ))}
        </ol>
        <div className={styles.narrationCard} aria-live="polite" aria-atomic="true">
          <span className={styles.narrationStep}>{narration.step}</span>
          <strong>{narration.headline}</strong>
          <p>{narration.detail}</p>
        </div>
      </div>

      <div className={styles.growthLayout}>
        <div className={styles.plotPanel}>
          <div className={styles.panelTitle}>Regions become fixed predictions</div>
          <div className={styles.chartScroll} role="region" aria-label="Growing regression-tree chart" tabIndex={0}>
            <CropPlot regions={regions} committedThresholds={committedThresholds} titleId="regression-growth-plot-title" descriptionId="regression-growth-plot-description" />
          </div>
          <div className={styles.regionLedger}>
            {regions.map(({ node, xMin, xMax }) => (
              <div key={`region-ledger-${node.id}`}>
                <span>{format(xMin, 0)}–{format(xMax, 0)} kg/ha · {node.indices.length} {rowWord(node.indices.length)}</span>
                <strong>predict {format(node.prediction)} tons/ha</strong>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.treePanel}>
          <div className={styles.panelTitle}>Each local winner becomes one question</div>
          <div className={styles.treeScroller}>
            <div className={styles.treeCanvas} style={{ minWidth: `${Math.max(420, leafCount(tree, visibleSplits) * 150)}px` }}>
              <RegressionTreeView node={tree} visibleSplits={visibleSplits} stoppedLeaves={stoppedLeaves} activeNodeId={activeEvent?.nodeId ?? null} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const regressionLessonSummary = {
  mean: ROOT_MEAN,
  error: ROOT_ERROR,
  bestThreshold: bestCandidate(ROOT_CANDIDATES)?.threshold ?? 30,
};
