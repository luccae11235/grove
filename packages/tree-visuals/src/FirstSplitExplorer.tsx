import { useMemo, useState } from "react";
import lessonData from "./generated/firstSplitLesson.json";
import styles from "./FirstSplitExplorer.module.css";

type Criterion = "gini" | "entropy";

interface DistributionItem {
  label: string | number;
  probability: number;
}

interface LeafNode {
  kind: "leaf";
  prediction: string | number;
  sampleCount: number;
  distribution: DistributionItem[];
}

interface SplitNode {
  kind: "split";
  featureIndex: number;
  featureName: string;
  threshold: number;
  impurity: number;
  sampleCount: number;
  left: LeafNode;
  right: LeafNode;
}

interface SplitCandidate {
  threshold: number;
  weightedImpurity: number;
  gain: number;
  featureIndex: number;
  featureName: string;
  leftIndices: number[];
  rightIndices: number[];
}

interface TraceEvent {
  type: string;
  nodeId?: string;
  candidate?: SplitCandidate;
}

interface LessonResult {
  model: SplitNode | LeafNode;
  bestSplit: SplitCandidate | null;
  trace: { events: TraceEvent[] };
}

interface CandidateChoice {
  id: string;
  label: string;
  candidate: SplitCandidate;
}

const DATASET = lessonData.dataset;
const SCENARIOS = lessonData.scenarios as Record<Criterion, LessonResult>;
const THRIVING = "Thriving";
const STRUGGLING = "Struggling";

