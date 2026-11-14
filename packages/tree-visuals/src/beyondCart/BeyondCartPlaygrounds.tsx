import { useId, useMemo, useState } from "react";
import styles from "./BeyondCartPlaygrounds.module.css";
import {
  BUILDER_DATASETS,
  CART_ARCHITECTURE,
  DEFAULT_BUILDER_DATASET_ID,
  SOFT_TREE_LEFT_VALUE,
  SOFT_TREE_RIGHT_VALUE,
  architectureComplexity,
  architectureLeafValues,
  architectureRules,
  architectureSummary,
  createDecisionSurface,
  softRoutingPrediction,
  type BuilderDataset,
  type BuilderDatasetId,
  type LeafModel,
  type RoutingMode,
  type RuleSharing,
  type SplitGeometry,
  type SurfaceCell,
  type TreeArchitecture,
} from "./model";

function format(value: number, digits = 2): string {
  return value.toFixed(digits).replace(/^-0(?:\.0+)?$/, (match) => match.slice(1));
}

function surfaceEvidenceSummary(architecture: TreeArchitecture): string {
  const geometry = architecture.split === "axis-aligned"
    ? "The surface uses horizontal and vertical boundaries."
    : "The surface uses diagonal boundaries.";
  const transition = architecture.routing === "hard"
    ? "Changes at those boundaries are abrupt."
    : "Changes blend smoothly across those boundaries.";
  const sharing = architecture.rules === "shared-by-depth"
    ? "The same second-depth boundary repeats on both sides of the root."
    : "Each side of the root has its own second-depth boundary.";
  const leaves = architecture.leaves === "constant"
    ? "Predictions stay constant within each final region."
    : "Predictions continue to vary within each final region.";

  return `${geometry} ${transition} ${sharing} ${leaves}`;
}

function childRuleSummary(
  architecture: TreeArchitecture,
  datasetId: BuilderDatasetId = DEFAULT_BUILDER_DATASET_ID,
): string {
  const rules = architectureRules(architecture, datasetId);
  return architecture.rules === "shared-by-depth"
    ? `Both second-depth nodes use ${rules.left.label}.`
    : `The left second-depth node uses ${rules.left.label}; the right one uses ${rules.right.label}.`;
}

function SoftRoutingDiagram({
  x,
  temperature,
  pLeft,
  pRight,
  titleId,
  descriptionId,
}: {
  x: number;
  temperature: number;
  pLeft: number;
  pRight: number;
  titleId: string;
  descriptionId: string;
}) {
  const observationX = 80 + ((x + 3) / 6) * 480;
  const routingLabel = temperature === 0 ? "hard split" : `soft gate, temperature ${format(temperature, 1)}`;

  return (
    <svg
      className={styles.softDiagram}
      viewBox="0 0 640 286"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>One observation routed toward two regression leaves</title>
      <desc id={descriptionId}>
        Input x is {format(x, 1)}. The {routingLabel} sends weight {format(pLeft, 3)}
        to the left leaf with prediction two and weight {format(pRight, 3)} to the
        right leaf with prediction eight.
      </desc>

      <line className={styles.inputRail} x1="80" x2="560" y1="47" y2="47" />
      <line className={styles.thresholdMark} x1="320" x2="320" y1="25" y2="72" />
      <text className={styles.axisText} x="80" y="72" textAnchor="middle">−3</text>
      <text className={styles.axisText} x="320" y="20" textAnchor="middle">threshold 0</text>
      <text className={styles.axisText} x="560" y="72" textAnchor="middle">3</text>
      <text className={styles.observationLabel} x={observationX} y="91" textAnchor="middle">
        x = {format(x, 1)}
      </text>

      <path
        className={`${styles.branch} ${styles.leftBranch}`}
        d="M320 137 L170 216"
        style={{ opacity: 0.2 + pLeft * 0.8, strokeWidth: 1.5 + pLeft * 6 }}
        data-branch-weight="left"
        data-weight={format(pLeft, 3)}
      />
      <path
        className={`${styles.branch} ${styles.rightBranch}`}
        d="M320 137 L470 216"
        style={{ opacity: 0.2 + pRight * 0.8, strokeWidth: 1.5 + pRight * 6 }}
        data-branch-weight="right"
        data-weight={format(pRight, 3)}
      />

      <rect className={styles.gateNode} x="250" y="105" width="140" height="48" rx="12" />
      <text className={styles.gateLabel} x="320" y="126" textAnchor="middle">
        {temperature === 0 ? "x < 0" : "smooth gate"}
      </text>
      <text className={styles.gateMeta} x="320" y="143" textAnchor="middle">
        {temperature === 0 ? "one path" : `τ = ${format(temperature, 1)}`}
      </text>

      <text className={styles.leftWeight} x="215" y="177" textAnchor="middle">
        pₗ = {format(pLeft, 3)}
      </text>
      <text className={styles.rightWeight} x="425" y="177" textAnchor="middle">
        pᵣ = {format(pRight, 3)}
      </text>

      <rect className={`${styles.leafNode} ${styles.leftLeaf}`} x="105" y="211" width="130" height="57" rx="13" />
      <rect className={`${styles.leafNode} ${styles.rightLeaf}`} x="405" y="211" width="130" height="57" rx="13" />
      <text className={styles.leafName} x="170" y="234" textAnchor="middle">left leaf</text>
      <text className={styles.leafValue} x="170" y="255" textAnchor="middle">ŷ = {SOFT_TREE_LEFT_VALUE}</text>
      <text className={styles.leafName} x="470" y="234" textAnchor="middle">right leaf</text>
      <text className={styles.leafValue} x="470" y="255" textAnchor="middle">ŷ = {SOFT_TREE_RIGHT_VALUE}</text>
    </svg>
  );
}

