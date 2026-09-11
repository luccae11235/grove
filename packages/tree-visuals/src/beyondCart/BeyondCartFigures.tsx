import { useId, type ReactNode } from "react";
import styles from "./BeyondCartFigures.module.css";

export type BeyondCartFigureKind =
  | "architecture-anatomy"
  | "split-geometry"
  | "rule-sharing"
  | "model-leaves"
  | "design-space"
  | "tradeoff-map";

interface BeyondCartFigureProps {
  kind: BeyondCartFigureKind;
}

interface FigureShellProps {
  kind: BeyondCartFigureKind;
  figureId: string;
  kicker: string;
  title: string;
  caption: string;
  children: ReactNode;
}

const SPLIT_POINTS = [
  { id: "a1", x: 0.14, y: 0.54, className: "circle" },
  { id: "a2", x: 0.22, y: 0.72, className: "circle" },
  { id: "a3", x: 0.34, y: 0.67, className: "circle" },
  { id: "a4", x: 0.43, y: 0.84, className: "circle" },
  { id: "a5", x: 0.57, y: 0.82, className: "circle" },
  { id: "a6", x: 0.7, y: 0.92, className: "circle" },
  { id: "b1", x: 0.13, y: 0.16, className: "square" },
  { id: "b2", x: 0.28, y: 0.27, className: "square" },
  { id: "b3", x: 0.4, y: 0.36, className: "square" },
  { id: "b4", x: 0.55, y: 0.45, className: "square" },
  { id: "b5", x: 0.7, y: 0.56, className: "square" },
  { id: "b6", x: 0.84, y: 0.68, className: "square" },
] as const;

const REGRESSION_POINTS = [
  { id: "r1", x: 0.08, y: 0.17 },
  { id: "r2", x: 0.16, y: 0.23 },
  { id: "r3", x: 0.25, y: 0.31 },
  { id: "r4", x: 0.34, y: 0.4 },
  { id: "r5", x: 0.43, y: 0.46 },
  { id: "r6", x: 0.56, y: 0.57 },
  { id: "r7", x: 0.65, y: 0.63 },
  { id: "r8", x: 0.74, y: 0.69 },
  { id: "r9", x: 0.83, y: 0.77 },
  { id: "r10", x: 0.92, y: 0.82 },
] as const;

function FigureShell({
  kind,
  figureId,
  kicker,
  title,
  caption,
  children,
}: FigureShellProps) {
  const headingId = `${figureId}-heading`;
  const captionId = `${figureId}-caption`;

  return (
    <figure
      className={styles.figure}
      data-beyond-cart-figure={kind}
      aria-labelledby={`${headingId} ${captionId}`}
    >
      <div className={styles.frame}>
        <header className={styles.figureHeader}>
          <p>{kicker}</p>
          <h3 id={headingId}>{title}</h3>
        </header>
        {children}
      </div>
      <figcaption id={captionId}>{caption}</figcaption>
    </figure>
  );
}

