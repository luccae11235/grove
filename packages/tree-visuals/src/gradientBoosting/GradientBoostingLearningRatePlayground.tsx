import { useId, useMemo, useState } from "react";
import styles from "./GradientBoosting.module.css";
import { formatBoostingNumber, isPt, type GradientBoostingLocale } from "./locale";
import {
  BOOSTING_EXPERIMENT,
  predictBoostingRun,
  runGradientBoosting,
  type BoostingRun,
  type BoostingTree,
} from "./experiment";

const PREDICTION_CHART = {
  width: 500,
  height: 270,
  left: 43,
  right: 14,
  top: 20,
  bottom: 226,
};

const HISTOGRAM_CHART = {
  width: 250,
  height: 270,
  left: 34,
  right: 16,
  top: 20,
  bottom: 226,
};

const HISTOGRAM_MINIMUM = -0.9;
const HISTOGRAM_MAXIMUM = 0.9;
const HISTOGRAM_BIN_COUNT = 9;

function predictionX(value: number): number {
  return PREDICTION_CHART.left
    + ((value - BOOSTING_EXPERIMENT.xMinimum)
      / (BOOSTING_EXPERIMENT.xMaximum - BOOSTING_EXPERIMENT.xMinimum))
      * (PREDICTION_CHART.width - PREDICTION_CHART.right - PREDICTION_CHART.left);
}

function predictionY(value: number): number {
  return PREDICTION_CHART.bottom
    - ((value - BOOSTING_EXPERIMENT.yMinimum)
      / (BOOSTING_EXPERIMENT.yMaximum - BOOSTING_EXPERIMENT.yMinimum))
      * (PREDICTION_CHART.bottom - PREDICTION_CHART.top);
}

function thresholds(tree: BoostingTree): number[] {
  if (tree.kind === "leaf") return [];
  return [tree.threshold, ...thresholds(tree.left), ...thresholds(tree.right)];
}

function boostedStepPath(run: BoostingRun): string {
  const boundaries = [
    BOOSTING_EXPERIMENT.xMinimum,
    ...run.stages.flatMap((stage) => thresholds(stage.tree)),
    BOOSTING_EXPERIMENT.xMaximum,
  ].sort((left, right) => left - right).filter((value, index, values) =>
    index === 0 || Math.abs(value - values[index - 1]) > 1e-9);

  return boundaries.slice(0, -1).map((lower, index) => {
    const upper = boundaries[index + 1];
    const midpoint = (lower + upper) / 2;
    const prediction = predictBoostingRun(run, midpoint);
    const start = `${index === 0 ? "M" : "L"}${predictionX(lower).toFixed(2)},${predictionY(prediction).toFixed(2)}`;
    const end = `L${predictionX(upper).toFixed(2)},${predictionY(prediction).toFixed(2)}`;
    return `${start}${end}`;
  }).join("");
}