export function SoftRoutingPlayground() {
  const id = useId();
  const [x, setX] = useState(0.2);
  const [temperature, setTemperature] = useState(1);
  const result = softRoutingPrediction(x, temperature);

  return (
    <section
      className={`${styles.playground} ${styles.softPlayground}`}
      role="region"
      aria-labelledby={`${id}-title`}
      data-beyond-cart-playground="soft-routing"
      data-routing-mode={result.hard ? "hard" : "soft"}
      data-x={format(x, 1)}
      data-temperature={format(temperature, 1)}
      data-p-left={format(result.pLeft, 3)}
      data-p-right={format(result.pRight, 3)}
      data-prediction={format(result.prediction, 2)}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Routing</p>
          <h3 id={`${id}-title`}>Soften one threshold</h3>
        </div>
      </header>

      <p className={styles.learningPrompt} id={`${id}-instruction`}>
        <strong>Try one controlled change.</strong> Lower temperature with the slider
        below while <i>x</i> stays at 0.2. Predict the right-path weight. Then drag
        the green dot across zero (or focus it and use the arrow keys).
      </p>

      <div className={styles.softCanvas}>
        <div className={styles.softDiagramSurface}>
          <SoftRoutingDiagram
            x={x}
            temperature={temperature}
            pLeft={result.pLeft}
            pRight={result.pRight}
            titleId={`${id}-diagram-title`}
            descriptionId={`${id}-diagram-description`}
          />
          <input
            className={styles.axisSlider}
            type="range"
            min="-3"
            max="3"
            step="0.1"
            value={x}
            onInput={(event) => setX(Number(event.currentTarget.value))}
            onChange={(event) => setX(Number(event.currentTarget.value))}
            aria-label="Input x on the tree axis"
            aria-describedby={`${id}-instruction`}
            data-beyond-cart-axis-slider
          />
        </div>
      </div>

      <div className={styles.routingReadouts} aria-label="Current routing calculation">
        <div>
          <span>Left weight</span>
          <strong data-routing-readout="left">pₗ {format(result.pLeft, 3)}</strong>
        </div>
        <div>
          <span>Right weight</span>
          <strong data-routing-readout="right">pᵣ {format(result.pRight, 3)}</strong>
        </div>
        <div className={styles.predictionReadout}>
          <span>Weighted prediction</span>
          <strong data-routing-readout="prediction">ŷ {format(result.prediction, 2)}</strong>
        </div>
      </div>

      <div className={styles.softControls}>
        <label htmlFor={`${id}-temperature`}>
          <span>Temperature τ</span>
          <strong>{format(temperature, 1)}{temperature === 0 ? " · hard" : ""}</strong>
          <input
            id={`${id}-temperature`}
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onInput={(event) => setTemperature(Number(event.currentTarget.value))}
            onChange={(event) => setTemperature(Number(event.currentTarget.value))}
          />
          <small><span>0 · switch to hard rule</span><span>1</span><span>2 · gradual</span></small>
        </label>
      </div>

      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        Input {format(x, 1)}, temperature {format(temperature, 1)}. Left path weight
        {format(result.pLeft, 3)}, right path weight {format(result.pRight, 3)},
        prediction {format(result.prediction, 2)}.
      </p>
    </section>
  );
}

const SURFACE_STEPS = 14;
const SURFACE_PLOT = { left: 32, top: 17, size: 300 } as const;