function ArchitectureAnatomy({ figureId }: { figureId: string }) {
  const svgTitleId = `${figureId}-tree-title`;
  const svgDescriptionId = `${figureId}-tree-description`;

  return (
    <FigureShell
      kind="architecture-anatomy"
      figureId={figureId}
      kicker="CART, unpacked"
      title="Four choices hide inside one familiar tree"
      caption="CART is not the definition of a tree. It is one coordinated choice for splitting, routing, rule sharing, and prediction."
    >
      <div className={styles.anatomyBody}>
        <div className={`${styles.anatomyNote} ${styles.anatomySplit}`}>
          <span className={styles.noteNumber}>1</span>
          <span><strong>Split geometry</strong><small>one feature + threshold</small></span>
          <code>xⱼ &lt; t</code>
        </div>
        <div className={`${styles.anatomyNote} ${styles.anatomyRouting}`}>
          <span className={styles.noteNumber}>2</span>
          <span><strong>Routing</strong><small>one crisp path</small></span>
          <code>L xor R</code>
        </div>

        <div className={styles.anatomyTree}>
          <span className={styles.cartBadge}>CART</span>
          <svg
            viewBox="0 0 310 280"
            role="img"
            aria-labelledby={`${svgTitleId} ${svgDescriptionId}`}
          >
            <title id={svgTitleId}>A small CART tree</title>
            <desc id={svgDescriptionId}>
              A root question sends each observation down one path through a
              second independent question to a leaf with a constant prediction.
            </desc>
            <path className={styles.treeEdge} d="M155 57 82 109M155 57l73 52" />
            <path className={styles.treeEdge} d="M82 151 46 204M82 151l36 53M228 151l-36 53M228 151l36 53" />
            <path className={styles.activePath} d="M155 57l73 52M228 151l-36 53" />

            <g className={styles.questionNode} transform="translate(100 20)">
              <rect width="110" height="40" rx="9" />
              <text x="55" y="25" textAnchor="middle">x₁ &lt; 3?</text>
            </g>
            <g className={styles.questionNodeMuted} transform="translate(31 110)">
              <rect width="102" height="40" rx="9" />
              <text x="51" y="25" textAnchor="middle">x₂ &lt; 5?</text>
            </g>
            <g className={styles.questionNode} transform="translate(177 110)">
              <rect width="102" height="40" rx="9" />
              <text x="51" y="25" textAnchor="middle">x₃ &lt; 2?</text>
            </g>

            {[
              { x: 17, value: "0.2" },
              { x: 89, value: "0.5" },
              { x: 163, value: "0.7" },
              { x: 235, value: "0.9" },
            ].map((leaf) => (
              <g className={styles.constantLeaf} transform={`translate(${leaf.x} 204)`} key={leaf.value}>
                <rect width="58" height="42" rx="21" />
                <text x="29" y="26" textAnchor="middle">{leaf.value}</text>
              </g>
            ))}
            <text className={styles.pathLabel} x="210" y="86">one path</text>
            <text className={styles.leafLabel} x="155" y="270" textAnchor="middle">constant predictions</text>
          </svg>
        </div>

        <div className={`${styles.anatomyNote} ${styles.anatomyRules}`}>
          <span className={styles.noteNumber}>3</span>
          <span><strong>Parameter sharing</strong><small>none across nodes</small></span>
          <code>g₁ ≠ g₂</code>
        </div>
        <div className={`${styles.anatomyNote} ${styles.anatomyLeaves}`}>
          <span className={styles.noteNumber}>4</span>
          <span><strong>Leaf model</strong><small>one stored value</small></span>
          <code>ŷ = cℓ</code>
        </div>
      </div>
    </FigureShell>
  );
}

function splitX(value: number) {
  return 34 + value * 278;
}

function splitY(value: number) {
  return 220 - value * 190;
}

function SplitPanel({
  mode,
  figureId,
}: {
  mode: "cart" | "oblique";
  figureId: string;
}) {
  const cart = mode === "cart";
  const titleId = `${figureId}-${mode}-title`;
  const descriptionId = `${figureId}-${mode}-description`;

  return (
    <section className={styles.comparisonPanel}>
      <header className={styles.panelHeader}>
        <span>{cart ? "CART" : "Oblique"}</span>
        <strong>{cart ? "Several axis-aligned cuts" : "One diagonal cut"}</strong>
      </header>
      <svg
        className={styles.scatterPlot}
        viewBox="0 0 340 252"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>
          {cart ? "A staircase CART boundary" : "A single oblique boundary"}
        </title>
        <desc id={descriptionId}>
          {cart
            ? "Circular and square observations are separated by four horizontal and vertical CART cuts that form a staircase."
            : "The same circular and square observations are separated by one diagonal weighted-feature split."}
        </desc>
        <rect className={styles.plotBackground} x="34" y="20" width="278" height="200" rx="8" />
        <path className={styles.plotAxis} d="M34 20v200h278" />
        <text className={styles.axisLabel} x="304" y="242">x₁</text>
        <text className={styles.axisLabel} x="13" y="31">x₂</text>
        {cart ? (
          <>
            <path className={styles.cartBoundary} d="M45 203H101V168H158V133H215V98H269V62H312" />
            <text className={styles.boundaryLabel} x="178" y="119">4 cuts</text>
          </>
        ) : (
          <>
            <path className={styles.obliqueBoundary} d="M45 207 305 50" />
            <text className={styles.boundaryLabel} x="190" y="111" transform="rotate(-31 190 111)">wᵀx &lt; t</text>
          </>
        )}
        {SPLIT_POINTS.map((point) =>
          point.className === "circle" ? (
            <circle
              className={styles.classCircle}
              cx={splitX(point.x)}
              cy={splitY(point.y)}
              r="6"
              key={point.id}
            />
          ) : (
            <rect
              className={styles.classSquare}
              x={splitX(point.x) - 5.5}
              y={splitY(point.y) - 5.5}
              width="11"
              height="11"
              rx="1"
              key={point.id}
            />
          ),
        )}
      </svg>
    </section>
  );
}

