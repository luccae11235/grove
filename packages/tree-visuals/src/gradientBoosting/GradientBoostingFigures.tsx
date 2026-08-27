import { useId, useMemo } from "react";
import styles from "./GradientBoosting.module.css";
import { isPt, type GradientBoostingLocale } from "./locale";
import {
  BOOSTING_EXPERIMENT,
  boostingTreeLeafSegments,
  fitBoostingTree,
  predictBoostingRun,
  runGradientBoosting,
  type BoostingPoint,
  type BoostingTree,
} from "./experiment";

export type GradientBoostingFigureKind =
  | "standalone-tree"
  | "baseline-residuals"
  | "residual-pattern"
  | "residual-tree"
  | "first-update"
  | "round-two-residuals"
  | "correction-reversal";

interface GradientBoostingFigureProps {
  kind: GradientBoostingFigureKind;
  locale?: GradientBoostingLocale;
}

const CHART = {
  width: 640,
  height: 330,
  left: 48,
  right: 18,
  top: 28,
  bottom: 282,
};

const CONTENT: Record<GradientBoostingFigureKind, {
  title: string;
  description: string;
  caption: string;
}> = {
  "standalone-tree": {
    title: "One regression tree makes a step-shaped prediction",
    description: "Thirty-six observations follow a one-dimensional signal. A depth-two regression tree predicts one constant value in each learned interval.",
    caption: "A regression tree divides the input axis into intervals and gives every point in one interval the same prediction.",
  },
  "baseline-residuals": {
    title: "The mean baseline leaves a different error in each region",
    description: "Every observation starts with the same prediction, zero point one three. Amber vertical segments show the signed distance from that baseline to each target.",
    caption: "The constant baseline is too high in some regions and too low in others. Each vertical segment is one residual.",
  },
  "residual-pattern": {
    title: "The baseline residuals still have a pattern across the input axis",
    description: "The horizontal coordinate stays fixed while each target moves to its residual value. Negative residuals gather on the left and positive residuals gather through the central rise.",
    caption: "Once the baseline is subtracted, the errors are still arranged by x rather than scattered randomly around zero.",
  },
  "residual-tree": {
    title: "A shallow tree learns a regional approximation to the residuals",
    description: "A depth-two tree fits four constant levels to the residual pattern. Its step line is negative on the left, strongly positive in the central rise, and mildly positive on the right.",
    caption: "The tree cannot reproduce every residual. It turns their shared regional pattern into a correction function.",
  },
  "first-update": {
    title: "Adding the first correction changes one constant into a regional model",
    description: "The dashed horizontal baseline remains visible behind the updated step-shaped model F one. The observed targets stay fixed.",
    caption: "The targets do not move. The model moves from the dashed baseline to the solid updated prediction F₁ = F₀ + h₁.",
  },
  "round-two-residuals": {
    title: "The first tree leaves a new residual target for the second tree",
    description: "The current model F one and its remaining vertical errors appear on the left. The same signed errors appear around zero on the right, still arranged by input x.",
    caption: "After F₁ has changed by region, the remaining errors form a genuinely new target for tree two.",
  },
  "correction-reversal": {
    title: "Tree two responds to the errors that tree one leaves behind",
    description: "Three observations from the training data are shown. Each observed target stays fixed. An amber arrow moves the baseline prediction F zero to F one, and a green arrow moves F one to F two. The second tree continues downward for the left observation, reverses part of an overshoot for the middle observation, and continues upward for the right observation.",
    caption: "Three observations from the same training set. Tree two keeps moving toward the target where error remains and turns back where tree one overshot.",
  },
};