function surfaceX(value: number): number {
  return SURFACE_PLOT.left + ((value + 2) / 4) * SURFACE_PLOT.size;
}

function surfaceY(value: number): number {
  return SURFACE_PLOT.top + ((2 - value) / 4) * SURFACE_PLOT.size;
}

function DecisionSurface({
  architecture,
  cells,
  dataset,
  titleId,
  descriptionId,
}: {
  architecture: TreeArchitecture;
  cells: readonly SurfaceCell[];
  dataset: BuilderDataset;
  titleId: string;
  descriptionId: string;
}) {
  const cellSize = SURFACE_PLOT.size / SURFACE_STEPS;
  const summary = architectureSummary(architecture);

  return (
    <svg
      className={styles.surfaceChart}
      viewBox="0 0 366 356"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>Decision surface for the assembled tree</title>
      <desc id={descriptionId}>
        The {dataset.label} dataset has {dataset.points.length} observations over the prediction
        surface produced by a fixed, illustrative model with {summary}. The controls select
        hand-set rules and leaf values; they do not train the model. {dataset.description}{" "}
        {surfaceEvidenceSummary(architecture)}{" "}
        Negative observations are warm diamonds; positive observations are green circles.
      </desc>
      <g data-decision-surface>
        {cells.map((cell) => (
          <rect
            className={`${styles.surfaceCell} ${styles[`surfaceBin${cell.bin}`]}`}
            x={surfaceX(cell.x1) - cellSize / 2}
            y={surfaceY(cell.x2) - cellSize / 2}
            width={cellSize + 0.35}
            height={cellSize + 0.35}
            data-surface-cell={cell.id}
            data-prediction-bin={cell.bin}
            key={cell.id}
          />
        ))}
      </g>
      <rect
        className={styles.surfaceBorder}
        x={SURFACE_PLOT.left}
        y={SURFACE_PLOT.top}
        width={SURFACE_PLOT.size}
        height={SURFACE_PLOT.size}
      />
      {dataset.points.map((point) => point.label === 1 ? (
        <circle
          className={styles.positivePoint}
          cx={surfaceX(point.x1)}
          cy={surfaceY(point.x2)}
          r="4.1"
          data-point-class="positive"
          data-point-id={point.id}
          key={point.id}
        />
      ) : (
        <rect
          className={styles.negativePoint}
          x={surfaceX(point.x1) - 3.5}
          y={surfaceY(point.x2) - 3.5}
          width="7"
          height="7"
          transform={`rotate(45 ${surfaceX(point.x1)} ${surfaceY(point.x2)})`}
          data-point-class="negative"
          data-point-id={point.id}
          key={point.id}
        />
      ))}
      <text className={styles.surfaceAxis} x="182" y="346" textAnchor="middle">feature x₁</text>
      <text className={styles.surfaceAxis} x="12" y="168" textAnchor="middle" transform="rotate(-90 12 168)">feature x₂</text>
      <g className={styles.surfaceLegend} aria-hidden="true">
        <rect x="210" y="328" width="7" height="7" transform="rotate(45 213.5 331.5)" />
        <text x="223" y="335">class 0</text>
        <circle cx="277" cy="331.5" r="4" />
        <text x="285" y="335">class 1</text>
      </g>
    </svg>
  );
}

