import { useEffect, useId, useState } from "react";
import styles from "./BeyondCartAnimations.module.css";
import { SOFT_TREE_LEFT_VALUE, SOFT_TREE_RIGHT_VALUE } from "./model";

export type BeyondCartAnimationKind = "hard-routing" | "batch-evaluation";

export interface BeyondCartAnimationProps {
  kind: BeyondCartAnimationKind;
}

const BATCH_DELAY_MS = 1_250;

type BatchSample = {
  id: "A" | "B" | "C" | "D";
  income: number;
  age: number;
  tenure: number;
};

type TreeMode = "ordinary" | "symmetric";

const BATCH: readonly BatchSample[] = [
  { id: "A", income: 32, age: 29, tenure: 5 },
  { id: "B", income: 44, age: 48, tenure: 1 },
  { id: "C", income: 68, age: 31, tenure: 2 },
  { id: "D", income: 75, age: 42, tenure: 7 },
];

const BATCH_STEPS = [
  {
    label: "Batch ready",
    summary: "The same observations A, B, C, and D enter both trees.",
  },
  {
    label: "Root",
    summary: "Both trees apply income < 50 to the whole batch at the root.",
  },
  {
    label: "Depth two",
    summary:
      "After the root, CART splits the batch: A and B use age < 35, while C and D use tenure < 3. The symmetric tree keeps A through D aligned and applies age < 35 across the level.",
  },
  {
    label: "Leaves",
    summary:
      "A reaches LL, B reaches LR, C reaches RL, and D reaches RR in both trees. CART used two local second-level tests; the symmetric tree used one shared test across A through D.",
  },
] as const;

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}

function formatInput(value: number): string {
  const digits = Math.abs(value) > 0 && Math.abs(value) < 0.1 ? 2 : 1;
  const magnitude = Math.abs(value).toFixed(digits);
  return value < 0 ? `−${magnitude}` : magnitude;
}

function branchFor(value: number): "left" | "right" {
  return value < 0 ? "left" : "right";
}

function hardRoutingX(value: number): number {
  return 80 + ((value + 1.5) / 3) * 360;
}