const CONTENT_PT: typeof CONTENT = {
  "standalone-tree": {
    title: "Uma árvore de regressão produz uma predição em forma de degraus",
    description: "Trinta e seis observações seguem um sinal unidimensional. Uma árvore de regressão de profundidade dois prediz um valor constante em cada intervalo aprendido.",
    caption: "Uma árvore de regressão divide o eixo de input em intervalos e dá a todos os pontos de um intervalo a mesma predição.",
  },
  "baseline-residuals": {
    title: "O baseline da média deixa um erro diferente em cada região",
    description: "Cada observação começa com a mesma predição, zero vírgula treze. Segmentos verticais em âmbar mostram a distância com sinal desse baseline até cada target.",
    caption: "O baseline constante é alto demais em algumas regiões e baixo demais em outras. Cada segmento vertical é um resíduo.",
  },
  "residual-pattern": {
    title: "Os resíduos do baseline ainda têm um padrão ao longo do eixo de input",
    description: "A coordenada horizontal permanece fixa enquanto cada target se move para o valor de seu resíduo. Resíduos negativos se agrupam à esquerda, e resíduos positivos se agrupam ao longo da elevação central.",
    caption: "Depois que o baseline é subtraído, os erros continuam organizados por x, em vez de se espalharem aleatoriamente em torno de zero.",
  },
  "residual-tree": {
    title: "Uma árvore rasa aprende uma aproximação regional dos resíduos",
    description: "Uma árvore de profundidade dois ajusta quatro níveis constantes ao padrão dos resíduos. Sua linha em degraus é negativa à esquerda, fortemente positiva na elevação central e levemente positiva à direita.",
    caption: "A árvore não consegue reproduzir todos os resíduos. Ela transforma o padrão regional compartilhado em uma função de correção.",
  },
  "first-update": {
    title: "Adicionar a primeira correção transforma uma constante em um modelo regional",
    description: "O baseline horizontal tracejado continua visível por trás do modelo atualizado em forma de degraus F um. Os targets observados permanecem fixos.",
    caption: "Os targets não se movem. O modelo sai do baseline tracejado e chega à predição atualizada sólida F₁ = F₀ + h₁.",
  },
  "round-two-residuals": {
    title: "A primeira árvore deixa um novo target residual para a segunda árvore",
    description: "O modelo atual F um e seus erros verticais restantes aparecem à esquerda. Os mesmos erros com sinal aparecem em torno de zero à direita, ainda organizados pelo input x.",
    caption: "Depois que F₁ muda por região, os erros restantes formam um target genuinamente novo para a segunda árvore.",
  },
  "correction-reversal": {
    title: "A segunda árvore responde aos erros deixados pela primeira",
    description: "Três observações dos dados de treino são mostradas. Cada target observado permanece fixo. Uma seta âmbar move a predição do baseline F zero para F um, e uma seta verde move F um para F dois. A segunda árvore continua descendo para a observação à esquerda, desfaz parte de um overshoot na observação central e continua subindo para a observação à direita.",
    caption: "Três observações do mesmo conjunto de treino. A segunda árvore continua movendo a predição em direção ao target onde ainda há erro e volta onde a primeira árvore passou do ponto.",
  },
};

function xScale(value: number): number {
  return CHART.left
    + ((value - BOOSTING_EXPERIMENT.xMinimum)
      / (BOOSTING_EXPERIMENT.xMaximum - BOOSTING_EXPERIMENT.xMinimum))
      * (CHART.width - CHART.right - CHART.left);
}

function yScale(value: number, residual: boolean): number {
  const minimum = residual ? BOOSTING_EXPERIMENT.residualMinimum : BOOSTING_EXPERIMENT.yMinimum;
  const maximum = residual ? BOOSTING_EXPERIMENT.residualMaximum : BOOSTING_EXPERIMENT.yMaximum;
  return CHART.bottom - ((value - minimum) / (maximum - minimum)) * (CHART.bottom - CHART.top);
}

function stepPath(
  tree: BoostingTree,
  residual: boolean,
  offset = 0,
  multiplier = 1,
): string {
  const segments = boostingTreeLeafSegments(tree);
  return segments.map((segment, index) => {
    const prediction = offset + multiplier * segment.prediction;
    const start = `${index === 0 ? "M" : "L"}${xScale(segment.lower).toFixed(2)},${yScale(prediction, residual).toFixed(2)}`;
    const end = `L${xScale(segment.upper).toFixed(2)},${yScale(prediction, residual).toFixed(2)}`;
    return `${start}${end}`;
  }).join("");
}