function TreeDiagram({
  architecture,
  dataset,
  titleId,
  descriptionId,
}: {
  architecture: TreeArchitecture;
  dataset: BuilderDataset;
  titleId: string;
  descriptionId: string;
}) {
  const rules = architectureRules(architecture, dataset.id);
  const leafValues = architectureLeafValues(architecture, dataset.id);
  const leafLabels = architecture.leaves === "constant"
    ? leafValues.map((value, index) => `c${["₁", "₂", "₃", "₄"][index]} = ${format(value)}`)
    : ["β₁ᵀx + b₁", "β₂ᵀx + b₂", "β₃ᵀx + b₃", "β₄ᵀx + b₄"];
  const edgeClass = architecture.routing === "soft"
    ? `${styles.treeEdge} ${styles.softTreeEdge}`
    : styles.treeEdge;

  return (
    <svg
      className={styles.treeChart}
      viewBox="0 0 640 300"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      data-rule-sharing={architecture.rules}
    >
      <title id={titleId}>The assembled depth-two tree</title>
      <desc id={descriptionId}>
        For the {dataset.label} dataset, the root uses {rules.root.label}.{" "}
        {childRuleSummary(architecture, dataset.id)}{" "}
        Routing is {architecture.routing}, and the four leaves are {architecture.leaves} models.
      </desc>

      <path className={edgeClass} d="M320 75 L157 128 M320 75 L483 128" />
      <path className={edgeClass} d="M157 177 L80 229 M157 177 L235 229 M483 177 L405 229 M483 177 L560 229" />

      <g data-tree-node="root">
        <rect className={styles.ruleNode} x="190" y="27" width="260" height="50" rx="11" />
        <text className={styles.ruleLabel} x="320" y="49" textAnchor="middle">{rules.root.label}</text>
        <text className={styles.ruleMeta} x="320" y="66" textAnchor="middle">depth 1</text>
      </g>
      <g data-tree-node="left-rule">
        <rect className={architecture.rules === "shared-by-depth" ? styles.sharedRuleNode : styles.ruleNode} x="22" y="127" width="270" height="50" rx="11" />
        <text className={styles.ruleLabel} x="157" y="149" textAnchor="middle">{rules.left.label}</text>
        <text className={styles.ruleMeta} x="157" y="166" textAnchor="middle">
          {architecture.rules === "shared-by-depth" ? "shared depth 2 rule" : "left-region rule"}
        </text>
      </g>
      <g data-tree-node="right-rule">
        <rect className={architecture.rules === "shared-by-depth" ? styles.sharedRuleNode : styles.ruleNode} x="348" y="127" width="270" height="50" rx="11" />
        <text className={styles.ruleLabel} x="483" y="149" textAnchor="middle">{rules.right.label}</text>
        <text className={styles.ruleMeta} x="483" y="166" textAnchor="middle">
          {architecture.rules === "shared-by-depth" ? "shared depth 2 rule" : "right-region rule"}
        </text>
      </g>

      {leafLabels.map((label, index) => {
        const centers = [80, 235, 405, 560];
        const center = centers[index];
        return (
          <g data-tree-node={`leaf-${index + 1}`} key={label}>
            <rect className={styles.builderLeaf} x={center - 60} y="228" width="120" height="48" rx="11" />
            <text className={styles.leafModelLabel} x={center} y="248" textAnchor="middle">
              {architecture.leaves === "constant" ? "constant" : "linear"}
            </text>
            <text className={styles.leafModelValue} x={center} y="265" textAnchor="middle">{label}</text>
          </g>
        );
      })}
      <text className={styles.routingCaption} x="320" y="294" textAnchor="middle">
        {architecture.routing === "hard" ? "one crisp path per observation" : "all four paths receive weight"}
      </text>
    </svg>
  );
}

type ArchitectureField = keyof TreeArchitecture;

interface ArchitectureControl {
  field: ArchitectureField;
  label: string;
  options: readonly { value: TreeArchitecture[ArchitectureField]; label: string }[];
}

const ARCHITECTURE_CONTROLS: readonly ArchitectureControl[] = [
  {
    field: "split",
    label: "Split",
    options: [
      { value: "axis-aligned", label: "Axis-aligned" },
      { value: "oblique", label: "Oblique" },
    ],
  },
  {
    field: "routing",
    label: "Routing",
    options: [
      { value: "hard", label: "Hard" },
      { value: "soft", label: "Soft" },
    ],
  },
  {
    field: "rules",
    label: "Rules",
    options: [
      { value: "independent", label: "Independent" },
      { value: "shared-by-depth", label: "Shared by depth" },
    ],
  },
  {
    field: "leaves",
    label: "Leaves",
    options: [
      { value: "constant", label: "Constant" },
      { value: "linear", label: "Linear" },
    ],
  },
] as const;

function setArchitectureField(
  architecture: TreeArchitecture,
  field: ArchitectureField,
  value: TreeArchitecture[ArchitectureField],
): TreeArchitecture {
  if (field === "split") return { ...architecture, split: value as SplitGeometry };
  if (field === "routing") return { ...architecture, routing: value as RoutingMode };
  if (field === "rules") return { ...architecture, rules: value as RuleSharing };
  return { ...architecture, leaves: value as LeafModel };
}

