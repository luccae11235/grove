import { useId, useMemo, useState } from "react";
import styles from "./GradientBoosting.module.css";
import { formatBoostingNumber, isPt, treeWord, type GradientBoostingLocale } from "./locale";
import {
  BOOSTING_COMPLEX_EXPERIMENT,
  predictBoostingRun,
  runComplexGradientBoosting,
  type BoostingRun,
  type BoostingTree,
} from "./experiment";

const CHART = { width: 470, height: 270, left: 42, right: 14, top: 22, bottom: 226 };

function xScale(value: number): number {
  return CHART.left
    + ((value - BOOSTING_COMPLEX_EXPERIMENT.xMinimum)
      / (BOOSTING_COMPLEX_EXPERIMENT.xMaximum - BOOSTING_COMPLEX_EXPERIMENT.xMinimum))
    * (CHART.width - CHART.left - CHART.right);
}

function yScale(value: number, residual = false): number {
  const minimum = residual ? -1.5 : BOOSTING_COMPLEX_EXPERIMENT.yMinimum;
  const maximum = residual ? 1.5 : BOOSTING_COMPLEX_EXPERIMENT.yMaximum;
  return CHART.bottom - ((value - minimum) / (maximum - minimum)) * (CHART.bottom - CHART.top);
}

function thresholds(tree: BoostingTree): number[] {
  if (tree.kind === "leaf") return [];
  return [tree.threshold, ...thresholds(tree.left), ...thresholds(tree.right)];
}

function modelPath(run: BoostingRun, treeCount: number): string {
  const boundaries = [
    BOOSTING_COMPLEX_EXPERIMENT.xMinimum,
    ...run.stages.slice(0, treeCount).flatMap((stage) => thresholds(stage.tree)),
    BOOSTING_COMPLEX_EXPERIMENT.xMaximum,
  ].sort((left, right) => left - right).filter((value, index, values) => (
    index === 0 || Math.abs(value - values[index - 1]) > 1e-9
  ));
  return boundaries.slice(0, -1).map((lower, index) => {
    const upper = boundaries[index + 1];
    const prediction = predictBoostingRun(run, (lower + upper) / 2, treeCount);
    return `${index === 0 ? "M" : "L"}${xScale(lower).toFixed(2)},${yScale(prediction).toFixed(2)}L${xScale(upper).toFixed(2)},${yScale(prediction).toFixed(2)}`;
  }).join("");
}

function Axes({ residual = false }: { residual?: boolean }) {
  return (
    <>
      {[-1, 0, 1].map((tick) => (
        <g key={tick}>
          <line className={tick === 0 && residual ? styles.zeroLine : styles.gridline} x1={CHART.left} x2={CHART.width - CHART.right} y1={yScale(tick, residual)} y2={yScale(tick, residual)} />
          <text className={styles.tick} x={CHART.left - 7} y={yScale(tick, residual) + 4} textAnchor="end">{tick}</text>
        </g>
      ))}
      <line className={styles.axis} x1={CHART.left} x2={CHART.width - CHART.right} y1={CHART.bottom} y2={CHART.bottom} />
      {[-3, 0, 3].map((tick) => <text className={styles.tick} x={xScale(tick)} y={CHART.bottom + 19} textAnchor="middle" key={tick}>{tick}</text>)}
      <text className={styles.axisLabel} x={(CHART.left + CHART.width - CHART.right) / 2} y={CHART.height - 7} textAnchor="middle">input x</text>
    </>
  );
}