function SplitGeometry({ figureId }: { figureId: string }) {
  return (
    <FigureShell
      kind="split-geometry"
      figureId={figureId}
      kicker="Change the split"
      title="The same diagonal boundary can live in the nodes or in the tree"
      caption="CART keeps each node simple and spends more tree structure. An oblique node spends more parameters on one split."
    >
      <div className={styles.pairBody}>
        <div className={styles.classKey} role="group" aria-label="Circles are class A; squares are class B">
          <span><i className={styles.circleKey} aria-hidden="true" />Class A</span>
          <span><i className={styles.squareKey} aria-hidden="true" />Class B</span>
        </div>
        <div className={styles.comparisonPair}>
          <SplitPanel mode="cart" figureId={figureId} />
          <SplitPanel mode="oblique" figureId={figureId} />
        </div>
      </div>
    </FigureShell>
  );
}

interface TreePanelProps {
  mode: "ordinary" | "symmetric";
  figureId: string;
}

function RuleTreePanel({ mode, figureId }: TreePanelProps) {
  const symmetric = mode === "symmetric";
  const titleId = `${figureId}-${mode}-title`;
  const descriptionId = `${figureId}-${mode}-description`;

  return (
    <section className={styles.comparisonPanel}>
      <header className={styles.panelHeader}>
        <span>{symmetric ? "Oblivious tree" : "Ordinary tree"}</span>
        <strong>{symmetric ? "One rule shared by depth" : "One rule learned by node"}</strong>
      </header>
      <svg
        className={styles.ruleTree}
        viewBox="0 0 340 280"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>
          {symmetric ? "A symmetric tree with shared depth rules" : "An ordinary tree with independent node rules"}
        </title>
        <desc id={descriptionId}>
          {symmetric
            ? "The root tests income below fifty. Both nodes at the second depth test age below thirty-five."
            : "The root tests income below fifty. The left child tests age below thirty-five while the right child tests tenure below three."}
        </desc>

        <path className={styles.treeEdge} d="M170 61 92 116M170 61l78 55M92 158 50 218M92 158l42 60M248 158l-42 60M248 158l42 60" />
        {symmetric && <path className={styles.sharedLevelGuide} d="M40 107H300" />}

        <g className={styles.ruleRoot} transform="translate(109 23)">
          <rect width="122" height="42" rx="9" />
          <text x="61" y="26" textAnchor="middle">income &lt; 50</text>
        </g>
        <g className={symmetric ? styles.sharedRuleNode : styles.ruleNode} transform="translate(35 116)">
          <rect width="114" height="42" rx="9" />
          <text x="57" y="26" textAnchor="middle">age &lt; 35</text>
        </g>
        <g className={symmetric ? styles.sharedRuleNode : styles.ruleNodeDifferent} transform="translate(191 116)">
          <rect width="114" height="42" rx="9" />
          <text x="57" y="26" textAnchor="middle">{symmetric ? "age < 35" : "tenure < 3"}</text>
        </g>

        {[21, 106, 177, 262].map((x, index) => (
          <g className={styles.ruleLeaf} transform={`translate(${x} 218)`} key={x}>
            <rect width="57" height="33" rx="16" />
            <text x="28.5" y="21" textAnchor="middle">leaf {index + 1}</text>
          </g>
        ))}
        {symmetric && <text className={styles.sharedGuideLabel} x="170" y="98" textAnchor="middle">same test across this level</text>}
      </svg>
    </section>
  );
}

function RuleSharing({ figureId }: { figureId: string }) {
  return (
    <FigureShell
      kind="rule-sharing"
      figureId={figureId}
      kicker="Change the structure"
      title="An oblivious tree repeats one question across each depth"
      caption="The shared rule removes local freedom, but every observation now follows the same regular sequence of tests."
    >
      <div className={styles.pairBody}>
        <div className={styles.comparisonPair}>
          <RuleTreePanel mode="ordinary" figureId={figureId} />
          <RuleTreePanel mode="symmetric" figureId={figureId} />
        </div>
      </div>
    </FigureShell>
  );
}

function regressionX(value: number) {
  return 35 + value * 275;
}

function regressionY(value: number) {
  return 218 - value * 184;
}