function HardRoutingAnimation() {
  const graphicId = useId();
  const [input, setInput] = useState(-0.05);
  const branch = branchFor(input);
  const prediction = branch === "left" ? SOFT_TREE_LEFT_VALUE : SOFT_TREE_RIGHT_VALUE;
  const pointX = hardRoutingX(input);

  const liveSummary = `Observation x = ${formatInput(input)} follows the ${branch} branch. The prediction is ${prediction}.`;

  return (
    <section
      className={styles.animation}
      aria-labelledby={`${graphicId}-heading`}
      data-beyond-cart-animation="hard-routing"
      data-beyond-cart-branch={branch}
      data-beyond-cart-input={formatInput(input)}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Hard routing</p>
          <h3 id={`${graphicId}-heading`}>A tiny move can flip the prediction</h3>
        </div>
        <p className={styles.lede} id={`${graphicId}-instruction`}>
          Drag the green dot across zero, or focus it and use the arrow keys. Watch the path and prediction change.
        </p>
      </header>

      <div className={styles.stage}>
        <div className={styles.hardRoutingSurface}>
          <svg
            className={styles.hardRoutingGraphic}
            viewBox="0 0 520 320"
            role="img"
            aria-labelledby={`${graphicId}-svg-title ${graphicId}-svg-description`}
          >
            <title id={`${graphicId}-svg-title`}>
              One observation crossing a hard tree threshold
            </title>
            <desc id={`${graphicId}-svg-description`}>
              A fixed stump tests whether x is less than zero. The left leaf predicts {SOFT_TREE_LEFT_VALUE} and the right leaf predicts {SOFT_TREE_RIGHT_VALUE}. As the same observation crosses zero, the active branch and prediction switch abruptly.
            </desc>

            <text className={styles.railSideLabel} x="80" y="35">
              left of threshold
            </text>
            <text className={styles.railSideLabel} x="440" y="35" textAnchor="end">
              right of threshold
            </text>
            <line className={styles.inputRail} x1="80" x2="440" y1="65" y2="65" />
            <line className={styles.threshold} x1="260" x2="260" y1="42" y2="91" />
            <text className={styles.thresholdLabel} x="260" y="106" textAnchor="middle">
              t = 0
            </text>

            <g
              className={styles.movingObservation}
              style={{ transform: `translate(${pointX}px, 0)` }}
              data-beyond-cart-observation
            >
              <text className={styles.observationLabel} x="0" y="20" textAnchor="middle">
                x = {formatInput(input)}
              </text>
            </g>

            <path
              className={`${styles.treeEdge} ${branch === "left" ? styles.treeEdgeActive : ""}`}
              d="M260 167 L150 222"
            />
            <path
              className={`${styles.treeEdge} ${branch === "right" ? styles.treeEdgeActive : ""}`}
              d="M260 167 L370 222"
            />
            <text className={styles.edgeLabel} x="190" y="194" textAnchor="middle">
              yes
            </text>
            <text className={styles.edgeLabel} x="330" y="194" textAnchor="middle">
              no
            </text>

            <rect className={styles.splitNode} x="200" y="121" width="120" height="46" rx="12" />
            <text className={styles.nodeText} x="260" y="150" textAnchor="middle">
              x &lt; 0?
            </text>

            <rect
              className={`${styles.leafNode} ${branch === "left" ? styles.leafNodeActive : ""}`}
              x="95"
              y="222"
              width="110"
              height="58"
              rx="12"
            />
            <text className={styles.leafLabel} x="150" y="244" textAnchor="middle">
              left leaf
            </text>
            <text className={styles.leafValue} x="150" y="266" textAnchor="middle">
              prediction {SOFT_TREE_LEFT_VALUE}
            </text>

            <rect
              className={`${styles.leafNode} ${branch === "right" ? styles.leafNodeActive : ""}`}
              x="315"
              y="222"
              width="110"
              height="58"
              rx="12"
            />
            <text className={styles.leafLabel} x="370" y="244" textAnchor="middle">
              right leaf
            </text>
            <text className={styles.leafValue} x="370" y="266" textAnchor="middle">
              prediction {SOFT_TREE_RIGHT_VALUE}
            </text>

            <text className={styles.predictionLabel} x="260" y="308" textAnchor="middle">
              Current prediction: {prediction}
            </text>
          </svg>
          <input
            className={styles.axisSlider}
            type="range"
            min="-1.5"
            max="1.5"
            step="0.05"
            value={input}
            onInput={(event) => setInput(Number(event.currentTarget.value))}
            onChange={(event) => setInput(Number(event.currentTarget.value))}
            aria-label="Input x on the tree axis"
            aria-describedby={`${graphicId}-instruction`}
            data-beyond-cart-axis-slider
          />
        </div>
      </div>

      <p className={styles.liveSummary} aria-live="polite" aria-atomic="true">
        {liveSummary}
      </p>
    </section>
  );
}

function pathCode(sample: BatchSample, mode: TreeMode): "LL" | "LR" | "RL" | "RR" {
  const firstBranch = sample.income < 50 ? "L" : "R";
  const secondBranch =
    mode === "ordinary" && firstBranch === "R"
      ? sample.tenure < 3
        ? "L"
        : "R"
      : sample.age < 35
        ? "L"
        : "R";

  return `${firstBranch}${secondBranch}` as "LL" | "LR" | "RL" | "RR";
}

function tokenPosition(sample: BatchSample, index: number, step: number, mode: TreeMode) {
  if (step === 0) return { x: 180 + index * 20, y: 24 };

  const firstBranch = sample.income < 50 ? "L" : "R";
  if (step === 1) {
    const branchIndex = firstBranch === "L" ? index : index - 2;
    return {
      x: (firstBranch === "L" ? 91 : 301) + branchIndex * 28,
      y: 119,
    };
  }

  if (step === 2) {
    return mode === "ordinary"
      ? {
          x: index < 2 ? 76 + index * 56 : 288 + (index - 2) * 56,
          y: 218,
        }
      : { x: 120 + index * 60, y: 218 };
  }

  const leafCenters = { LL: 55, LR: 155, RL: 265, RR: 365 } as const;
  const leafX = leafCenters[pathCode(sample, mode)];
  return { x: leafX, y: 283 };
}