function ComplexPredictionChart({ run, treeCount, locale }: { run: BoostingRun; treeCount: number; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const stage = run.stages[treeCount - 1];
  const previousCount = treeCount === 1 ? 0 : Math.max(1, treeCount - Math.max(1, Math.round(treeCount * 0.15)));
  const previousPath = previousCount === 0
    ? `M${xScale(-3)},${yScale(run.basePrediction)}L${xScale(3)},${yScale(run.basePrediction)}`
    : modelPath(run, previousCount);
  return (
    <svg className={styles.chart} viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label={pt ? `Sinal de treino em camadas e predição do ensemble após ${treeCount} ${treeWord(treeCount, locale)}. RMSE de treino ${formatBoostingNumber(stage.trainingRmse, 3, locale)}.` : `Layered training signal and ensemble prediction after ${treeCount} trees. Training RMSE ${formatBoostingNumber(stage.trainingRmse, 3)}.`}>
      <title>{pt ? "Muitas árvores rasas aproximam o sinal em camadas" : "Many shallow trees approximate the layered signal"}</title>
      <desc>{pt ? "Setenta e duas observações de treino contêm curvas amplas, uma ondulação fina, duas características localizadas, duas mudanças de nível e ruído. A linha tracejada é um ensemble anterior, e a linha verde é o orçamento de árvores selecionado." : "Seventy-two training observations contain broad curves, a fine ripple, two localized features, two level changes, and noise. The dashed line is an earlier ensemble and the green line is the selected tree budget."}</desc>
      <Axes />
      <path className={styles.previousLine} d={previousPath} />
      <path className={styles.modelLine} d={modelPath(run, treeCount)} />
      {run.training.map((point) => <circle className={styles.point} cx={xScale(point.x)} cy={yScale(point.y)} r="2.25" key={point.id} />)}
      <text className={styles.directLabel} x={xScale(2.18)} y={yScale(predictBoostingRun(run, 2.18, treeCount)) - 8}>F{treeCount}(x)</text>
    </svg>
  );
}

function ComplexResidualChart({ run, treeCount, locale }: { run: BoostingRun; treeCount: number; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const stage = run.stages[treeCount - 1];
  const residuals = run.validation.map((point, index) => point.y - stage.validationPredictions[index]);
  return (
    <svg className={styles.chart} viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label={pt ? `Resíduos de validação após ${treeCount} ${treeWord(treeCount, locale)}. RMSE de validação ${formatBoostingNumber(stage.validationRmse, 3, locale)}.` : `Held-out residuals after ${treeCount} trees. Held-out RMSE ${formatBoostingNumber(stage.validationRmse, 3)}.`}>
      <title>{pt ? "Resíduos de validação com o orçamento de árvores selecionado" : "Held-out residuals at the selected tree budget"}</title>
      <desc>{pt ? "Cento e vinte observações de validação mantêm sua coordenada de input e se movem para o erro com sinal que ainda resta. Círculos vazados em âmbar as distinguem dos pontos de treino." : "One hundred and twenty held-out observations keep their input coordinate and move to their remaining signed error. Open amber circles distinguish them from the training points."}</desc>
      <Axes residual />
      {run.validation.map((point, index) => <circle className={styles.residualPoint} cx={xScale(point.x)} cy={yScale(residuals[index], true)} r="2.05" key={point.id} />)}
      <text className={styles.directLabelMuted} x={xScale(2.15)} y={yScale(0, true) - 8}>zero</text>
    </svg>
  );
}

function MiniTree({ muted = false }: { muted?: boolean }) {
  return (
    <svg className={muted ? styles.treeGlyph : styles.treeGlyphActive} viewBox="0 0 36 30" aria-hidden="true">
      <path d="M18 4V12M18 12L8 23M18 12L28 23" />
      <circle cx="18" cy="4" r="3" /><circle cx="8" cy="23" r="3" /><circle cx="28" cy="23" r="3" />
    </svg>
  );
}

function EnsembleScaleStrip({ treeCount, basePrediction, locale }: { treeCount: number; basePrediction: number; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const visible = Array.from({ length: Math.min(3, treeCount) }, (_, index) => index + 1);
  return (
    <div className={styles.complexityStrip} aria-label={pt ? `Baseline ${formatBoostingNumber(basePrediction, 2, locale)} mais ${treeCount} correções de árvores rasas produz F ${treeCount}` : `Baseline ${formatBoostingNumber(basePrediction)} plus ${treeCount} shallow tree corrections produces F ${treeCount}`}>
      <div className={styles.baseTerm}><span>baseline</span><strong>{formatBoostingNumber(basePrediction, 2, locale)}</strong></div>
      {visible.map((index) => <div className={styles.compactTreeTerm} key={index}><b>+</b><span><MiniTree muted={index < visible.length} />h{index}</span></div>)}
      {treeCount > 3 && <div className={styles.ellipsisTerm} aria-hidden="true">+ ··· +</div>}
      {treeCount > 3 && <div className={styles.compactTreeTerm}><span><MiniTree />h{treeCount}</span></div>}
      <div className={styles.totalTerm}><b>=</b><span>ensemble</span><strong>F{treeCount}</strong></div>
      <p>{treeCount} {pt ? "correções de profundidade dois" : "depth-two corrections"}</p>
    </div>
  );
}

export function GradientBoostingComplexityPlayground({ locale = "en" }: { locale?: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const id = useId();
  const [treeCount, setTreeCount] = useState(50);
  const [learningRate, setLearningRate] = useState(0.1);
  const run = useMemo(() => runComplexGradientBoosting(learningRate, 200), [learningRate]);
  const stage = run.stages[treeCount - 1];

  return (
    <section className={styles.playground} aria-labelledby={`${id}-title`} data-gradient-boosting-playground="complexity">
      <div className={styles.playgroundHeader}>
        <strong id={`${id}-title`}>{pt ? "Construa detalhes com muitas árvores rasas" : "Build detail from many shallow trees"}</strong>
        <span>{treeCount} {treeWord(treeCount, locale)} · η {formatBoostingNumber(learningRate, 2, locale)} · {pt ? "treino" : "train"} {formatBoostingNumber(stage.trainingRmse, 3, locale)} · {pt ? "validação" : "held-out"} {formatBoostingNumber(stage.validationRmse, 3, locale)}</span>
      </div>
      <div className={styles.complexityIntro}>
        <strong>{pt ? "Sinal em camadas" : "Layered signal"}</strong>
        <span>{pt ? "tendência · ondas amplas · ondulação fina · elevação e queda locais · mudanças de nível" : "drift · broad waves · fine ripple · local rise and dip · level changes"}</span>
      </div>
      <div className={styles.processGrid}>
        <section className={styles.predictionPanel}><div className={styles.panelTitle}><strong>{pt ? "Predição composta" : "Composed prediction"}</strong><span>{pt ? "pontos de treino" : "training points"}</span></div><ComplexPredictionChart run={run} treeCount={treeCount} locale={locale} /></section>
        <section className={styles.residualPanel}><div className={styles.panelTitle}><strong>{pt ? "O que resta" : "What remains"}</strong><span>{pt ? "pontos de validação" : "held-out points"}</span></div><ComplexResidualChart run={run} treeCount={treeCount} locale={locale} /></section>
      </div>
      <EnsembleScaleStrip treeCount={treeCount} basePrediction={run.basePrediction} locale={locale} />
      <div className={styles.controlArea}>
        <p className={styles.guidance}>{pt ? "Faça uma previsão antes de mover o orçamento: qual estrutura aparece primeiro — a forma ampla ou os detalhes locais estreitos?" : "Predict before moving the budget: which structure appears first—the broad shape or the narrow local details?"}</p>
        <label className={styles.sliderLabel} htmlFor={`${id}-trees`}>
          <span>{pt ? "Orçamento de árvores" : "Tree budget"}</span><strong>{treeCount}</strong>
          <input id={`${id}-trees`} type="range" min="1" max="200" step="1" value={treeCount} onInput={(event) => setTreeCount(Number(event.currentTarget.value))} onChange={(event) => setTreeCount(Number(event.currentTarget.value))} />
        </label>
        <div className={styles.complexityTicks} aria-hidden="true">
          <span style={{ left: "0%" }}>1</span>
          <span style={{ left: "9.55%" }}>20</span>
          <span style={{ left: "24.62%" }}>50</span>
          <span style={{ left: "49.75%" }}>100</span>
          <span style={{ left: "100%" }}>200 {pt ? "árvores" : "trees"}</span>
        </div>
        <label className={styles.sliderLabel} htmlFor={`${id}-rate`}>
          <span>Learning rate η</span><strong>{formatBoostingNumber(learningRate, 2, locale)}</strong>
          <input id={`${id}-rate`} type="range" min="0.05" max="0.3" step="0.05" value={learningRate} onInput={(event) => setLearningRate(Number(event.currentTarget.value))} onChange={(event) => setLearningRate(Number(event.currentTarget.value))} />
        </label>
        <div className={styles.sliderTicks} aria-hidden="true"><span>{pt ? "0,05 · paciente" : "0.05 · patient"}</span><span>{pt ? "0,10 · moderada" : "0.10 · measured"}</span><span>{pt ? "0,30 · agressiva" : "0.30 · aggressive"}</span></div>
      </div>
      <p className={styles.srOnly} aria-live="polite">{pt ? `${treeCount} ${treeWord(treeCount, locale)} com learning rate ${formatBoostingNumber(learningRate, 2, locale)}. Raiz do erro quadrático médio de treino ${formatBoostingNumber(stage.trainingRmse, 3, locale)}. Raiz do erro quadrático médio de validação ${formatBoostingNumber(stage.validationRmse, 3, locale)}.` : `${treeCount} trees at learning rate ${formatBoostingNumber(learningRate)}. Training root mean squared error ${formatBoostingNumber(stage.trainingRmse, 3)}. Held-out root mean squared error ${formatBoostingNumber(stage.validationRmse, 3)}.`}</p>
    </section>
  );
}