function LeafPanel({
  mode,
  figureId,
}: {
  mode: "constant" | "linear";
  figureId: string;
}) {
  const constant = mode === "constant";
  const titleId = `${figureId}-${mode}-title`;
  const descriptionId = `${figureId}-${mode}-description`;

  return (
    <section className={styles.comparisonPanel}>
      <header className={styles.panelHeader}>
        <span>{constant ? "CART leaves" : "Model leaves"}</span>
        <strong>{constant ? "One value inside each region" : "One fitted line inside each region"}</strong>
      </header>
      <svg
        className={styles.regressionPlot}
        viewBox="0 0 340 252"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>
          {constant ? "Piecewise constant leaf predictions" : "Piecewise linear leaf predictions"}
        </title>
        <desc id={descriptionId}>
          {constant
            ? "Two regions contain the same rising observations as the model-tree panel, but each CART leaf predicts one horizontal mean."
            : "The same two regions and observations each contain a fitted rising line with its own slope and intercept."}
        </desc>
        <rect className={styles.leftRegion} x="35" y="22" width="137.5" height="196" />
        <rect className={styles.rightRegion} x="172.5" y="22" width="137.5" height="196" />
        <path className={styles.plotAxis} d="M35 22v196h275" />
        <path className={styles.partitionLine} d="M172.5 22v196" />
        <text className={styles.partitionLabel} x="172.5" y="16" textAnchor="middle">same partition</text>
        <text className={styles.axisLabel} x="304" y="242">x</text>
        <text className={styles.axisLabel} x="12" y="33">y</text>

        {constant ? (
          <>
            <path className={styles.constantPrediction} d={`M35 ${regressionY(0.32)}H172.5M172.5 ${regressionY(0.69)}H310`} />
            <text className={styles.predictionLabel} x="46" y={regressionY(0.32) - 8}>leaf mean</text>
            <text className={styles.predictionLabel} x="230" y={regressionY(0.69) - 8}>leaf mean</text>
          </>
        ) : (
          <>
            <path className={styles.linearPrediction} d={`M45 ${regressionY(0.16)}L166 ${regressionY(0.49)}M180 ${regressionY(0.54)}L306 ${regressionY(0.84)}`} />
            <text className={styles.predictionLabel} x="50" y={regressionY(0.2) - 10}>local line</text>
            <text className={styles.predictionLabel} x="236" y={regressionY(0.73) - 10}>local line</text>
          </>
        )}

        {REGRESSION_POINTS.map((point) => (
          <circle
            className={styles.regressionPoint}
            cx={regressionX(point.x)}
            cy={regressionY(point.y)}
            r="4.1"
            key={point.id}
          />
        ))}
      </svg>
    </section>
  );
}

function ModelLeaves({ figureId }: { figureId: string }) {
  return (
    <FigureShell
      kind="model-leaves"
      figureId={figureId}
      kicker="Change the leaf"
      title="The tree can choose the regime while each leaf models what happens inside"
      caption="Both trees use the same partition. The model tree spends extra parameters to capture the local trend without adding more splits."
    >
      <div className={styles.pairBody}>
        <div className={styles.comparisonPair}>
          <LeafPanel mode="constant" figureId={figureId} />
          <LeafPanel mode="linear" figureId={figureId} />
        </div>
      </div>
    </FigureShell>
  );
}

const DESIGN_ROWS = [
  {
    choice: "Split geometry",
    cart: "xⱼ < t",
    alternative: "wᵀx < t",
    family: "Oblique",
  },
  {
    choice: "Routing",
    cart: "left or right",
    alternative: "left + right weights",
    family: "Soft",
  },
  {
    choice: "Node rules",
    cart: "one rule per node",
    alternative: "one rule per depth",
    family: "Oblivious",
  },
  {
    choice: "Leaf prediction",
    cart: "constant cℓ",
    alternative: "local model fℓ(x)",
    family: "Model tree",
  },
] as const;