function PredictionChart({ run, locale }: { run: BoostingRun; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const stage = run.stages[run.stages.length - 1];
  const labelPrediction = predictBoostingRun(run, 2.05);
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${PREDICTION_CHART.width} ${PREDICTION_CHART.height}`}
      role="img"
      aria-label={pt
        ? `Observações do conjunto de validação e a primeira predição atualizada F um igual a F zero mais learning rate vezes h um. Learning rate ${formatBoostingNumber(run.learningRate, 2, locale)}. RMSE de validação ${formatBoostingNumber(stage.validationRmse, 3, locale)}.`
        : `Held-out observations and the first updated prediction F one equals F zero plus learning rate times h one. Learning rate ${formatBoostingNumber(run.learningRate)}. Held-out RMSE ${formatBoostingNumber(stage.validationRmse, 3)}.`}
    >
      <title>{pt ? "A primeira correção na learning rate selecionada" : "The first correction at the selected learning rate"}</title>
      <desc>{pt ? "Os círculos vazados são os targets de validação. A linha horizontal tracejada é o baseline fixo. A linha em degraus com quatro níveis é esse baseline mais a primeira árvore de resíduos fixa, escalada pela learning rate. Os segmentos finos em âmbar são os resíduos de validação resultantes." : "Open circles are held-out targets. The dashed horizontal line is the fixed baseline. The solid four-level step line is that baseline plus the fixed first residual tree scaled by the learning rate. Thin amber segments are the resulting held-out residuals."}</desc>
      {[-1, 0, 1].map((tick) => (
        <g key={tick}>
          <line className={styles.gridline} x1={PREDICTION_CHART.left} x2={PREDICTION_CHART.width - PREDICTION_CHART.right} y1={predictionY(tick)} y2={predictionY(tick)} />
          <text className={styles.tick} x={PREDICTION_CHART.left - 8} y={predictionY(tick) + 4} textAnchor="end">{tick}</text>
        </g>
      ))}
      {[-3, 0, 3].map((tick) => (
        <text className={styles.tick} x={predictionX(tick)} y={PREDICTION_CHART.bottom + 20} textAnchor="middle" key={tick}>{tick}</text>
      ))}
      <line className={styles.axis} x1={PREDICTION_CHART.left} x2={PREDICTION_CHART.width - PREDICTION_CHART.right} y1={PREDICTION_CHART.bottom} y2={PREDICTION_CHART.bottom} />
      <line
        className={styles.previousLine}
        x1={PREDICTION_CHART.left}
        x2={PREDICTION_CHART.width - PREDICTION_CHART.right}
        y1={predictionY(run.basePrediction)}
        y2={predictionY(run.basePrediction)}
      />
      {run.validation.map((point, index) => (
        <line
          className={styles.residualSegment}
          x1={predictionX(point.x)}
          x2={predictionX(point.x)}
          y1={predictionY(stage.validationPredictions[index])}
          y2={predictionY(point.y)}
          key={`error-${point.id}`}
        />
      ))}
      <path className={styles.modelLine} d={boostedStepPath(run)} />
      {run.validation.map((point) => (
        <circle className={styles.validationPoint} cx={predictionX(point.x)} cy={predictionY(point.y)} r="2.6" key={point.id} />
      ))}
      <text className={styles.axisLabel} x={(PREDICTION_CHART.left + PREDICTION_CHART.width - PREDICTION_CHART.right) / 2} y={PREDICTION_CHART.height - 10} textAnchor="middle">input x</text>
      <text className={styles.directLabelMuted} x={predictionX(2.48)} y={predictionY(run.basePrediction) - 8}>F₀</text>
      <text className={styles.directLabel} x={predictionX(2.08)} y={predictionY(labelPrediction) - 9}>F₁(x)</text>
    </svg>
  );
}

function residualBins(values: number[]) {
  const width = (HISTOGRAM_MAXIMUM - HISTOGRAM_MINIMUM) / HISTOGRAM_BIN_COUNT;
  const bins = Array.from({ length: HISTOGRAM_BIN_COUNT }, (_, index) => ({
    lower: HISTOGRAM_MINIMUM + index * width,
    upper: HISTOGRAM_MINIMUM + (index + 1) * width,
    count: 0,
  }));
  for (const value of values) {
    const index = Math.max(0, Math.min(
      HISTOGRAM_BIN_COUNT - 1,
      Math.floor((value - HISTOGRAM_MINIMUM) / width),
    ));
    bins[index].count += 1;
  }
  return bins;
}

function Histogram({ run, locale }: { run: BoostingRun; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const stage = run.stages[run.stages.length - 1];
  const residuals = run.validation.map((point, index) => point.y - stage.validationPredictions[index]);
  const bins = residualBins(residuals);
  const maximumCount = Math.max(...bins.map((bin) => bin.count));
  const x = (value: number) => HISTOGRAM_CHART.left
    + ((value - HISTOGRAM_MINIMUM) / (HISTOGRAM_MAXIMUM - HISTOGRAM_MINIMUM))
    * (HISTOGRAM_CHART.width - HISTOGRAM_CHART.left - HISTOGRAM_CHART.right);
  const y = (value: number) => HISTOGRAM_CHART.bottom
    - (value / maximumCount) * (HISTOGRAM_CHART.bottom - HISTOGRAM_CHART.top - 9);

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${HISTOGRAM_CHART.width} ${HISTOGRAM_CHART.height}`}
      role="img"
      aria-label={pt ? `Histograma de sessenta e quatro resíduos de validação. Raiz do erro quadrático médio ${formatBoostingNumber(stage.validationRmse, 3, locale)}.` : `Histogram of sixty-four held-out residuals. Root mean squared error ${formatBoostingNumber(stage.validationRmse, 3)}.`}
    >
      <title>{pt ? "Distribuição dos resíduos de validação" : "Distribution of held-out residuals"}</title>
      <desc>{pt ? "A escala horizontal fixa vai de menos zero vírgula nove a mais zero vírgula nove. Resíduos mais próximos de zero formam barras perto da linha central." : "The fixed horizontal scale runs from minus zero point nine to plus zero point nine. Residuals closer to zero form bars near the center line."}</desc>
      <line className={styles.axis} x1={HISTOGRAM_CHART.left} x2={HISTOGRAM_CHART.width - HISTOGRAM_CHART.right} y1={HISTOGRAM_CHART.bottom} y2={HISTOGRAM_CHART.bottom} />
      {bins.map((bin, index) => {
        const left = x(bin.lower) + 1;
        const right = x(bin.upper) - 1;
        const top = y(bin.count);
        return (
          <rect className={styles.histogramBar} x={left} y={top} width={Math.max(1, right - left)} height={HISTOGRAM_CHART.bottom - top} key={index} />
        );
      })}
      <line className={styles.histogramZero} x1={x(0)} x2={x(0)} y1={HISTOGRAM_CHART.top} y2={HISTOGRAM_CHART.bottom + 5} />
      {[-0.9, 0, 0.9].map((tick) => (
        <text className={styles.histogramLabel} x={x(tick)} y={HISTOGRAM_CHART.bottom + 20} textAnchor="middle" key={tick}>
          {tick === 0 ? "0" : formatBoostingNumber(tick, 1, locale)}
        </text>
      ))}
      <text className={styles.axisLabel} x={(HISTOGRAM_CHART.left + HISTOGRAM_CHART.width - HISTOGRAM_CHART.right) / 2} y={HISTOGRAM_CHART.height - 10} textAnchor="middle">{pt ? "resíduo de validação" : "held-out residual"}</text>
    </svg>
  );
}