const PLOT = {
  width: 540,
  height: 350,
  left: 56,
  right: 20,
  top: 22,
  bottom: 50,
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

function sameCandidate(left: SplitCandidate, right: SplitCandidate): boolean {
  return (
    left.featureIndex === right.featureIndex &&
    Math.abs(left.threshold - right.threshold) < 1e-9
  );
}

function confidence(leaf: LeafNode): string {
  const predicted = leaf.distribution.find(
    (item) => item.label === leaf.prediction,
  );
  return `${Math.round((predicted?.probability ?? 0) * 100)}%`;
}

function labelCounts(indices: number[]): { thriving: number; struggling: number } {
  return indices.reduce(
    (counts, index) => {
      if (DATASET.targets[index] === THRIVING) counts.thriving += 1;
      if (DATASET.targets[index] === STRUGGLING) counts.struggling += 1;
      return counts;
    },
    { thriving: 0, struggling: 0 },
  );
}

function findCandidate(
  candidates: SplitCandidate[],
  featureIndex: number,
  threshold: number,
): SplitCandidate {
  const candidate = candidates.find(
    (item) =>
      item.featureIndex === featureIndex &&
      Math.abs(item.threshold - threshold) < 1e-9,
  );
  if (!candidate) {
    throw new Error(`Missing lesson candidate ${featureIndex}:${threshold}`);
  }
  return candidate;
}

export function FirstSplitExplorer() {
  const [criterion, setCriterion] = useState<Criterion>("gini");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const result = SCENARIOS[criterion];

  const candidates = useMemo(
    () =>
      result.trace.events.flatMap((event) =>
        event.type === "candidate_evaluated" && event.nodeId === "root" && event.candidate
          ? [event.candidate]
          : [],
      ),
    [result],
  );

  const choices: CandidateChoice[] = useMemo(
    () => [
      {
        id: "sunlight-early",
        label: "Sunlight hours ≤ 1.7?",
        candidate: findCandidate(candidates, 0, 1.7),
      },
      {
        id: "water-middle",
        label: "Water per week ≤ 2.55 L?",
        candidate: findCandidate(candidates, 1, 2.55),
      },
      {
        id: "sunlight-clean",
        label: "Sunlight hours ≤ 3.5?",
        candidate: findCandidate(candidates, 0, 3.5),
      },
    ],
    [candidates],
  );

  if (result.model.kind !== "split" || !result.bestSplit) {
    return <p>The current dataset cannot be split into more consistent groups.</p>;
  }

  const { model, bestSplit } = result;
  const selectedChoice = choices.find((choice) => choice.id === selectedId) ?? null;
  const selectedCandidate = selectedChoice?.candidate ?? null;
  const visibleCandidate = revealed ? bestSplit : selectedCandidate;
  const selectedMatches = selectedCandidate
    ? sameCandidate(selectedCandidate, bestSplit)
    : false;
  const leftCounts = selectedCandidate
    ? labelCounts(selectedCandidate.leftIndices)
    : null;
  const rightCounts = selectedCandidate
    ? labelCounts(selectedCandidate.rightIndices)
    : null;
  const candidateCount = candidates.length;

  const splitX = visibleCandidate ? xScale(visibleCandidate.threshold) : 0;
  const splitY = visibleCandidate ? yScale(visibleCandidate.threshold) : 0;
  const isVertical = visibleCandidate?.featureIndex === 0;
  const plotRight = PLOT.width - PLOT.right;
  const plotBottom = PLOT.height - PLOT.bottom;

  const choose = (choice: CandidateChoice) => {
    setSelectedId(choice.id);
    setRevealed(false);
  };

  return (
    <section className={styles.explorer} aria-labelledby="first-split-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Predict → observe → explain</p>
          <h2 id="first-split-title">Choose the first question</h2>
        </div>
        <p className={styles.progress}>1 of 1 split</p>
      </div>

      <div className={styles.questionArea}>
        <p>
          Select the question you think will create the most consistent groups.
          The same ten seedlings stay fixed while the boundary changes.
        </p>
        <div className={styles.questionList} aria-label="Candidate questions">
          {choices.map((choice, index) => (
            <button
              key={choice.id}
              type="button"
              aria-pressed={selectedId === choice.id}
              onClick={() => choose(choice)}
            >
              <span>Question {String.fromCharCode(65 + index)}</span>
              <strong>{choice.label}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.visualGrid}>
        <div className={styles.plotPanel}>
          <div className={styles.panelLabel}>The same training data</div>
          <svg
            className={styles.plot}
            viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
            role="img"
            aria-labelledby="split-plot-title split-plot-desc"
          >
            <title id="split-plot-title">Seedling data and selected question</title>
            <desc id="split-plot-desc">
              Ten seedlings are plotted by sunlight and water. Circles are thriving
              seedlings and squares are struggling seedlings. The selected question
              appears as a dashed boundary.
            </desc>

            <rect
              className={styles.plotBackground}
              x={PLOT.left}
              y={PLOT.top}
              width={plotRight - PLOT.left}
              height={plotBottom - PLOT.top}
            />

            {visibleCandidate && isVertical && (
              <>
                <rect
                  className={styles.yesRegion}
                  x={PLOT.left}
                  y={PLOT.top}
                  width={splitX - PLOT.left}
                  height={plotBottom - PLOT.top}
                />
                <rect
                  className={styles.noRegion}
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
                <text className={styles.regionLabel} x={PLOT.left + 9} y={PLOT.top + 18}>yes · ≤</text>
                <text className={styles.regionLabel} x={plotRight - 9} y={PLOT.top + 18} textAnchor="end">no · &gt;</text>
                <text className={styles.thresholdLabel} x={splitX + 6} y={plotBottom - 8}>
                  {format(visibleCandidate.threshold)}
                </text>
              </>
            )}

            {visibleCandidate && !isVertical && (
              <>
                <rect
                  className={styles.yesRegion}
                  x={PLOT.left}
                  y={splitY}
                  width={plotRight - PLOT.left}
                  height={plotBottom - splitY}
                />
                <rect
                  className={styles.noRegion}
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
                <text className={styles.regionLabel} x={plotRight - 9} y={splitY + 18} textAnchor="end">yes · ≤</text>
                <text className={styles.regionLabel} x={plotRight - 9} y={PLOT.top + 18} textAnchor="end">no · &gt;</text>
                <text className={styles.thresholdLabel} x={PLOT.left + 7} y={splitY - 7}>
                  {format(visibleCandidate.threshold)}
                </text>
              </>
            )}

            <line className={styles.axis} x1={PLOT.left} x2={plotRight} y1={plotBottom} y2={plotBottom} />
            <line className={styles.axis} x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={plotBottom} />

            {DATASET.features.map(([x, y], index) => {
              const target = DATASET.targets[index];
              const cx = xScale(x as number);
              const cy = yScale(y as number);
              return (
                <g key={index}>
                  <title>{`Seedling ${index + 1}: ${target}, ${x} sunlight hours, ${y} L water`}</title>
                  {target === THRIVING ? (
                    <circle className={styles.thriving} cx={cx} cy={cy} r="7" />
                  ) : (
                    <rect className={styles.struggling} x={cx - 6.5} y={cy - 6.5} width="13" height="13" rx="2" />
                  )}
                </g>
              );
            })}

            <text className={styles.axisLabel} x={(PLOT.left + plotRight) / 2} y={PLOT.height - 10} textAnchor="middle">
              {DATASET.featureNames[0]}
            </text>
            <text
              className={styles.axisLabel}
              x="15"
              y={(PLOT.top + plotBottom) / 2}
              textAnchor="middle"
              transform={`rotate(-90 15 ${(PLOT.top + plotBottom) / 2})`}
            >
              {DATASET.featureNames[1]}
            </text>
          </svg>

          <div className={styles.legend} aria-label="Outcome legend">
            <span><i className={styles.legendCircle} />Thriving</span>
            <span><i className={styles.legendSquare} />Struggling</span>
            <span><i className={styles.legendLine} />Question boundary</span>
          </div>
        </div>

        <div className={styles.evidencePanel} aria-live="polite">
          <div className={styles.panelLabel}>Evidence created by your question</div>
          {!selectedCandidate || !leftCounts || !rightCounts ? (
            <div className={styles.emptyEvidence}>
              <span aria-hidden="true">?</span>
              <p>Choose A, B, or C to partition the seedlings into a “yes” group and a “no” group.</p>
            </div>
          ) : (
            <>
              <p className={styles.selectedQuestion}>{selectedChoice?.label}</p>
              <div className={styles.groupCards}>
                <div>
                  <strong>Yes group</strong>
                  <span>○ {leftCounts.thriving} thriving</span>
                  <span>□ {leftCounts.struggling} struggling</span>
                </div>
                <div>
                  <strong>No group</strong>
                  <span>○ {rightCounts.thriving} thriving</span>
                  <span>□ {rightCounts.struggling} struggling</span>
                </div>
              </div>
              <p className={styles.reflect}>Could each group make one confident prediction?</p>
              <button className={styles.revealButton} type="button" onClick={() => setRevealed(true)}>
                Reveal the tree's choice
              </button>
            </>
          )}
        </div>
      </div>

      {revealed && (
        <div className={styles.reveal} aria-live="polite">
          <div className={styles.revealCopy}>
            <p className={styles.eyebrow}>The algorithm answers</p>
            <h3>{selectedMatches ? "You found the same split." : "The tree found a cleaner split."}</h3>
            <p>
              It tested <strong>{candidateCount} valid thresholds</strong> and selected{" "}
              <strong>{bestSplit.featureName} ≤ {format(bestSplit.threshold)}</strong>.
              This question makes the high-sunlight side completely struggling and
              leaves only one struggling seed among four thriving seedlings on the other.
            </p>
          </div>

          <div className={styles.treePanel}>
            <div className={styles.panelLabel}>The learned decision stump</div>
            <svg className={styles.tree} viewBox="0 0 430 270" role="img" aria-labelledby="tree-title tree-desc">
              <title id="tree-title">The learned one-level decision tree</title>
              <desc id="tree-desc">
                The root asks whether sunlight is at most 3.5 hours. Yes predicts
                thriving from four of five seedlings; no predicts struggling from all five.
              </desc>
              <line className={styles.treeEdge} x1="215" y1="94" x2="112" y2="178" />
              <line className={styles.treeEdge} x1="215" y1="94" x2="318" y2="178" />

              <rect className={styles.rootNode} x="105" y="22" width="220" height="76" rx="12" />
              <text className={styles.nodeTitle} x="215" y="50" textAnchor="middle">{model.featureName}</text>
              <text className={styles.nodeTitle} x="215" y="70" textAnchor="middle">≤ {format(model.threshold)}?</text>
              <text className={styles.nodeMeta} x="215" y="88" textAnchor="middle">root · {model.sampleCount} samples</text>

              <text className={styles.edgeLabel} x="132" y="137" textAnchor="middle">yes</text>
              <text className={styles.edgeLabel} x="298" y="137" textAnchor="middle">no</text>

              <rect className={styles.leafThriving} x="35" y="178" width="154" height="70" rx="12" />
              <text className={styles.nodeTitle} x="112" y="206" textAnchor="middle">{String(model.left.prediction)}</text>
              <text className={styles.nodeMeta} x="112" y="229" textAnchor="middle">leaf · {model.left.sampleCount} · {confidence(model.left)}</text>

              <rect className={styles.leafStruggling} x="241" y="178" width="154" height="70" rx="12" />
              <text className={styles.nodeTitle} x="318" y="206" textAnchor="middle">{String(model.right.prediction)}</text>
              <text className={styles.nodeMeta} x="318" y="229" textAnchor="middle">leaf · {model.right.sampleCount} · {confidence(model.right)}</text>
            </svg>
          </div>
        </div>
      )}

      {revealed && (
        <details className={styles.mathPreview}>
          <summary>Optional preview: compare the two scoring rules</summary>
          <div className={styles.mathInner}>
            <p>
              Both rules select the same question here, but their numeric scales differ.
              The next lesson explains why.
            </p>
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
            <dl className={styles.metrics}>
              <div><dt>Before split</dt><dd>{format(model.impurity)}</dd></div>
              <div><dt>After split</dt><dd>{format(bestSplit.weightedImpurity)}</dd></div>
              <div><dt>Gain</dt><dd>{format(bestSplit.gain)}</dd></div>
            </dl>
          </div>
        </details>
      )}

      <details className={styles.codeDisclosure}>
        <summary>Inspect the Python that evaluated the questions</summary>
        <div className={styles.codePanel}>
          <div className={styles.codeHeader}>
            <div><span className={styles.codeDot} aria-hidden="true" /><strong>decision_tree.py</strong></div>
            <span>Executed to generate every state above</span>
          </div>
          <pre aria-label="Python source used to train the visualized tree">
            <code>
              {lessonData.source.split("\n").map((line, index) => (
                <span className={styles.codeLine} key={index}>
                  <i aria-hidden="true">{index + 1}</i>
                  <b>{line || " "}</b>
                </span>
              ))}
            </code>
          </pre>
          <p className={styles.codePath}>Source of truth · <code>{lessonData.sourcePath}</code></p>
        </div>
      </details>
    </section>
  );
}