function DesignSpace({ figureId }: { figureId: string }) {
  return (
    <FigureShell
      kind="design-space"
      figureId={figureId}
      kicker="Four independent decisions"
      title="A tree architecture is assembled one design axis at a time"
      caption="The columns are choices, not a ranking. Any row can change while the other three stay fixed."
    >
      <div className={styles.designSpaceBody}>
        <table className={styles.designTable}>
          <caption className={styles.srOnly}>
            Four decision-tree design choices, CART defaults, and alternative model families.
          </caption>
          <thead>
            <tr>
              <th scope="col">Design axis</th>
              <th scope="col">CART choice</th>
              <th scope="col">Another choice</th>
            </tr>
          </thead>
          <tbody>
            {DESIGN_ROWS.map((row, index) => (
              <tr key={row.choice}>
                <th scope="row"><span>{index + 1}</span>{row.choice}</th>
                <td data-label="CART"><code>{row.cart}</code></td>
                <td data-label="Alternative">
                  <code>{row.alternative}</code>
                  <strong>{row.family}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FigureShell>
  );
}

const TRADEOFFS = [
  {
    family: "Oblique",
    gain: "compact boundaries",
    cost: "harder split search",
    position: "top",
  },
  {
    family: "Soft",
    gain: "smooth optimization",
    cost: "several weighted paths",
    position: "right",
  },
  {
    family: "Model leaves",
    gain: "local trends",
    cost: "more parameters + data",
    position: "bottom",
  },
  {
    family: "Oblivious",
    gain: "regular evaluation",
    cost: "less local flexibility",
    position: "left",
  },
] as const;

function CartGlyph({ figureId }: { figureId: string }) {
  const titleId = `${figureId}-cart-glyph-title`;
  const descriptionId = `${figureId}-cart-glyph-description`;

  return (
    <svg
      className={styles.cartGlyph}
      viewBox="0 0 86 58"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>CART tree at the center of four trade-offs</title>
      <desc id={descriptionId}>A root node connects to two decision nodes and four leaves.</desc>
      <path d="M43 11v12M43 23 20 38M43 23l23 15M20 38v10M66 38v10" />
      <circle cx="43" cy="9" r="6" />
      <circle cx="20" cy="38" r="5" />
      <circle cx="66" cy="38" r="5" />
      <circle cx="20" cy="51" r="4" />
      <circle cx="66" cy="51" r="4" />
    </svg>
  );
}

function TradeoffCard({
  tradeoff,
}: {
  tradeoff: (typeof TRADEOFFS)[number];
}) {
  return (
    <section
      className={`${styles.tradeoffCard} ${styles[`tradeoff-${tradeoff.position}`]}`}
      data-position={tradeoff.position}
    >
      <h4>{tradeoff.family}</h4>
      <div className={styles.tradeoffPair}>
        <span><b>Gain</b>{tradeoff.gain}</span>
        <i aria-hidden="true">↔</i>
        <span><b>Cost</b>{tradeoff.cost}</span>
      </div>
    </section>
  );
}

function TradeoffMap({ figureId }: { figureId: string }) {
  return (
    <FigureShell
      kind="tradeoff-map"
      figureId={figureId}
      kicker="Constraints buy useful behavior"
      title="Every move away from CART exchanges one property for another"
      caption="The alternatives point in different directions. None is a universal upgrade; each moves complexity to a new part of the model."
    >
      <div className={styles.tradeoffBody}>
        <div className={styles.tradeoffGrid}>
          {TRADEOFFS.map((tradeoff) => <TradeoffCard tradeoff={tradeoff} key={tradeoff.family} />)}
          <div className={styles.tradeoffCenter}>
            <CartGlyph figureId={figureId} />
            <strong>CART</strong>
            <span>one choice set</span>
          </div>
          <span className={`${styles.tradeoffConnector} ${styles.connectorTop}`} aria-hidden="true">↑</span>
          <span className={`${styles.tradeoffConnector} ${styles.connectorRight}`} aria-hidden="true">→</span>
          <span className={`${styles.tradeoffConnector} ${styles.connectorBottom}`} aria-hidden="true">↓</span>
          <span className={`${styles.tradeoffConnector} ${styles.connectorLeft}`} aria-hidden="true">←</span>
        </div>
      </div>
    </FigureShell>
  );
}

export function BeyondCartFigure({ kind }: BeyondCartFigureProps) {
  const reactId = useId();
  const figureId = `beyond-cart-${kind}-${reactId.replace(/:/g, "")}`;

  if (kind === "architecture-anatomy") return <ArchitectureAnatomy figureId={figureId} />;
  if (kind === "split-geometry") return <SplitGeometry figureId={figureId} />;
  if (kind === "rule-sharing") return <RuleSharing figureId={figureId} />;
  if (kind === "model-leaves") return <ModelLeaves figureId={figureId} />;
  if (kind === "design-space") return <DesignSpace figureId={figureId} />;
  return <TradeoffMap figureId={figureId} />;
}
