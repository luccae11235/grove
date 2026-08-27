import { useId, useMemo } from "react";
import styles from "./GradientBoosting.module.css";
import { formatBoostingNumber, isPt, type GradientBoostingLocale } from "./locale";
import {
  classificationFocusPoints,
  logit,
  predictClassificationProbability,
  runClassificationBoosting,
  sigmoid,
} from "./classificationExperiment";
import { predictBoostingTree } from "./experiment";

export type GradientBoostingClassificationFigureKind =
  | "classification-bridge"
  | "classification-links"
  | "classification-residuals"
  | "classification-update";

interface Props {
  kind: GradientBoostingClassificationFigureKind;
  locale?: GradientBoostingLocale;
}

function SpaceBridge({ locale }: { locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const id = useId();
  const run = useMemo(() => runClassificationBoosting(0.8, 2), []);
  const initialProbability = formatBoostingNumber(run.baseProbability, 2, locale);
  const finalProbability = formatBoostingNumber(predictClassificationProbability(run, 1, 2), 2, locale);
  return (
    <figure className={styles.figure} data-gradient-boosting-figure="classification-bridge">
      <div className={styles.figureFrame}>
        <svg className={`${styles.chart} ${styles.bridgeDesktop}`} viewBox="0 0 760 350" role="img" aria-labelledby={`${id}-title ${id}-description`}>
          <title id={`${id}-title`}>{pt ? "A regressão prediz diretamente, enquanto a classificação faz boosting no espaço logit" : "Regression predicts directly, while classification boosts through logit space"}</title>
          <desc id={`${id}-description`}>{pt ? "A regressão adiciona duas correções de árvores diretamente em uma reta numérica de predições reais. A classificação binária começa no espaço de probabilidade, em que os targets são zero ou um e as predições ficam entre eles. Logit mapeia a predição para uma reta numérica sem restrições, duas correções de árvores são adicionadas ali, e sigmoid mapeia o resultado de volta para uma probabilidade." : "Regression adds two tree corrections directly on a real-valued prediction number line. Binary classification starts in probability space, where targets are zero or one and predictions lie between them. Logit maps the prediction to an unconstrained number line, two tree corrections are added there, and sigmoid maps the result back to a probability."}</desc>

          <text className={styles.bridgeHeading} x="40" y="37">{pt ? "Regressão" : "Regression"}</text>
          <text className={styles.bridgeNote} x="40" y="61">{pt ? "adicione diretamente no espaço de predição" : "add directly in prediction space"}</text>
          <text className={styles.bridgeLabel} x="244" y="45">{pt ? "predição com valor real" : "real-valued prediction"}</text>
          <line className={styles.bridgeLine} x1="244" x2="710" y1="82" y2="82" />
          <path className={styles.bridgeTick} d="M244 75V89M710 75V89" />
          <text className={styles.bridgeEndpoint} x="244" y="106" textAnchor="middle">−∞</text>
          <text className={styles.bridgeEndpoint} x="710" y="106" textAnchor="middle">+∞</text>
          <circle className={styles.bridgeState} cx="365" cy="82" r="4" />
          <text className={styles.bridgeStateLabel} x="365" y="68" textAnchor="middle">F₀</text>
          <path className={styles.firstBridgeCorrection} d="M373 82H451M443 76L451 82L443 88" />
          <text className={styles.bridgeCorrectionLabel} x="412" y="68" textAnchor="middle">+ ηh₁</text>
          <path className={styles.secondBridgeCorrection} d="M459 82H537M529 76L537 82L529 88" />
          <text className={styles.bridgeCorrectionLabelActive} x="498" y="68" textAnchor="middle">+ ηh₂</text>
          <circle className={styles.bridgeStateActive} cx="545" cy="82" r="4.5" />
          <text className={styles.bridgeStateLabelActive} x="545" y="106" textAnchor="middle">F₂</text>

          <line className={styles.bridgeDivider} x1="28" x2="732" y1="137" y2="137" />
          <text className={styles.bridgeHeading} x="40" y="175">{pt ? "Classificação binária" : "Binary classification"}</text>
          <text className={styles.bridgeNote} x="40" y="199">{pt ? "saia do espaço de probabilidade apenas ao ajustar correções" : "leave probability space only while fitting corrections"}</text>

          <text className={styles.bridgeLabel} x="128" y="231" textAnchor="middle">{pt ? "espaço de probabilidade" : "probability space"}</text>
          <line className={styles.bridgeLineShort} x1="58" x2="198" y1="264" y2="264" />
          <path className={styles.bridgeTick} d="M58 257V271M198 257V271" />
          <text className={styles.bridgeEndpoint} x="58" y="288" textAnchor="middle">0</text>
          <text className={styles.bridgeEndpoint} x="198" y="288" textAnchor="middle">1</text>
          <circle className={styles.bridgeProbability} cx="114" cy="264" r="5" />
          <text className={styles.bridgeProbabilityLabel} x="114" y="247" textAnchor="middle">p₀ {initialProbability}</text>

          <path className={styles.transformArrow} d="M215 264H282" />
          <path className={styles.bridgeArrow} d="M274 258L282 264L274 270" />
          <text className={styles.transformLabelActive} x="249" y="247" textAnchor="middle">logit</text>

          <text className={styles.bridgeLabel} x="410" y="231" textAnchor="middle">{pt ? "espaço logit" : "logit space"}</text>
          <line className={styles.bridgeLine} x1="302" x2="518" y1="264" y2="264" />
          <path className={styles.bridgeTick} d="M302 257V271M518 257V271" />
          <text className={styles.bridgeEndpoint} x="302" y="288" textAnchor="middle">−∞</text>
          <text className={styles.bridgeEndpoint} x="518" y="288" textAnchor="middle">+∞</text>
          <circle className={styles.bridgeState} cx="337" cy="264" r="4" />
          <text className={styles.bridgeStateLabel} x="337" y="247" textAnchor="middle">F₀</text>
          <path className={styles.firstBridgeCorrection} d="M345 264H404M396 258L404 264L396 270" />
          <text className={styles.bridgeCorrectionLabel} x="374" y="247" textAnchor="middle">+ ηh₁</text>
          <path className={styles.secondBridgeCorrection} d="M412 264H471M463 258L471 264L463 270" />
          <text className={styles.bridgeCorrectionLabelActive} x="441" y="247" textAnchor="middle">+ ηh₂</text>
          <circle className={styles.bridgeStateActive} cx="479" cy="264" r="4.5" />
          <text className={styles.bridgeStateLabelActive} x="479" y="288" textAnchor="middle">F₂</text>

          <path className={styles.transformArrow} d="M535 264H582" />
          <path className={styles.bridgeArrow} d="M574 258L582 264L574 270" />
          <text className={styles.transformLabelActive} x="558" y="247" textAnchor="middle">sigmoid</text>

          <text className={styles.bridgeLabel} x="660" y="231" textAnchor="middle">{pt ? "espaço de probabilidade" : "probability space"}</text>
          <line className={styles.bridgeLineShort} x1="590" x2="730" y1="264" y2="264" />
          <path className={styles.bridgeTick} d="M590 257V271M730 257V271" />
          <text className={styles.bridgeEndpoint} x="590" y="288" textAnchor="middle">0</text>
          <text className={styles.bridgeEndpoint} x="730" y="288" textAnchor="middle">1</text>
          <circle className={styles.bridgeProbability} cx="664" cy="264" r="5" />
          <text className={styles.bridgeProbabilityLabel} x="664" y="247" textAnchor="middle">p₂ {finalProbability}</text>
          <text className={styles.bridgeNote} x="380" y="327" textAnchor="middle">{pt ? "targets ficam em 0 ou 1 · predições retornam ao intervalo entre eles" : "targets stay at 0 or 1 · predictions return between them"}</text>
        </svg>
        <svg className={`${styles.chart} ${styles.bridgeMobile}`} viewBox="0 0 360 610" role="img" aria-labelledby={`${id}-mobile-title ${id}-mobile-description`}>
          <title id={`${id}-mobile-title`}>{pt ? "A regressão prediz diretamente, enquanto a classificação faz boosting no espaço logit" : "Regression predicts directly, while classification boosts through logit space"}</title>
          <desc id={`${id}-mobile-description`}>{pt ? "A regressão adiciona duas correções de árvores diretamente em uma reta numérica de predições reais. A classificação binária começa no espaço de probabilidade, usa logit para entrar em uma reta numérica sem restrições, adiciona duas correções de árvores e usa sigmoid para retornar ao espaço de probabilidade, onde os targets são zero ou um." : "Regression adds two tree corrections directly on a real-valued prediction number line. Binary classification starts in probability space, uses logit to enter an unconstrained number line, adds two tree corrections, and uses sigmoid to return to probability space where targets are zero or one."}</desc>
          <text className={styles.bridgeHeading} x="24" y="36">{pt ? "Regressão" : "Regression"}</text>
          <text className={styles.bridgeNote} x="24" y="60">{pt ? "adicione diretamente no espaço de predição" : "add directly in prediction space"}</text>
          <line className={styles.bridgeLine} x1="44" x2="316" y1="99" y2="99" />
          <path className={styles.bridgeTick} d="M44 92V106M316 92V106" />
          <text className={styles.bridgeEndpoint} x="44" y="124" textAnchor="middle">−∞</text>
          <text className={styles.bridgeEndpoint} x="316" y="124" textAnchor="middle">+∞</text>
          <circle className={styles.bridgeState} cx="92" cy="99" r="4" /><text className={styles.bridgeStateLabel} x="92" y="84" textAnchor="middle">F₀</text>
          <path className={styles.firstBridgeCorrection} d="M100 99H174M166 93L174 99L166 105" /><text className={styles.bridgeCorrectionLabel} x="137" y="84" textAnchor="middle">+ ηh₁</text>
          <path className={styles.secondBridgeCorrection} d="M182 99H256M248 93L256 99L248 105" /><text className={styles.bridgeCorrectionLabelActive} x="219" y="84" textAnchor="middle">+ ηh₂</text>
          <circle className={styles.bridgeStateActive} cx="264" cy="99" r="4.5" /><text className={styles.bridgeStateLabelActive} x="264" y="124" textAnchor="middle">F₂</text>
          <line className={styles.bridgeDivider} x1="20" x2="340" y1="157" y2="157" />

          <text className={styles.bridgeHeading} x="24" y="196">{pt ? "Classificação binária" : "Binary classification"}</text>
          <text className={styles.bridgeNote} x="24" y="220">{pt ? "mude de espaço só para ajustar correções" : "move spaces only while fitting corrections"}</text>
          <text className={styles.bridgeLabel} x="180" y="256" textAnchor="middle">{pt ? "espaço de probabilidade" : "probability space"}</text>
          <line className={styles.bridgeLineShort} x1="60" x2="300" y1="286" y2="286" />
          <path className={styles.bridgeTick} d="M60 279V293M300 279V293" />
          <text className={styles.bridgeEndpoint} x="60" y="310" textAnchor="middle">0</text><text className={styles.bridgeEndpoint} x="300" y="310" textAnchor="middle">1</text>
          <circle className={styles.bridgeProbability} cx="156" cy="286" r="5" /><text className={styles.bridgeProbabilityLabel} x="156" y="270" textAnchor="middle">p₀ {initialProbability}</text>

          <path className={styles.transformArrow} d="M180 326V356" /><path className={styles.bridgeArrow} d="M174 348L180 356L186 348" /><text className={styles.transformLabelActive} x="196" y="346">logit</text>
          <text className={styles.bridgeLabel} x="180" y="386" textAnchor="middle">{pt ? "espaço logit" : "logit space"}</text>
          <line className={styles.bridgeLine} x1="60" x2="300" y1="416" y2="416" />
          <path className={styles.bridgeTick} d="M60 409V423M300 409V423" />
          <text className={styles.bridgeEndpoint} x="60" y="440" textAnchor="middle">−∞</text><text className={styles.bridgeEndpoint} x="300" y="440" textAnchor="middle">+∞</text>
          <circle className={styles.bridgeState} cx="92" cy="416" r="4" /><text className={styles.bridgeStateLabel} x="92" y="401" textAnchor="middle">F₀</text>
          <path className={styles.firstBridgeCorrection} d="M100 416H174M166 410L174 416L166 422" /><text className={styles.bridgeCorrectionLabel} x="137" y="401" textAnchor="middle">+ ηh₁</text>
          <path className={styles.secondBridgeCorrection} d="M182 416H256M248 410L256 416L248 422" /><text className={styles.bridgeCorrectionLabelActive} x="219" y="401" textAnchor="middle">+ ηh₂</text>
          <circle className={styles.bridgeStateActive} cx="264" cy="416" r="4.5" /><text className={styles.bridgeStateLabelActive} x="264" y="440" textAnchor="middle">F₂</text>

          <path className={styles.transformArrow} d="M180 456V486" /><path className={styles.bridgeArrow} d="M174 478L180 486L186 478" /><text className={styles.transformLabelActive} x="196" y="476">sigmoid</text>
          <text className={styles.bridgeLabel} x="180" y="516" textAnchor="middle">{pt ? "espaço de probabilidade" : "probability space"}</text>
          <line className={styles.bridgeLineShort} x1="60" x2="300" y1="546" y2="546" />
          <path className={styles.bridgeTick} d="M60 539V553M300 539V553" />
          <text className={styles.bridgeEndpoint} x="60" y="570" textAnchor="middle">0</text><text className={styles.bridgeEndpoint} x="300" y="570" textAnchor="middle">1</text>
          <circle className={styles.bridgeProbability} cx="187" cy="546" r="5" /><text className={styles.bridgeProbabilityLabel} x="187" y="530" textAnchor="middle">p₂ {finalProbability}</text>
          <text className={styles.bridgeNote} x="180" y="595" textAnchor="middle">{pt ? "targets: 0 ou 1 · predições: entre eles" : "targets stay at 0 or 1 · predictions return between them"}</text>
        </svg>
      </div>
      <figcaption>{pt ? "A regressão adiciona na reta de predição. A classificação usa o espaço logit para as adições; depois, a sigmoid transforma o score de volta em probabilidade." : "Regression adds on the prediction line. Classification uses logit space for the additions, then sigmoid returns the score to a probability."}</figcaption>
    </figure>
  );
}

const LINK_CHART = { width: 350, height: 250, left: 42, right: 18, top: 28, bottom: 208 };

function linkX(value: number, minimum: number, maximum: number): number {
  return LINK_CHART.left + ((value - minimum) / (maximum - minimum)) * (LINK_CHART.width - LINK_CHART.left - LINK_CHART.right);
}

function linkY(value: number, minimum: number, maximum: number): number {
  return LINK_CHART.bottom - ((value - minimum) / (maximum - minimum)) * (LINK_CHART.bottom - LINK_CHART.top);
}

function functionPath(
  fn: (value: number) => number,
  domainMinimum: number,
  domainMaximum: number,
  xMinimum: number,
  xMaximum: number,
  yMinimum: number,
  yMaximum: number,
): string {
  return Array.from({ length: 121 }, (_, index) => {
    const value = domainMinimum + ((domainMaximum - domainMinimum) * index) / 120;
    return `${index === 0 ? "M" : "L"}${linkX(value, xMinimum, xMaximum).toFixed(2)},${linkY(fn(value), yMinimum, yMaximum).toFixed(2)}`;
  }).join("");
}

function LinkPanel({ kind, locale }: { kind: "sigmoid" | "logit"; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const sigmoidPanel = kind === "sigmoid";
  const xMinimum = sigmoidPanel ? -5 : -1;
  const xMaximum = sigmoidPanel ? 5 : 2;
  const yMinimum = sigmoidPanel ? 0 : -8;
  const yMaximum = sigmoidPanel ? 1 : 8;
  const domainMinimum = sigmoidPanel ? xMinimum : sigmoid(-8);
  const domainMaximum = sigmoidPanel ? xMaximum : sigmoid(8);
  const xTicks = sigmoidPanel ? [-4, 0, 4] : [-1, 0, 1, 2];
  const yTicks = sigmoidPanel ? [0, 0.5, 1] : [-8, -4, 0, 4, 8];
  const path = functionPath(sigmoidPanel ? sigmoid : logit, domainMinimum, domainMaximum, xMinimum, xMaximum, yMinimum, yMaximum);
  const run = useMemo(() => runClassificationBoosting(0.8, 0), []);
  const anchorX = linkX(sigmoidPanel ? run.baseLogit : run.baseProbability, xMinimum, xMaximum);
  const anchorY = linkY(sigmoidPanel ? run.baseProbability : run.baseLogit, yMinimum, yMaximum);
  return (
    <svg className={styles.chart} viewBox={`0 0 ${LINK_CHART.width} ${LINK_CHART.height}`} role="img" aria-label={sigmoidPanel ? (pt ? "A sigmoid mapeia qualquer logit para uma probabilidade entre zero e um." : "Sigmoid maps any logit to a probability from zero to one.") : (pt ? "O logit mapeia probabilidades entre zero e um para toda a reta real." : "Logit maps probabilities between zero and one to the complete real line.")}>
      {yTicks.map((tick) => <g key={tick}><line className={styles.gridline} x1={LINK_CHART.left} x2={LINK_CHART.width - LINK_CHART.right} y1={linkY(tick, yMinimum, yMaximum)} y2={linkY(tick, yMinimum, yMaximum)} /><text className={styles.tick} x={LINK_CHART.left - 8} y={linkY(tick, yMinimum, yMaximum) + 4} textAnchor="end">{tick}</text></g>)}
      <line className={styles.axis} x1={LINK_CHART.left} x2={LINK_CHART.width - LINK_CHART.right} y1={sigmoidPanel ? LINK_CHART.bottom : linkY(0, yMinimum, yMaximum)} y2={sigmoidPanel ? LINK_CHART.bottom : linkY(0, yMinimum, yMaximum)} />
      {!sigmoidPanel && <line className={styles.axis} x1={linkX(0, xMinimum, xMaximum)} x2={linkX(0, xMinimum, xMaximum)} y1={LINK_CHART.top} y2={LINK_CHART.bottom} />}
      {xTicks.map((tick) => <text className={styles.tick} x={linkX(tick, xMinimum, xMaximum)} y={LINK_CHART.bottom + 20} textAnchor="middle" key={tick}>{tick}</text>)}
      <path className={styles.modelLine} d={path} />
      <circle className={styles.linkAnchor} cx={anchorX} cy={anchorY} r="4.4" />
      <text className={styles.directLabel} x={anchorX + 9} y={anchorY - 10}>{sigmoidPanel ? (pt ? "z = −0,405 → p = 0,40" : "z = −0.405 → p = 0.40") : (pt ? "p = 0,40 → z = −0,405" : "p = 0.40 → z = −0.405")}</text>
      <text className={styles.axisLabel} x={(LINK_CHART.left + LINK_CHART.width - LINK_CHART.right) / 2} y={LINK_CHART.height - 8} textAnchor="middle">{sigmoidPanel ? "logit z" : pt ? "probabilidade p" : "probability p"}</text>
      <text className={styles.axisLabel} x="12" y={(LINK_CHART.top + LINK_CHART.bottom) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(LINK_CHART.top + LINK_CHART.bottom) / 2})`}>{sigmoidPanel ? (pt ? "probabilidade p" : "probability p") : "logit z"}</text>
      {!sigmoidPanel && <>
        <text className={styles.axisHint} x={linkX(0, xMinimum, xMaximum) + 6} y={LINK_CHART.bottom - 7}>−∞ {pt ? "quando" : "as"} p → 0</text>
        <text className={styles.axisHint} x={linkX(1, xMinimum, xMaximum) - 6} y={LINK_CHART.top + 12} textAnchor="end">+∞ {pt ? "quando" : "as"} p → 1</text>
      </>}
    </svg>
  );
}

function LinkFunctions({ locale }: { locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  return (
    <figure className={styles.figure} data-gradient-boosting-figure="classification-links">
      <div className={styles.figureFrame}>
        <div className={styles.linkGrid}>
          <section><h4>Sigmoid: logit → {pt ? "probabilidade" : "probability"}</h4><LinkPanel kind="sigmoid" locale={locale} /></section>
          <section><h4>Logit: {pt ? "probabilidade" : "probability"} → logit</h4><LinkPanel kind="logit" locale={locale} /></section>
        </div>
      </div>
      <figcaption>{pt ? "As funções desfazem uma à outra: trocar as coordenadas horizontal e vertical transforma um gráfico no outro. O baseline compartilhado aparece nas duas visualizações: a probabilidade 0,40 é o logit −0,405." : "The functions undo each other: swapping the horizontal and vertical coordinates turns one graph into the other. The shared baseline appears in both views: probability 0.40 is logit −0.405."}</figcaption>
    </figure>
  );
}

type TableStage = "residuals" | "update";

const TABLE_COPY: Record<TableStage, { title: string; caption: string }> = {
  residuals: {
    title: "The loss gives each observation a signed correction signal",
    caption: "At the baseline, class-1 rows ask for +0.60 and class-0 rows ask for −0.40 in the first-order gradient direction.",
  },
  update: {
    title: "One tree moves different input regions in different directions",
    caption: "The tree predicts the pseudo-residual pattern by region. Its scaled output is added to the logit, then sigmoid converts the result back to probability.",
  },
};

const TABLE_COPY_PT: typeof TABLE_COPY = {
  residuals: {
    title: "A loss fornece a cada observação um sinal de correção com sinal",
    caption: "No baseline, as linhas da classe 1 pedem +0,60, e as linhas da classe 0 pedem −0,40 na direção do gradiente de primeira ordem.",
  },
  update: {
    title: "Uma árvore move diferentes regiões do input em direções diferentes",
    caption: "A árvore prediz o padrão dos pseudo-resíduos por região. Sua saída escalada é adicionada ao logit; depois, a sigmoid converte o resultado de volta em probabilidade.",
  },
};

function ArithmeticTable({ stage, locale }: { stage: TableStage; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const run = useMemo(() => runClassificationBoosting(0.8, 1), []);
  const focus = classificationFocusPoints(run);
  const first = run.stages[0];
  const visible = stage === "residuals" ? 2 : 3;
  const copy = (pt ? TABLE_COPY_PT : TABLE_COPY)[stage];
  return (
    <figure className={styles.figure} data-gradient-boosting-figure={`classification-${stage}`}>
      <div className={styles.figureFrame}>
        <div className={styles.tableHeading}><strong>{copy.title}</strong><span>regional-classes-v1 · {pt ? "linhas destacadas" : "highlighted rows"}</span></div>
        <div className={styles.tableScroll} role="region" aria-label={`${copy.title}. ${pt ? "Role horizontalmente para inspecionar todas as colunas em uma tela estreita." : "Scroll horizontally to inspect all columns on a narrow screen."}`} tabIndex={0}>
          <table className={styles.classificationTable}>
            <caption className={styles.srOnly}>{copy.title}</caption>
            <thead><tr><th scope="col">{pt ? "linha" : "row"}</th><th scope="col">input x</th><th scope="col">{pt ? "classe y" : "class y"}</th>{visible >= 1 && <><th scope="col">baseline p₀</th><th scope="col">baseline F₀</th></>}{visible >= 2 && <th scope="col">{pt ? "sinal y − p₀" : "signal y − p₀"}</th>}{visible >= 3 && <><th scope="col">ηh₁(x)</th><th scope="col">{pt ? "novo F₁" : "new F₁"}</th><th scope="col">{pt ? "novo p₁" : "new p₁"}</th></>}</tr></thead>
            <tbody>{focus.map((point) => {
              const index = run.training.findIndex((candidate) => candidate.id === point.id);
              const contribution = run.learningRate * predictBoostingTree(first.tree, point.x);
              return <tr key={point.id}><th scope="row">{point.id}</th><td>{formatBoostingNumber(point.x, 2, locale)}</td><td><span className={point.y === 1 ? styles.classOneMark : styles.classZeroMark} aria-hidden="true" />{point.y}</td>{visible >= 1 && <><td>{formatBoostingNumber(run.baseProbability, 2, locale)}</td><td>{formatBoostingNumber(run.baseLogit, 3, locale)}</td></>}{visible >= 2 && <td className={first.pseudoResidualsBefore[index] > 0 ? styles.positiveValue : styles.negativeValue}>{formatBoostingNumber(first.pseudoResidualsBefore[index], 2, locale)}</td>}{visible >= 3 && <><td className={contribution > 0 ? styles.positiveValue : styles.negativeValue}>{formatBoostingNumber(contribution, 2, locale)}</td><td>{formatBoostingNumber(first.trainingLogits[index], 3, locale)}</td><td><strong>{formatBoostingNumber(first.trainingProbabilities[index], 2, locale)}</strong></td></>}</tr>;
            })}</tbody>
          </table>
        </div>
      </div>
      <figcaption>{copy.caption}</figcaption>
    </figure>
  );
}

export function GradientBoostingClassificationFigure({ kind, locale = "en" }: Props) {
  if (kind === "classification-bridge") return <SpaceBridge locale={locale} />;
  if (kind === "classification-links") return <LinkFunctions locale={locale} />;
  return <ArithmeticTable stage={kind.replace("classification-", "") as TableStage} locale={locale} />;
}