export function TreeArchitectureBuilder() {
  const id = useId();
  const [architecture, setArchitecture] = useState<TreeArchitecture>({ ...CART_ARCHITECTURE });
  const [datasetId, setDatasetId] = useState<BuilderDatasetId>(DEFAULT_BUILDER_DATASET_ID);
  const dataset = BUILDER_DATASETS.find((candidate) => candidate.id === datasetId)
    ?? BUILDER_DATASETS[0];
  const surface = useMemo(
    () => createDecisionSurface(architecture, SURFACE_STEPS, dataset.id),
    [architecture, dataset.id],
  );
  const complexity = architectureComplexity(architecture);

  return (
    <section
      className={`${styles.playground} ${styles.builderPlayground}`}
      role="region"
      aria-labelledby={`${id}-title`}
      data-beyond-cart-playground="architecture-builder"
      data-dataset={dataset.id}
      data-sample-count={dataset.points.length}
      data-split={architecture.split}
      data-routing={architecture.routing}
      data-rules={architecture.rules}
      data-leaves={architecture.leaves}
      data-rule-count={complexity.distinctRules}
      data-node-evaluations={complexity.nodeEvaluations}
    >
      <header className={`${styles.header} ${styles.builderHeader}`}>
        <div className={styles.builderHeaderTop}>
          <div>
            <p className={styles.kicker}>Design space</p>
            <h3 id={`${id}-title`}>Build a tree</h3>
          </div>
          <span className={styles.depthBadge}>fixed depth 2 · illustrative</span>
        </div>
        <div className={styles.builderToolbar}>
          <div className={styles.toolbarGroup} role="group" aria-label="Dataset">
            <span>Dataset</span>
            <div>
              {BUILDER_DATASETS.map((candidate) => (
                <button
                  type="button"
                  aria-pressed={dataset.id === candidate.id}
                  data-builder-dataset={candidate.id}
                  onClick={() => setDatasetId(candidate.id)}
                  key={candidate.id}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.toolbarGroup}>
            <span>Baseline</span>
            <div>
              <button
                type="button"
                onClick={() => setArchitecture({ ...CART_ARCHITECTURE })}
                data-builder-reset
              >
                Reset to CART
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.builderGuide}>
        <strong>Change one row at a time.</strong>
        <span>
          The observations stay fixed. Each choice loads a hand-set example so you can
          isolate architecture—not compare training quality.
        </span>
      </div>

      <div className={styles.architectureControls}>
        {ARCHITECTURE_CONTROLS.map((control) => (
          <div
            className={styles.choiceGroup}
            role="group"
            aria-labelledby={`${id}-${control.field}-label`}
            data-architecture-control={control.field}
            key={control.field}
          >
            <span id={`${id}-${control.field}-label`}>{control.label}</span>
            <div>
              {control.options.map((option) => (
                <button
                  type="button"
                  aria-pressed={architecture[control.field] === option.value}
                  data-choice={option.value}
                  onClick={() => setArchitecture((current) => (
                    setArchitectureField(current, control.field, option.value)
                  ))}
                  key={option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.builderViews}>
        <section className={styles.viewPanel} aria-labelledby={`${id}-surface-heading`}>
          <div className={styles.panelHeading}>
            <strong id={`${id}-surface-heading`}>Decision surface</strong>
            <span>{dataset.points.length} observations · held fixed</span>
          </div>
          <DecisionSurface
            architecture={architecture}
            cells={surface}
            dataset={dataset}
            titleId={`${id}-surface-title`}
            descriptionId={`${id}-surface-description`}
          />
          <div className={styles.predictionScale} aria-label="Surface color scale from prediction zero to prediction one">
            <span>prediction 0</span>
            <i aria-hidden="true" />
            <span>prediction 1</span>
          </div>
        </section>
        <section className={styles.viewPanel} aria-labelledby={`${id}-tree-heading`}>
          <div className={styles.panelHeading}>
            <strong id={`${id}-tree-heading`}>Tree</strong>
            <span>{architecture.routing === "hard" ? "crisp path" : "weighted paths"}</span>
          </div>
          <TreeDiagram
            architecture={architecture}
            dataset={dataset}
            titleId={`${id}-tree-title`}
            descriptionId={`${id}-tree-description`}
          />
        </section>
      </div>

      <div className={styles.complexityBand} aria-label="Architecture complexity">
        <div>
          <span>Distinct split rules</span>
          <strong data-complexity-value="rules">{complexity.distinctRules}</strong>
          <small>{architecture.rules === "shared-by-depth" ? "root + one shared depth-2 rule" : "root + two local depth-2 rules"}</small>
        </div>
        <div>
          <span>Split evaluations</span>
          <strong data-complexity-value="evaluations">≈ {complexity.nodeEvaluations}</strong>
          <small>for one prediction</small>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        Current dataset: {dataset.label}, {dataset.points.length} observations. {dataset.description}{" "}
        Current architecture: {architectureSummary(architecture)}.{" "}
        The displayed rules and leaf values are fixed examples, not fitted comparisons.{" "}
        {surfaceEvidenceSummary(architecture)} {childRuleSummary(architecture, dataset.id)} It uses
        {" "}{complexity.distinctRules} distinct split rules and needs approximately
        {" "}{complexity.nodeEvaluations} rule evaluations for one prediction.
      </p>
    </section>
  );
}
