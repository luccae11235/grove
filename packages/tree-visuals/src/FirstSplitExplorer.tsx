import { useMemo, useState } from "react";
import {
  trainDecisionStump,
  type Criterion,
  type Dataset,
  type LeafNode,
} from "@grove/tree-core";
import styles from "./FirstSplitExplorer.module.css";

const DATASET: Dataset = {
  features: [
    [1.0, 1.4],
    [1.4, 2.7],
    [2.0, 1.9],
    [2.5, 3.5],
    [3.2, 2.4],
    [3.8, 4.2],
    [4.3, 1.5],
    [4.9, 3.1],
    [5.5, 2.0],
    [6.1, 3.9],
  ],
  targets: [
    "Class A",
    "Class A",
    "Class A",
    "Class A",
    "Class B",
    "Class A",
    "Class B",
    "Class B",
    "Class B",
    "Class B",
  ],
  featureNames: ["Feature 1", "Feature 2"],
};

const PLOT = {
  width: 520,
  height: 330,
  left: 48,
  right: 18,
  top: 18,
  bottom: 42,
};

const xDomain: [number, number] = [0.5, 6.5];
const yDomain: [number, number] = [1, 4.6];

const xScale = (value: number) =>
  PLOT.left +
  ((value - xDomain[0]) / (xDomain[1] - xDomain[0])) *
    (PLOT.width - PLOT.left - PLOT.right);

const yScale = (value: number) =>
  PLOT.height -
  PLOT.bottom -
  ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) *
    (PLOT.height - PLOT.top - PLOT.bottom);