export function GradientBoostingLearningRatePlayground({ locale = "en" }: { locale?: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const rangeId = useId();
  const [learningRate, setLearningRate] = useState<number>(1);
  const run = useMemo(() => runGradientBoosting(learningRate, 1), [learningRate]);
  const stage = run.stages[run.stages.length - 1];

  return (
    <section className={styles.playground} aria-label={pt ? "Explore como a learning rate escala a primeira correção do gradient boosting" : "Explore how the learning rate scales the first gradient boosting correction"}>
      <div className={styles.playgroundHeader}>
        <strong>{pt ? "Escale a primeira correção" : "Scale the first correction"}</strong>
        <span>F₁(x) = F₀ + ηh₁(x) · η {formatBoostingNumber(learningRate, 2, locale)}</span>
      </div>
      <div className={styles.comparisonGrid}>
        <section className={styles.predictionPanel} aria-labelledby={`${rangeId}-prediction-title`}>
          <div className={styles.panelTitle}>
            <strong id={`${rangeId}-prediction-title`}>{pt ? "Baseline mais uma árvore" : "Baseline plus one tree"}</strong>
            <span>RMSE {formatBoostingNumber(stage.validationRmse, 3, locale)}</span>
          </div>
          <PredictionChart run={run} locale={locale} />
        </section>
        <section className={styles.histogramPanel} aria-labelledby={`${rangeId}-histogram-title`}>
          <div className={styles.panelTitle}>
            <strong id={`${rangeId}-histogram-title`}>{pt ? "Erros de validação" : "Held-out errors"}</strong>
          </div>
          <Histogram run={run} locale={locale} />
        </section>
      </div>
      <div className={styles.controlArea}>
        <p className={styles.guidance}>{pt ? "O baseline e a árvore permanecem fixos. η muda apenas a altura das quatro correções regionais da árvore." : "The baseline and tree stay fixed. η changes only the height of the tree's four regional corrections."}</p>
        <label className={styles.sliderLabel} htmlFor={rangeId}>
          <span>Learning rate η</span>
          <strong>{formatBoostingNumber(learningRate, 2, locale)}</strong>
          <input
            id={rangeId}
            type="range"
            min="0.05"
            max="1.5"
            step="0.05"
            value={learningRate}
            aria-valuetext={pt ? `${formatBoostingNumber(learningRate, 2, locale)}; RMSE de validação ${formatBoostingNumber(stage.validationRmse, 3, locale)}` : `${formatBoostingNumber(learningRate)}; held-out RMSE ${formatBoostingNumber(stage.validationRmse, 3)}`}
            onInput={(event) => setLearningRate(Number(event.currentTarget.value))}
            onChange={(event) => setLearningRate(Number(event.currentTarget.value))}
          />
        </label>
        <div className={styles.sliderTicks} aria-hidden="true">
          <span>{pt ? "0,05 · correção pequena" : "0.05 · small correction"}</span>
          <span>{pt ? "1,00 · correção completa" : "1.00 · full correction"}</span>
          <span>{pt ? "1,50 · além da correção" : "1.50 · beyond the correction"}</span>
        </div>
      </div>
      <p className={styles.srOnly} aria-live="polite">
        {pt ? `Learning rate ${formatBoostingNumber(learningRate, 2, locale)}. Raiz do erro quadrático médio de validação ${formatBoostingNumber(stage.validationRmse, 3, locale)}.` : `Learning rate ${formatBoostingNumber(learningRate)}. Held-out root mean squared error ${formatBoostingNumber(stage.validationRmse, 3)}.`}
      </p>
    </section>
  );
}