function Axes({ residual, locale }: { residual: boolean; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const ticks = residual ? [-1, 0, 1] : [-1, 0, 1];
  return (
    <>
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            className={tick === 0 && residual ? styles.zeroLine : styles.gridline}
            x1={CHART.left}
            x2={CHART.width - CHART.right}
            y1={yScale(tick, residual)}
            y2={yScale(tick, residual)}
          />
          <text className={styles.tick} x={CHART.left - 9} y={yScale(tick, residual) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {[-3, 0, 3].map((tick) => (
        <text className={styles.tick} x={xScale(tick)} y={CHART.bottom + 21} textAnchor="middle" key={tick}>
          {tick}
        </text>
      ))}
      <line className={styles.axis} x1={CHART.left} x2={CHART.width - CHART.right} y1={CHART.bottom} y2={CHART.bottom} />
      <text className={styles.axisLabel} x={(CHART.left + CHART.width - CHART.right) / 2} y={CHART.height - 11} textAnchor="middle">
        input x
      </text>
      <text className={styles.axisLabel} x="15" y={(CHART.top + CHART.bottom) / 2} textAnchor="middle" transform={`rotate(-90 15 ${(CHART.top + CHART.bottom) / 2})`}>
        {residual ? "residual" : pt ? "target y" : "target y"}
      </text>
    </>
  );
}

function Points({
  points,
  values,
  residual,
}: {
  points: BoostingPoint[];
  values: number[];
  residual: boolean;
}) {
  return (
    <>
      {points.map((point, index) => (
        <circle
          className={styles.point}
          cx={xScale(point.x)}
          cy={yScale(values[index], residual)}
          r="3.3"
          key={point.id}
        />
      ))}
    </>
  );
}

export function GradientBoostingFigure({ kind, locale = "en" }: GradientBoostingFigureProps) {
  const pt = isPt(locale);
  const id = useId();
  const run = useMemo(() => runGradientBoosting(1, 1), []);
  const firstStage = run.stages[0];
  const residual = kind === "residual-pattern" || kind === "residual-tree";
  const values = residual ? firstStage.residualsBefore : run.training.map((point) => point.y);
  const standaloneTree = useMemo(() => fitBoostingTree(run.training), [run.training]);
  const content = (pt ? CONTENT_PT : CONTENT)[kind];

  if (kind === "round-two-residuals") {
    return <RoundTwoResidualFigure content={content} locale={locale} />;
  }

  if (kind === "correction-reversal") {
    return <CorrectionReversalFigure content={content} locale={locale} />;
  }

  return (
    <figure className={styles.figure} data-gradient-boosting-figure={kind}>
      <div className={styles.figureFrame}>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          role="img"
          aria-labelledby={`${id}-title ${id}-description`}
        >
          <title id={`${id}-title`}>{content.title}</title>
          <desc id={`${id}-description`}>{content.description}</desc>
          <Axes residual={residual} locale={locale} />

          {kind === "baseline-residuals" && run.training.map((point) => (
            <line
              className={styles.residualSegment}
              x1={xScale(point.x)}
              x2={xScale(point.x)}
              y1={yScale(run.basePrediction, false)}
              y2={yScale(point.y, false)}
              key={`residual-${point.id}`}
            />
          ))}

          {kind === "standalone-tree" && (
            <path className={styles.modelLine} d={stepPath(standaloneTree, false)} />
          )}
          {kind === "baseline-residuals" && (
            <line
              className={styles.modelLine}
              x1={CHART.left}
              x2={CHART.width - CHART.right}
              y1={yScale(run.basePrediction, false)}
              y2={yScale(run.basePrediction, false)}
            />
          )}
          {kind === "residual-tree" && (
            <path className={styles.correctionLine} d={stepPath(firstStage.tree, true)} />
          )}
          {kind === "first-update" && (
            <>
              <line
                className={styles.previousLine}
                x1={CHART.left}
                x2={CHART.width - CHART.right}
                y1={yScale(run.basePrediction, false)}
                y2={yScale(run.basePrediction, false)}
              />
              <path
                className={styles.modelLine}
                d={stepPath(firstStage.tree, false, run.basePrediction)}
              />
            </>
          )}

          <Points points={run.training} values={values} residual={residual} />

          {kind === "standalone-tree" && (
            <text className={styles.directLabel} x={xScale(1.82)} y={yScale(0.72, false)}>{pt ? "uma árvore" : "one tree"}</text>
          )}
          {kind === "baseline-residuals" && (
            <text className={styles.directLabel} x={xScale(1.92)} y={yScale(run.basePrediction, false) - 9}>F₀ = {pt ? "média = 0,13" : "mean = 0.13"}</text>
          )}
          {kind === "residual-pattern" && (
            <text className={styles.directLabelMuted} x={xScale(1.95)} y={yScale(0, true) - 8}>{pt ? "resíduo zero" : "zero residual"}</text>
          )}
          {kind === "residual-tree" && (
            <text className={styles.directLabel} x={xScale(1.88)} y={yScale(0.33, true) - 9}>h₁(x)</text>
          )}
          {kind === "first-update" && (
            <>
              <text className={styles.directLabelMuted} x={xScale(2.17)} y={yScale(run.basePrediction, false) - 8}>F₀</text>
              <text className={styles.directLabel} x={xScale(2.16)} y={yScale(0.46, false) - 9}>F₁</text>
            </>
          )}
        </svg>
      </div>
      <figcaption>{content.caption}</figcaption>
    </figure>
  );
}

function RoundTwoResidualFigure({ content, locale }: { content: typeof CONTENT[GradientBoostingFigureKind]; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const id = useId();
  const run = useMemo(() => runGradientBoosting(1, 2), []);
  const first = run.stages[0];
  const width = 720;
  const height = 320;
  const panels = [
    { left: 42, right: 350, residual: false },
    { left: 410, right: 702, residual: true },
  ];
  const localX = (value: number, panel: typeof panels[number]) => panel.left
    + ((value - BOOSTING_EXPERIMENT.xMinimum) / (BOOSTING_EXPERIMENT.xMaximum - BOOSTING_EXPERIMENT.xMinimum))
    * (panel.right - panel.left);
  const localY = (value: number, residual: boolean) => {
    const minimum = residual ? BOOSTING_EXPERIMENT.residualMinimum : BOOSTING_EXPERIMENT.yMinimum;
    const maximum = residual ? BOOSTING_EXPERIMENT.residualMaximum : BOOSTING_EXPERIMENT.yMaximum;
    return 270 - ((value - minimum) / (maximum - minimum)) * 210;
  };
  const pathFor = (panel: typeof panels[number]) => {
    const segments = boostingTreeLeafSegments(first.tree);
    return segments.map((segment, index) => {
      const prediction = run.basePrediction + segment.prediction;
      return `${index === 0 ? "M" : "L"}${localX(segment.lower, panel).toFixed(2)},${localY(prediction, false).toFixed(2)}L${localX(segment.upper, panel).toFixed(2)},${localY(prediction, false).toFixed(2)}`;
    }).join("");
  };

  return (
    <figure className={styles.figure} data-gradient-boosting-figure="round-two-residuals">
      <div className={styles.figureFrame}>
        <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
          <title id={`${id}-title`}>{content.title}</title>
          <desc id={`${id}-description`}>{content.description}</desc>
          {panels.map((panel, panelIndex) => (
            <g key={panelIndex}>
              <text className={styles.panelHeadingSvg} x={panel.left} y="31">{panel.residual ? (pt ? "O que F₁ ainda não captura" : "What F₁ still misses") : (pt ? "Modelo atual F₁" : "Current model F₁")}</text>
              {[-1, 0, 1].map((tick) => (
                <g key={tick}>
                  <line className={tick === 0 && panel.residual ? styles.zeroLine : styles.gridline} x1={panel.left} x2={panel.right} y1={localY(tick, panel.residual)} y2={localY(tick, panel.residual)} />
                  <text className={styles.tick} x={panel.left - 7} y={localY(tick, panel.residual) + 4} textAnchor="end">{tick}</text>
                </g>
              ))}
              <line className={styles.axis} x1={panel.left} x2={panel.right} y1="270" y2="270" />
              {[-3, 0, 3].map((tick) => <text className={styles.tick} x={localX(tick, panel)} y="289" textAnchor="middle" key={tick}>{tick}</text>)}
              <text className={styles.axisLabel} x={(panel.left + panel.right) / 2} y="309" textAnchor="middle">input x</text>
            </g>
          ))}
          {run.training.map((point, index) => (
            <g key={point.id}>
              <line className={styles.residualSegment} x1={localX(point.x, panels[0])} x2={localX(point.x, panels[0])} y1={localY(first.trainingPredictions[index], false)} y2={localY(point.y, false)} />
              <circle className={styles.point} cx={localX(point.x, panels[0])} cy={localY(point.y, false)} r="2.65" />
              <circle className={styles.residualPoint} cx={localX(point.x, panels[1])} cy={localY(first.residualsAfter[index], true)} r="2.65" />
            </g>
          ))}
          <path className={styles.modelLine} d={pathFor(panels[0])} />
          <text className={styles.directLabel} x={localX(2.15, panels[0])} y={localY(first.trainingPredictions[first.trainingPredictions.length - 1], false) - 9}>F₁(x)</text>
          <text className={styles.directLabelMuted} x={localX(1.88, panels[1])} y={localY(0, true) - 8}>zero</text>
        </svg>
      </div>
      <figcaption>{content.caption}</figcaption>
    </figure>
  );
}

function CorrectionReversalFigure({ content, locale }: { content: typeof CONTENT[GradientBoostingFigureKind]; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const id = useId();
  const markerPrefix = id.replace(/:/g, "");
  const run = useMemo(() => runGradientBoosting(0.75, 2), []);
  const examples = [
    { id: "T12", label: pt ? "continua descendo" : "keeps moving down" },
    { id: "T21", label: pt ? "volta" : "turns back" },
    { id: "T26", label: pt ? "continua subindo" : "keeps moving up" },
  ].map((example) => {
    const point = run.training.find((candidate) => candidate.id === example.id);
    if (!point) throw new Error(`Missing boosting example ${example.id}`);
    return { ...example, point };
  });

  return (
    <figure className={styles.figure} data-gradient-boosting-figure="correction-reversal">
      <div className={styles.figureFrame}>
        <svg className={styles.chart} viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
          <title id={`${id}-title`}>{content.title}</title>
          <desc id={`${id}-description`}>{content.description}</desc>
          <defs>
            <marker id={`${markerPrefix}-first-arrow`} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
              <path className={styles.firstArrowHead} d="M0,0 L7,3.5 L0,7 Z" />
            </marker>
            <marker id={`${markerPrefix}-second-arrow`} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
              <path className={styles.secondArrowHead} d="M0,0 L7,3.5 L0,7 Z" />
            </marker>
          </defs>
          <Axes residual={false} locale={locale} />
          <line className={styles.previousLine} x1={CHART.left} x2={CHART.width - CHART.right} y1={yScale(run.basePrediction, false)} y2={yScale(run.basePrediction, false)} />
          {examples.map(({ id: exampleId, label, point }) => {
            const afterFirst = predictBoostingRun(run, point.x, 1);
            const afterSecond = predictBoostingRun(run, point.x, 2);
            const reverses = Math.sign(afterFirst - run.basePrediction) !== Math.sign(afterSecond - afterFirst);
            return (
              <g key={exampleId}>
                <line className={styles.firstContribution} markerEnd={`url(#${markerPrefix}-first-arrow)`} x1={xScale(point.x)} x2={xScale(point.x)} y1={yScale(run.basePrediction, false)} y2={yScale(afterFirst, false)} />
                <line className={styles.secondContribution} markerEnd={`url(#${markerPrefix}-second-arrow)`} x1={xScale(point.x)} x2={xScale(point.x)} y1={yScale(afterFirst, false)} y2={yScale(afterSecond, false)} />
                <circle className={styles.contributionJoint} cx={xScale(point.x)} cy={yScale(afterFirst, false)} r="4" />
                <circle className={styles.contributionEnd} cx={xScale(point.x)} cy={yScale(afterSecond, false)} r="4" />
                <circle className={styles.point} cx={xScale(point.x)} cy={yScale(point.y, false)} r="4.5" />
                <text
                  className={reverses ? styles.reversalLabel : styles.probeLabel}
                  x={xScale(point.x)}
                  y={yScale(Math.max(run.basePrediction, afterFirst, afterSecond, point.y), false) - 12}
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}
          <text className={styles.directLabelMuted} x={xScale(2.47)} y={yScale(run.basePrediction, false) - 8}>F₀</text>
          <g transform="translate(61 27)">
            <line className={styles.firstContribution} x1="0" x2="24" y1="0" y2="0" />
            <text className={styles.legendText} x="32" y="4">{pt ? "primeira correção" : "first correction"}</text>
            <line className={styles.secondContribution} x1="134" x2="158" y1="0" y2="0" />
            <text className={styles.legendText} x="166" y="4">{pt ? "segunda correção" : "second correction"}</text>
            <circle className={styles.point} cx="290" cy="0" r="4" />
            <text className={styles.legendText} x="301" y="4">{pt ? "target observado" : "observed target"}</text>
          </g>
          <text className={styles.axisHint} x={CHART.width - CHART.right} y="31" textAnchor="end">η 0.75</text>
        </svg>
      </div>
      <figcaption>{content.caption}</figcaption>
    </figure>
  );
}