function format(value: number): string {
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function confidence(leaf: LeafNode): string {
  const predicted = leaf.distribution.find(
    (item) => item.label === leaf.prediction,
  );
  return `${Math.round((predicted?.probability ?? 0) * 100)}%`;
}

export function FirstSplitExplorer() {
  const [criterion, setCriterion] = useState<Criterion>("gini");
  const result = useMemo(
    () => trainDecisionStump(DATASET, { criterion }),
    [criterion],
  );

  const candidateCount = result.trace.events.filter(
    (event) => event.type === "candidate_evaluated",
  ).length;

  if (result.model.kind !== "split" || !result.bestSplit) {
    return <p>The current dataset cannot be split into purer groups.</p>;
  }

  const { model, bestSplit } = result;
  const splitX = xScale(bestSplit.threshold);
  const splitY = yScale(bestSplit.threshold);
  const isVertical = bestSplit.featureIndex === 0;
  const plotRight = PLOT.width - PLOT.right;
  const plotBottom = PLOT.height - PLOT.bottom;

  return (
    <section className={styles.explorer} aria-labelledby="first-split-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Live model · one level deep</p>
          <h2 id="first-split-title">Find the first split</h2>
        </div>

        <fieldset className={styles.criterion}>
          <legend>Impurity measure</legend>
          {(["gini", "entropy"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={criterion === option}
              onClick={() => setCriterion(option)}
            >
              {option === "gini" ? "Gini" : "Entropy"}
            </button>
          ))}
        </fieldset>
      </div>

      <p className={styles.answer} aria-live="polite">
        The model tested <strong>{candidateCount} questions</strong> and chose{" "}
        <strong>
          {bestSplit.featureName} ≤ {format(bestSplit.threshold)}
        </strong>
        .
      </p>

      <div className={styles.visualGrid}>
        <div className={styles.plotPanel}>
          <div className={styles.panelLabel}>Data space</div>
          <svg
            className={styles.plot}
            viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
            role="img"
            aria-labelledby="split-plot-title split-plot-desc"
          >
            <title id="split-plot-title">Best decision split</title>
            <desc id="split-plot-desc">
              Ten samples from two classes. A line shows the split selected by
              the decision stump.
            </desc>

            <rect
              className={styles.plotBackground}
              x={PLOT.left}
              y={PLOT.top}
              width={plotRight - PLOT.left}
              height={plotBottom - PLOT.top}
            />

            {isVertical ? (
              <>
                <rect
                  className={styles.leftRegion}
                  x={PLOT.left}
                  y={PLOT.top}
                  width={splitX - PLOT.left}
                  height={plotBottom - PLOT.top}
                />
                <rect
                  className={styles.rightRegion}
                  x={splitX}
                  y={PLOT.top}
                  width={plotRight - splitX}
                  height={plotBottom - PLOT.top}
                />
                <line
                  className={styles.splitLine}
                  x1={splitX}
                  x2={splitX}
                  y1={PLOT.top}
                  y2={plotBottom}
                />
              </>
            ) : (
              <>
                <rect
                  className={styles.leftRegion}
                  x={PLOT.left}
                  y={splitY}
                  width={plotRight - PLOT.left}
                  height={plotBottom - splitY}
                />
                <rect
                  className={styles.rightRegion}
                  x={PLOT.left}
                  y={PLOT.top}
                  width={plotRight - PLOT.left}
                  height={splitY - PLOT.top}
                />
                <line
                  className={styles.splitLine}
                  x1={PLOT.left}
                  x2={plotRight}
                  y1={splitY}
                  y2={splitY}
                />
              </>
            )}

            <line
              className={styles.axis}
              x1={PLOT.left}
              x2={plotRight}
              y1={plotBottom}
              y2={plotBottom}
            />
            <line
              className={styles.axis}
              x1={PLOT.left}
              x2={PLOT.left}
              y1={PLOT.top}
              y2={plotBottom}
            />

            {DATASET.features.map(([x, y], index) => {
              const target = DATASET.targets[index];
              const cx = xScale(x as number);
              const cy = yScale(y as number);
              return target === "Class A" ? (
                <circle
                  key={index}
                  className={styles.classA}
                  cx={cx}
                  cy={cy}
                  r="7"
                />
              ) : (
                <rect
                  key={index}
                  className={styles.classB}
                  x={cx - 6.5}
                  y={cy - 6.5}
                  width="13"
                  height="13"
                  rx="2"
                />
              );
            })}

            <text
              className={styles.axisLabel}
              x={(PLOT.left + plotRight) / 2}
              y={PLOT.height - 9}
              textAnchor="middle"
            >
              Feature 1
            </text>
            <text
              className={styles.axisLabel}
              x="14"
              y={(PLOT.top + plotBottom) / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${(PLOT.top + plotBottom) / 2})`}
            >
              Feature 2
            </text>
          </svg>

          <div className={styles.legend} aria-label="Class legend">
            <span><i className={styles.legendCircle} />Class A</span>
            <span><i className={styles.legendSquare} />Class B</span>
            <span><i className={styles.legendLine} />Chosen split</span>
          </div>
        </div>

        <div className={styles.treePanel}>
          <div className={styles.panelLabel}>Model structure</div>
          <svg
            className={styles.tree}
            viewBox="0 0 390 250"
            role="img"
            aria-labelledby="tree-title tree-desc"
          >
            <title id="tree-title">The learned decision stump</title>
            <desc id="tree-desc">
              A root question connects to two leaves, one predicting Class A and
              the other Class B.
            </desc>
            <line className={styles.treeEdge} x1="195" y1="82" x2="98" y2="158" />
            <line className={styles.treeEdge} x1="195" y1="82" x2="292" y2="158" />

            <rect className={styles.rootNode} x="105" y="24" width="180" height="64" rx="12" />
            <text className={styles.nodeTitle} x="195" y="50" textAnchor="middle">
              {model.featureName} ≤ {format(model.threshold)}?
            </text>
            <text className={styles.nodeMeta} x="195" y="72" textAnchor="middle">
              {model.sampleCount} samples
            </text>

            <text className={styles.edgeLabel} x="117" y="123" textAnchor="middle">yes</text>
            <text className={styles.edgeLabel} x="272" y="123" textAnchor="middle">no</text>

            <rect className={styles.leafA} x="28" y="158" width="140" height="68" rx="12" />
            <text className={styles.nodeTitle} x="98" y="186" textAnchor="middle">
              {String(model.left.prediction)}
            </text>
            <text className={styles.nodeMeta} x="98" y="208" textAnchor="middle">
              {model.left.sampleCount} samples · {confidence(model.left)}
            </text>

            <rect className={styles.leafB} x="222" y="158" width="140" height="68" rx="12" />
            <text className={styles.nodeTitle} x="292" y="186" textAnchor="middle">
              {String(model.right.prediction)}
            </text>
            <text className={styles.nodeMeta} x="292" y="208" textAnchor="middle">
              {model.right.sampleCount} samples · {confidence(model.right)}
            </text>
          </svg>
        </div>
      </div>

      <dl className={styles.metrics}>
        <div>
          <dt>Before split</dt>
          <dd>{format(model.impurity)}</dd>
        </div>
        <div>
          <dt>After split</dt>
          <dd>{format(bestSplit.weightedImpurity)}</dd>
        </div>
        <div>
          <dt>Information gain</dt>
          <dd>{format(bestSplit.gain)}</dd>
        </div>
      </dl>
    </section>
  );
}