function BatchTree({
  mode,
  step,
  titleId,
  descriptionId,
}: {
  mode: TreeMode;
  step: number;
  titleId: string;
  descriptionId: string;
}) {
  const symmetric = mode === "symmetric";
  const title = symmetric ? "Depth-shared symmetric tree" : "Ordinary CART tree";
  const description = symmetric
    ? "The root applies income less than fifty. At depth two, A through D remain in one aligned batch while both nodes share age less than thirty-five."
    : "The root applies income less than fifty. At depth two, A and B form one local batch for age less than thirty-five, while C and D form another for tenure less than three.";

  return (
    <svg
      className={styles.batchTree}
      viewBox="0 0 420 330"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>{title}</title>
      <desc id={descriptionId}>{description}</desc>

      <path
        className={`${styles.batchEdge} ${step >= 1 ? styles.batchEdgeTraversed : ""}`}
        d="M210 92 L105 145 M210 92 L315 145"
      />
      <path
        className={`${styles.batchEdge} ${step >= 3 ? styles.batchEdgeTraversed : ""}`}
        d="M105 191 L55 266 M105 191 L155 266 M315 191 L265 266 M315 191 L365 266"
      />

      <rect
        className={`${styles.batchNode} ${step === 1 ? styles.batchNodeActive : ""}`}
        x="147"
        y="46"
        width="126"
        height="46"
        rx="11"
      />
      <text className={styles.batchNodeText} x="210" y="75" textAnchor="middle">
        income &lt; 50
      </text>

      <text
        className={`${styles.levelCue} ${step === 2 ? styles.levelCueActive : ""}`}
        x="210"
        y="130"
        textAnchor="middle"
      >
        {symmetric ? "one aligned batch" : "two local batches"}
      </text>
      {symmetric ? (
        <path
          className={`${styles.sharedBracket} ${step === 2 ? styles.sharedBracketActive : ""}`}
          d="M42 136 L42 141 L378 141 L378 136"
        />
      ) : null}

      <rect
        className={`${styles.batchNode} ${step === 2 ? styles.batchNodeActive : ""}`}
        x="41"
        y="145"
        width="128"
        height="46"
        rx="11"
      />
      <text className={styles.batchNodeText} x="105" y="174" textAnchor="middle">
        age &lt; 35
      </text>

      <rect
        className={`${styles.batchNode} ${step === 2 ? styles.batchNodeActive : ""}`}
        x="251"
        y="145"
        width="128"
        height="46"
        rx="11"
      />
      <text className={styles.batchNodeText} x="315" y="174" textAnchor="middle">
        {symmetric ? "age < 35" : "tenure < 3"}
      </text>

      <g
        className={`${styles.executionLane} ${step === 2 ? styles.executionLaneActive : ""}`}
        aria-hidden="true"
      >
        {symmetric ? (
          <>
            <rect x="78" y="200" width="264" height="36" rx="18" />
            <text x="210" y="252" textAnchor="middle">one test · A–D stay aligned</text>
          </>
        ) : (
          <>
            <rect x="42" y="200" width="126" height="36" rx="18" />
            <rect x="252" y="200" width="126" height="36" rx="18" />
            <text x="105" y="252" textAnchor="middle">A + B only</text>
            <text x="315" y="252" textAnchor="middle">C + D only</text>
          </>
        )}
      </g>

      {(["LL", "LR", "RL", "RR"] as const).map((code, index) => (
        <g key={code}>
          <rect
            className={`${styles.batchLeaf} ${step === 3 ? styles.batchLeafActive : ""}`}
            x={20 + index * 100}
            y="266"
            width="70"
            height="48"
            rx="10"
          />
          <text className={styles.batchLeafText} x={55 + index * 100} y="307" textAnchor="middle">
            leaf {code}
          </text>
        </g>
      ))}

      {BATCH.map((sample, index) => {
        const position = tokenPosition(sample, index, step, mode);
        return (
          <g
            className={styles.batchToken}
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            data-beyond-cart-sample={sample.id}
            key={sample.id}
          >
            <circle className={styles.batchTokenCircle} r="11" />
            <text className={styles.batchTokenText} y="4" textAnchor="middle">
              {sample.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BatchEvaluationAnimation() {
  const graphicId = useId();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const lastStep = BATCH_STEPS.length - 1;
  const currentStep = BATCH_STEPS[step];

  useEffect(() => {
    if (reducedMotion && playing) setPlaying(false);
  }, [playing, reducedMotion]);

  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    if (step >= lastStep) {
      setPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(lastStep, current + 1));
    }, BATCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [lastStep, playing, reducedMotion, step]);

  function selectStep(nextStep: number) {
    setPlaying(false);
    setStep(Math.max(0, Math.min(lastStep, nextStep)));
  }

  function togglePlayback() {
    if (
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPlaying(false);
      return;
    }

    if (playing) {
      setPlaying(false);
      return;
    }

    if (step >= lastStep) setStep(0);
    setPlaying(true);
  }

  function reset() {
    setPlaying(false);
    setStep(0);
  }

  return (
    <section
      className={styles.animation}
      aria-labelledby={`${graphicId}-heading`}
      data-beyond-cart-animation="batch-evaluation"
      data-beyond-cart-playing={playing ? "true" : "false"}
      data-beyond-cart-step={step}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Shared by depth</p>
          <h3 id={`${graphicId}-heading`}>One batch, two evaluation patterns</h3>
        </div>
        <p className={styles.lede}>
          CART can ask local questions. A symmetric tree applies one question to the whole batch at each level.
        </p>
      </header>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={step === 0}
          onClick={() => selectStep(step - 1)}
          data-beyond-cart-back
        >
          Back
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          aria-pressed={playing}
          disabled={reducedMotion}
          onClick={togglePlayback}
          data-beyond-cart-play
        >
          {playing ? "Pause" : step >= lastStep ? "Replay" : "Play"}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={step === lastStep}
          onClick={() => selectStep(step + 1)}
          data-beyond-cart-next
        >
          Next
        </button>
        <button
          type="button"
          className={styles.resetButton}
          disabled={step === 0 && !playing}
          onClick={reset}
          data-beyond-cart-reset
        >
          Reset
        </button>
        <span className={styles.stepReadout}>
          {currentStep.label} · {step + 1} of {BATCH_STEPS.length}
        </span>
      </div>

      <div className={styles.batchGrid}>
        <section className={styles.treePanel} aria-label="Ordinary CART evaluation">
          <div className={styles.panelHeading}>
            <strong>Ordinary CART</strong>
            <span>batch splits into local groups</span>
          </div>
          <BatchTree
            mode="ordinary"
            step={step}
            titleId={`${graphicId}-ordinary-title`}
            descriptionId={`${graphicId}-ordinary-description`}
          />
        </section>

        <section className={styles.treePanel} aria-label="Depth-shared symmetric tree evaluation">
          <div className={styles.panelHeading}>
            <strong>Symmetric tree</strong>
            <span>batch stays aligned by depth</span>
          </div>
          <BatchTree
            mode="symmetric"
            step={step}
            titleId={`${graphicId}-symmetric-title`}
            descriptionId={`${graphicId}-symmetric-description`}
          />
        </section>
      </div>

      <p className={styles.liveSummary} aria-live="polite" aria-atomic="true">
        {currentStep.summary}
        {reducedMotion ? " Timed play is off; use Back, Next, or Reset." : ""}
      </p>
    </section>
  );
}

export function BeyondCartAnimation({ kind }: BeyondCartAnimationProps) {
  return kind === "hard-routing" ? (
    <HardRoutingAnimation />
  ) : (
    <BatchEvaluationAnimation />
  );
}
