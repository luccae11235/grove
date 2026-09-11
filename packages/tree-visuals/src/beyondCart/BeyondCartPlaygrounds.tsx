import { useId, useMemo, useState } from "react";
import styles from "./BeyondCartPlaygrounds.module.css";
import {
  ARCHITECTURE_PRESETS,
  BUILDER_POINTS,
  CART_ARCHITECTURE,
  SOFT_TREE_LEFT_VALUE,
  SOFT_TREE_RIGHT_VALUE,
  architectureComplexity,
  architectureRules,
  architectureSummary,
  architecturesEqual,
  createDecisionSurface,
  softRoutingPrediction,
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

function childRuleSummary(architecture: TreeArchitecture): string {
  const rules = architectureRules(architecture);
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
      <circle
        className={styles.observation}
        cx={observationX}
        cy="47"
        r="8"
        data-observation-x={format(x, 1)}
      />
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
  const [x, setX] = useState(-0.8);
  const [temperature, setTemperature] = useState(0.8);
  const result = softRoutingPrediction(x, temperature);
  const modeLabel = result.hard ? "Hard limit" : "Both paths contribute";

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
        <span className={result.hard ? styles.modeHard : styles.modeSoft}>{modeLabel}</span>
      </header>

      <div className={styles.softCanvas}>
        <SoftRoutingDiagram
          x={x}
          temperature={temperature}
          pLeft={result.pLeft}
          pRight={result.pRight}
          titleId={`${id}-diagram-title`}
          descriptionId={`${id}-diagram-description`}
        />
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
        <label htmlFor={`${id}-input`}>
          <span>Input x</span>
          <strong>{format(x, 1)}</strong>
          <input
            id={`${id}-input`}
            type="range"
            min="-3"
            max="3"
            step="0.1"
            value={x}
            onInput={(event) => setX(Number(event.currentTarget.value))}
            onChange={(event) => setX(Number(event.currentTarget.value))}
          />
          <small><span>−3</span><span>threshold 0</span><span>3</span></small>
        </label>
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
          <small><span>0 · hard</span><span>1</span><span>2 · gradual</span></small>
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
  titleId,
  descriptionId,
}: {
  architecture: TreeArchitecture;
  cells: readonly SurfaceCell[];
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
        A fixed two-class dataset over the prediction surface produced by {summary}.{" "}
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
      {BUILDER_POINTS.map((point) => point.label === 1 ? (
        <circle
          className={styles.positivePoint}
          cx={surfaceX(point.x1)}
          cy={surfaceY(point.x2)}
          r="5.2"
          data-point-class="positive"
          key={point.id}
        />
      ) : (
        <rect
          className={styles.negativePoint}
          x={surfaceX(point.x1) - 4.4}
          y={surfaceY(point.x2) - 4.4}
          width="8.8"
          height="8.8"
          transform={`rotate(45 ${surfaceX(point.x1)} ${surfaceY(point.x2)})`}
          data-point-class="negative"
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
  titleId,
  descriptionId,
}: {
  architecture: TreeArchitecture;
  titleId: string;
  descriptionId: string;
}) {
  const rules = architectureRules(architecture);
  const leafLabels = architecture.leaves === "constant"
    ? ["c₁ = 0.10", "c₂ = 0.34", "c₃ = 0.66", "c₄ = 0.90"]
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
        The root uses {rules.root.label}. {childRuleSummary(architecture)}{" "}
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
  const surface = useMemo(() => createDecisionSurface(architecture, SURFACE_STEPS), [architecture]);
  const complexity = architectureComplexity(architecture);
  const selectedPreset = ARCHITECTURE_PRESETS.find((preset) => (
    architecturesEqual(preset.architecture, architecture)
  ));

  return (
    <section
      className={`${styles.playground} ${styles.builderPlayground}`}
      role="region"
      aria-labelledby={`${id}-title`}
      data-beyond-cart-playground="architecture-builder"
      data-split={architecture.split}
      data-routing={architecture.routing}
      data-rules={architecture.rules}
      data-leaves={architecture.leaves}
      data-preset={selectedPreset?.id ?? "custom"}
      data-parameter-count={complexity.totalParameters}
      data-node-evaluations={complexity.nodeEvaluations}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Design space</p>
          <h3 id={`${id}-title`}>Build a tree</h3>
        </div>
        <span className={styles.depthBadge}>fixed depth 2</span>
      </header>

      <div className={styles.presetBar} role="group" aria-label="Architecture presets">
        <span>Start from</span>
        <div>
          {ARCHITECTURE_PRESETS.map((preset) => (
            <button
              type="button"
              aria-pressed={selectedPreset?.id === preset.id}
              data-architecture-preset={preset.id}
              onClick={() => setArchitecture({ ...preset.architecture })}
              key={preset.id}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.builderViews}>
        <section className={styles.viewPanel} aria-labelledby={`${id}-surface-heading`}>
          <div className={styles.panelHeading}>
            <strong id={`${id}-surface-heading`}>Decision surface</strong>
            <span>same 16 observations</span>
          </div>
          <DecisionSurface
            architecture={architecture}
            cells={surface}
            titleId={`${id}-surface-title`}
            descriptionId={`${id}-surface-description`}
          />
        </section>
        <section className={styles.viewPanel} aria-labelledby={`${id}-tree-heading`}>
          <div className={styles.panelHeading}>
            <strong id={`${id}-tree-heading`}>Tree</strong>
            <span>{architecture.routing === "hard" ? "crisp path" : "weighted paths"}</span>
          </div>
          <TreeDiagram
            architecture={architecture}
            titleId={`${id}-tree-title`}
            descriptionId={`${id}-tree-description`}
          />
        </section>
      </div>

      <div className={styles.complexityBand} aria-label="Architecture complexity">
        <div>
          <span>Learned parameters</span>
          <strong data-complexity-value="parameters">{complexity.totalParameters}</strong>
          <small>{complexity.splitParameters} split + {complexity.gateParameters} gate + {complexity.leafParameters} leaf</small>
        </div>
        <div>
          <span>Split evaluations</span>
          <strong data-complexity-value="evaluations">≈ {complexity.nodeEvaluations}</strong>
          <small>for one prediction</small>
        </div>
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

      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        Current architecture: {architectureSummary(architecture)}.{" "}
        {surfaceEvidenceSummary(architecture)} {childRuleSummary(architecture)} It contains
        {" "}{complexity.totalParameters} learned parameters and needs approximately
        {" "}{complexity.nodeEvaluations} split evaluations for one prediction.
      </p>
    </section>
  );
}
