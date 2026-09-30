import { useId, useState } from "react";
import styles from "./RegressionExtrapolationPlayground.module.css";

type Locale = "en" | "pt-BR";

// Fixed observations. The test independently repeats the depth-two SSE fit.
export const EXTRAPOLATION_POINTS = [
  { x: 1, y: 2 }, { x: 1.8, y: 2.7 }, { x: 2.6, y: 2.5 },
  { x: 3.4, y: 3.8 }, { x: 4.2, y: 3.6 }, { x: 5, y: 4.9 },
  { x: 5.8, y: 5.5 }, { x: 6.6, y: 5.2 }, { x: 7.4, y: 6.8 },
  { x: 8.2, y: 6.5 },
] as const;
export const EXTRAPOLATION_SPLITS = [3, 4.6, 7] as const;
export const EXTRAPOLATION_LEAF_MEANS = [2.4, 3.7, 5.2, 6.65] as const;

/** A fixed, depth-two CART regressor with mean-valued leaves. */
export function predictExtrapolationTree(x: number): number {
  if (x <= 4.6) return x <= 3 ? 2.4 : 3.7;
  return x <= 7 ? 5.2 : 6.65;
}

const CHART = { width: 640, height: 330, left: 54, right: 24, top: 38, bottom: 62 };
const X_MIN = 0;
const X_MAX = 10;
const Y_MAX = 8;
const chartRight = CHART.width - CHART.right;
const chartBottom = CHART.height - CHART.bottom;
const chartX = (x: number) => CHART.left + (x / X_MAX) * (chartRight - CHART.left);
const chartY = (y: number) => chartBottom - (y / Y_MAX) * (chartBottom - CHART.top);
const display = (value: number, pt: boolean) => pt ? String(value).replace(".", ",") : String(value);

export function RegressionExtrapolationPlayground({ locale = "en" }: { locale?: Locale }) {
  const pt = locale === "pt-BR";
  const titleId = useId();
  const descId = useId();
  const sliderId = useId();
  const [x, setX] = useState(9.5);
  const prediction = predictExtrapolationTree(x);
  const stepPath = [
    `M ${chartX(X_MIN)} ${chartY(2.4)}`,
    `H ${chartX(3)} V ${chartY(3.7)}`,
    `H ${chartX(4.6)} V ${chartY(5.2)}`,
    `H ${chartX(7)} V ${chartY(6.65)}`,
    `H ${chartX(X_MAX)}`,
  ].join(" ");

  return (
    <section className={styles.lab} data-extrapolation-lab data-input={x} data-prediction={prediction}>
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>{pt ? "UMA ÁRVORE, DEZ OBSERVAÇÕES" : "ONE TREE, TEN OBSERVATIONS"}</p>
          <h3>{pt ? "Deslize x e observe a previsão" : "Slide x and watch the prediction"}</h3>
        </div>
        <p className={styles.readout} aria-live="polite">
          <span>x = <strong data-input-value>{display(x, pt)}</strong></span>
          <span>{pt ? "previsão" : "prediction"} <output htmlFor={sliderId} data-prediction-value>{display(prediction, pt)}</output></span>
        </p>
      </div>

      <div className={styles.chartWrap}>
        <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
          <title id={titleId}>{pt ? "Dados observados e previsão em degraus da árvore" : "Observed data and the tree's step-shaped prediction"}</title>
          <desc id={descId}>{pt
            ? `Dez observações entre x igual a 1 e 8,2 mostram uma tendência geral de alta com pequenas variações. A árvore prevê 2,4 até x igual a 3; 3,7 até 4,6; 5,2 até 7; e 6,65 depois de 7. Para x igual a ${display(x, pt)}, prevê ${display(prediction, pt)}.`
            : `Ten observations from x equals 1 to 8.2 show an overall rising trend with small variations. The tree predicts 2.4 through x equals 3; 3.7 through 4.6; 5.2 through 7; and 6.65 after 7. For x equals ${x}, it predicts ${prediction}.`}</desc>

          <rect className={styles.observedBand} x={chartX(1)} y={CHART.top} width={chartX(8.2) - chartX(1)} height={chartBottom - CHART.top} />
          <text className={styles.bandLabel} x={(chartX(1) + chartX(8.2)) / 2} y={CHART.top + 17} textAnchor="middle">{pt ? "x observado: 1 a 8,2" : "observed x: 1 to 8.2"}</text>
          {[0, 2, 4, 6, 8].map((tick) => (
            <g key={`y-${tick}`}>
              <line className={styles.grid} x1={CHART.left} x2={chartRight} y1={chartY(tick)} y2={chartY(tick)} />
              <text className={styles.tick} x={CHART.left - 11} y={chartY(tick) + 4} textAnchor="end">{tick}</text>
            </g>
          ))}
          <line className={styles.axis} x1={CHART.left} x2={chartRight} y1={chartBottom} y2={chartBottom} />
          {[0, 1, 8.2, 10].map((tick) => (
            <text key={`x-${tick}`} className={styles.tick} x={chartX(tick)} y={chartBottom + 22} textAnchor="middle">{display(tick, pt)}</text>
          ))}
          <text className={styles.axisLabel} x={chartRight} y={CHART.height - 12} textAnchor="end">x</text>
          <text className={styles.axisLabel} x={CHART.left - 32} y={CHART.top - 8}>y</text>
          <path className={styles.step} d={stepPath} />
          {EXTRAPOLATION_POINTS.map((point) => (
            <circle className={styles.observation} key={point.x} cx={chartX(point.x)} cy={chartY(point.y)} r="5" />
          ))}
          <line className={styles.inputLine} x1={chartX(x)} x2={chartX(x)} y1={CHART.top + 23} y2={chartBottom} />
          <circle className={styles.predictionDot} cx={chartX(x)} cy={chartY(prediction)} r="7" />
        </svg>
        <div className={styles.sliderTrack}>
          <label className={styles.sliderLabel} htmlFor={sliderId}>Explore x</label>
          <input
            id={sliderId}
            className={styles.slider}
            type="range"
            min={X_MIN}
            max={X_MAX}
            step="0.1"
            value={x}
            onChange={(event) => setX(Number(event.currentTarget.value))}
            aria-valuetext={pt ? `x ${display(x, pt)}, previsão ${display(prediction, pt)}` : `x ${x}, prediction ${prediction}`}
          />
        </div>
      </div>
      <p className={styles.caption}>{pt
        ? "Pontos: observações · degraus: previsão da árvore."
        : "Dots: observations · steps: tree prediction."}</p>
    </section>
  );
}
