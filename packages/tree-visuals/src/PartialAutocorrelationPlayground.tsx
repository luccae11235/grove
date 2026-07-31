import { useEffect, useId, useMemo, useState } from "react";
import {
  pearsonCorrelation,
  type TimeSeriesPoint,
} from "./AutocorrelationPlayground";
import styles from "./AutocorrelationPlayground.module.css";

export interface ResidualPair {
  index: number;
  laterIndex: number;
  left: number;
  right: number;
  leftObserved: number;
  rightObserved: number;
  leftPredicted: number;
  rightPredicted: number;
}

interface RegressionLine {
  slope: number;
  intercept: number;
}

interface ValueScale {
  minimum: number;
  maximum: number;
  ticks: number[];
}

const LAGS = Array.from({ length: 10 }, (_, index) => index + 1);
const TIME_PLOT = { width: 960, height: 250, left: 52, right: 18, top: 42, bottom: 34 };
const SMALL_PLOT = { width: 520, height: 330, left: 58, right: 18, top: 20, bottom: 48 };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function countAtProgress(total: number, progress: number): number {
  return progress <= 0 ? 0 : Math.max(1, Math.round(total * progress / 100));
}

function format(value: number | null): string {
  return value === null ? "—" : value.toFixed(2).replace("-", "−");
}

function symmetricScale(values: number[]): ValueScale {
  const maximumAbsoluteValue = Math.max(1, ...values.map((value) => Math.abs(value)));
  const limit = Math.ceil(maximumAbsoluteValue * 2) / 2;
  return { minimum: -limit, maximum: limit, ticks: [-limit, 0, limit] };
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const pivotValue = augmented[column][column];
    for (let entry = column; entry <= size; entry += 1) augmented[column][entry] /= pivotValue;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let entry = column; entry <= size; entry += 1) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function fitLinearModel(features: number[][], target: number[]): number[] | null {
  if (features.length === 0 || features.length !== target.length) return null;
  const columns = features[0].length;
  const gram = Array.from({ length: columns }, () => Array(columns).fill(0) as number[]);
  const cross = Array(columns).fill(0) as number[];

  features.forEach((row, rowIndex) => {
    for (let left = 0; left < columns; left += 1) {
      cross[left] += row[left] * target[rowIndex];
      for (let right = 0; right < columns; right += 1) {
        gram[left][right] += row[left] * row[right];
      }
    }
  });

  for (let index = 1; index < columns; index += 1) gram[index][index] += 1e-9;
  return solveLinearSystem(gram, cross);
}

function predict(features: number[], coefficients: number[]): number {
  return features.reduce((sum, value, index) => sum + value * coefficients[index], 0);
}

export function residualPairsAtLag(values: number[], lag: number, pairCount: number): ResidualPair[] {
  const available = Math.max(0, values.length - lag);
  const count = clamp(Math.round(pairCount), 0, available);
  const minimumRows = lag === 1 ? 2 : lag + 2;
  if (count < minimumRows) return [];

  const rows = Array.from({ length: count }, (_, index) => [
    1,
    ...values.slice(index + 1, index + lag),
  ]);
  const left = Array.from({ length: count }, (_, index) => values[index]);
  const right = Array.from({ length: count }, (_, index) => values[index + lag]);
  const leftCoefficients = fitLinearModel(rows, left);
  const rightCoefficients = fitLinearModel(rows, right);
  if (!leftCoefficients || !rightCoefficients) return [];

  return rows.map((row, index) => {
    const leftPredicted = predict(row, leftCoefficients);
    const rightPredicted = predict(row, rightCoefficients);
    return {
      index,
      laterIndex: index + lag,
      left: left[index] - leftPredicted,
      right: right[index] - rightPredicted,
      leftObserved: left[index],
      rightObserved: right[index],
      leftPredicted,
      rightPredicted,
    };
  });
}

export function partialAutocorrelation(values: number[], lag: number, pairCount: number): number | null {
  const pairs = residualPairsAtLag(values, lag, pairCount);
  return pearsonCorrelation(
    pairs.map((pair) => pair.left),
    pairs.map((pair) => pair.right),
  );
}

function fitLine(pairs: ResidualPair[]): RegressionLine | null {
  if (pairs.length < 2) return null;
  const leftMean = pairs.reduce((sum, pair) => sum + pair.left, 0) / pairs.length;
  const rightMean = pairs.reduce((sum, pair) => sum + pair.right, 0) / pairs.length;
  const denominator = pairs.reduce((sum, pair) => sum + (pair.left - leftMean) ** 2, 0);
  if (denominator === 0) return null;
  const slope = pairs.reduce(
    (sum, pair) => sum + (pair.left - leftMean) * (pair.right - rightMean),
    0,
  ) / denominator;
  return { slope, intercept: rightMean - slope * leftMean };
}

function PacfTimeSeriesChart({
  points,
  lag,
  pairCount,
  scale,
}: {
  points: TimeSeriesPoint[];
  lag: number;
  pairCount: number;
  scale: ValueScale;
}) {
  const markerId = useId().replaceAll(":", "");
  const plotRight = TIME_PLOT.width - TIME_PLOT.right;
  const plotBottom = TIME_PLOT.height - TIME_PLOT.bottom;
  const x = (index: number) => TIME_PLOT.left
    + index / (points.length - 1) * (plotRight - TIME_PLOT.left);
  const y = (value: number) => TIME_PLOT.top
    + (scale.maximum - value) / (scale.maximum - scale.minimum) * (plotBottom - TIME_PLOT.top);
  const path = (visiblePoints: TimeSeriesPoint[]) => visiblePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(point.value).toFixed(2)}`)
    .join(" ");
  const currentIndex = pairCount > 0 ? pairCount - 1 : null;
  const laterIndex = currentIndex === null ? null : currentIndex + lag;
  const processed = laterIndex === null ? points.slice(0, 1) : points.slice(0, laterIndex + 1);
  const middleStart = currentIndex === null ? null : currentIndex + 1;
  const middleEnd = laterIndex === null ? null : laterIndex - 1;
  const hasMiddle = middleStart !== null && middleEnd !== null && middleStart <= middleEnd;
  const bandLeft = hasMiddle ? x(middleStart) - 4 : 0;
  const bandRight = hasMiddle ? x(middleEnd) + 4 : 0;
  const bandWidth = hasMiddle ? Math.max(9, bandRight - bandLeft) : 0;
  const bandCenter = hasMiddle ? bandLeft + bandWidth / 2 : 0;

  return (
    <svg
      className={styles.timeChart}
      viewBox={`0 0 ${TIME_PLOT.width} ${TIME_PLOT.height}`}
      role="img"
      aria-label={`Synthetic AR(1) series with ${pairCount} windows scanned at lag ${lag}. ${lag === 1 ? "There are no intermediate values." : `${lag - 1} intermediate values predict both endpoints in the current window.`}`}
    >
      <title>{`PACF scan at lag ${lag}`}</title>
      <desc>The full series stays fixed. A green band marks the intermediate observations, and two arrows point from those observations to the endpoints they predict.</desc>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#157451" />
        </marker>
      </defs>
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line className={tick === 0 ? styles.zeroLine : styles.gridline} x1={TIME_PLOT.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          <text className={styles.tick} x={TIME_PLOT.left - 9} y={y(tick) + 4} textAnchor="end">{format(tick)}</text>
        </g>
      ))}
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((index) => (
        <text className={styles.tick} x={x(index)} y={plotBottom + 23} textAnchor="middle" key={index}>{index + 1}</text>
      ))}
      <path className={styles.seriesMuted} d={path(points)} />
      <path className={styles.seriesScanned} d={path(processed)} />
      {currentIndex !== null && laterIndex !== null && (
        <g>
          {hasMiddle ? (
            <g className={styles.middleScanner}>
              <rect x={bandLeft} y={TIME_PLOT.top - 27} width={bandWidth} height={plotBottom - TIME_PLOT.top + 27} rx="5" />
              <line x1={bandLeft} x2={bandRight} y1={TIME_PLOT.top - 17} y2={TIME_PLOT.top - 17} />
              <path d={`M ${bandCenter} ${TIME_PLOT.top - 17} Q ${x(currentIndex)} ${TIME_PLOT.top - 17} ${x(currentIndex)} ${y(points[currentIndex].value) - 7}`} markerEnd={`url(#${markerId})`} />
              <path d={`M ${bandCenter} ${TIME_PLOT.top - 17} Q ${x(laterIndex)} ${TIME_PLOT.top - 17} ${x(laterIndex)} ${y(points[laterIndex].value) - 7}`} markerEnd={`url(#${markerId})`} />
            </g>
          ) : (
            <text className={styles.middleNote} x={plotRight} y={TIME_PLOT.top - 17} textAnchor="end">No middle values at lag 1</text>
          )}
          <circle className={styles.predictedEndpoint} cx={x(currentIndex)} cy={y(points[currentIndex].value)} r="5.5" />
          <circle className={styles.predictedEndpoint} cx={x(laterIndex)} cy={y(points[laterIndex].value)} r="5.5" />
        </g>
      )}
    </svg>
  );
}

function ResidualScatterChart({
  pairs,
  lag,
  scale,
  correlation,
}: {
  pairs: ResidualPair[];
  lag: number;
  scale: ValueScale;
  correlation: number | null;
}) {
  const clipId = useId().replaceAll(":", "");
  const plotRight = SMALL_PLOT.width - SMALL_PLOT.right;
  const plotBottom = SMALL_PLOT.height - SMALL_PLOT.bottom;
  const x = (value: number) => SMALL_PLOT.left
    + (value - scale.minimum) / (scale.maximum - scale.minimum) * (plotRight - SMALL_PLOT.left);
  const y = (value: number) => SMALL_PLOT.top
    + (scale.maximum - value) / (scale.maximum - scale.minimum) * (plotBottom - SMALL_PLOT.top);
  const line = fitLine(pairs);

  return (
    <svg
      className={styles.smallChart}
      viewBox={`0 0 ${SMALL_PLOT.width} ${SMALL_PLOT.height}`}
      role="img"
      aria-label={`${pairs.length} residual pairs at lag ${lag}; partial correlation ${format(correlation)}.`}
    >
      <title>{`Endpoint residuals at lag ${lag}`}</title>
      <desc>Each point pairs what the middle observations failed to predict at the left endpoint with what they failed to predict at the right endpoint.</desc>
      <defs>
        <clipPath id={clipId}>
          <rect x={SMALL_PLOT.left} y={SMALL_PLOT.top} width={plotRight - SMALL_PLOT.left} height={plotBottom - SMALL_PLOT.top} />
        </clipPath>
      </defs>
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line className={tick === 0 ? styles.zeroLine : styles.gridline} x1={SMALL_PLOT.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          <line className={tick === 0 ? styles.zeroLine : styles.gridline} x1={x(tick)} x2={x(tick)} y1={SMALL_PLOT.top} y2={plotBottom} />
          <text className={styles.tick} x={SMALL_PLOT.left - 9} y={y(tick) + 4} textAnchor="end">{format(tick)}</text>
          <text className={styles.tick} x={x(tick)} y={plotBottom + 20} textAnchor="middle">{format(tick)}</text>
        </g>
      ))}
      <g clipPath={`url(#${clipId})`}>
        {pairs.map((pair, index) => (
          <circle
            className={index === pairs.length - 1 ? styles.currentScatterPoint : styles.scatterPoint}
            cx={x(pair.left)}
            cy={y(pair.right)}
            r={index === pairs.length - 1 ? 5 : 3.3}
            key={`${pair.index}-${pair.laterIndex}`}
          >
            <title>{`Left residual ${format(pair.left)}, right residual ${format(pair.right)}`}</title>
          </circle>
        ))}
        {line && (
          <line
            className={styles.fitLine}
            x1={x(scale.minimum)}
            x2={x(scale.maximum)}
            y1={y(line.intercept + line.slope * scale.minimum)}
            y2={y(line.intercept + line.slope * scale.maximum)}
          />
        )}
      </g>
      <text className={styles.axisLabel} x={(SMALL_PLOT.left + plotRight) / 2} y={SMALL_PLOT.height - 8} textAnchor="middle">Residual at t</text>
      <text className={styles.axisLabel} x="14" y={(SMALL_PLOT.top + plotBottom) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(SMALL_PLOT.top + plotBottom) / 2})`}>Residual at t + {lag}</text>
    </svg>
  );
}

function PacfBars({
  values,
  selectedLag,
  progressByLag,
}: {
  values: number[];
  selectedLag: number;
  progressByLag: Record<number, number>;
}) {
  const plotRight = SMALL_PLOT.width - SMALL_PLOT.right;
  const plotBottom = SMALL_PLOT.height - SMALL_PLOT.bottom;
  const y = (value: number) => SMALL_PLOT.top + (1 - value) / 2 * (plotBottom - SMALL_PLOT.top);
  const band = (plotRight - SMALL_PLOT.left) / LAGS.length;
  const barWidth = Math.min(27, band * 0.58);
  const results = LAGS.map((lag) => {
    const total = values.length - lag;
    const count = countAtProgress(total, progressByLag[lag] ?? 0);
    const pairs = residualPairsAtLag(values, lag, total).slice(0, count);
    return {
      lag,
      count,
      correlation: pearsonCorrelation(
        pairs.map((pair) => pair.left),
        pairs.map((pair) => pair.right),
      ),
    };
  });

  return (
    <svg className={styles.smallChart} viewBox={`0 0 ${SMALL_PLOT.width} ${SMALL_PLOT.height}`} role="img" aria-label="Partial autocorrelation results for the lags scanned so far.">
      <title>Partial autocorrelation by lag</title>
      <desc>Bars show the correlation left after the intermediate observations have been removed from both endpoints.</desc>
      {[-1, -0.5, 0, 0.5, 1].map((tick) => (
        <g key={tick}>
          <line className={tick === 0 ? styles.zeroLine : styles.gridline} x1={SMALL_PLOT.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          <text className={styles.tick} x={SMALL_PLOT.left - 9} y={y(tick) + 4} textAnchor="end">{tick === 0 ? "0" : format(tick)}</text>
        </g>
      ))}
      {results.map((result, index) => {
        const center = SMALL_PLOT.left + band * (index + 0.5);
        const value = result.correlation ?? 0;
        const top = value >= 0 ? y(value) : y(0);
        const height = Math.abs(y(value) - y(0));
        return (
          <g key={result.lag}>
            <rect className={result.lag === selectedLag ? styles.selectedBar : styles.bar} x={center - barWidth / 2} y={top} width={barWidth} height={height} rx="2">
              <title>{`Lag ${result.lag}: PACF ${format(result.correlation)} from ${result.count} windows`}</title>
            </rect>
            <text className={result.lag === selectedLag ? styles.selectedTick : styles.tick} x={center} y={plotBottom + 20} textAnchor="middle">{result.lag}</text>
          </g>
        );
      })}
      <text className={styles.axisLabel} x={(SMALL_PLOT.left + plotRight) / 2} y={SMALL_PLOT.height - 8} textAnchor="middle">Lag</text>
      <text className={styles.axisLabel} x="14" y={(SMALL_PLOT.top + plotBottom) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(SMALL_PLOT.top + plotBottom) / 2})`}>PACF</text>
    </svg>
  );
}

export function PartialAutocorrelationPlayground({ points }: { points: TimeSeriesPoint[] }) {
  const [lag, setLag] = useState(1);
  const [progressByLag, setProgressByLag] = useState<Record<number, number>>(() =>
    Object.fromEntries(LAGS.map((candidate) => [candidate, 0])),
  );
  const [highestUnlockedLag, setHighestUnlockedLag] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const values = useMemo(() => points.map((point) => point.value), [points]);
  const seriesScale = useMemo(() => symmetricScale(values), [values]);
  const progress = progressByLag[lag] ?? 0;
  const windowTotal = Math.max(1, values.length - lag);
  const windowCount = countAtProgress(windowTotal, progress);
  const fullResidualPairs = useMemo(
    () => residualPairsAtLag(values, lag, windowTotal),
    [values, lag, windowTotal],
  );
  const residualPairs = useMemo(
    () => fullResidualPairs.slice(0, windowCount),
    [fullResidualPairs, windowCount],
  );
  const residualScale = useMemo(
    () => symmetricScale(fullResidualPairs.flatMap((pair) => [pair.left, pair.right])),
    [fullResidualPairs],
  );
  const correlation = pearsonCorrelation(
    residualPairs.map((pair) => pair.left),
    residualPairs.map((pair) => pair.right),
  );
  const completedLagCount = LAGS.filter((candidate) => progressByLag[candidate] === 100).length;
  const rangeId = useId();

  const updateProgress = (nextProgress: number) => {
    const boundedProgress = clamp(Math.round(nextProgress), 0, 100);
    setProgressByLag((current) => ({ ...current, [lag]: boundedProgress }));
    if (boundedProgress === 100) {
      setHighestUnlockedLag((current) => Math.max(current, Math.min(10, lag + 1)));
    }
  };

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setTimeout(() => {
      const nextProgress = Math.min(100, progress + 2);
      updateProgress(nextProgress);
      if (nextProgress === 100) setIsPlaying(false);
    }, 45);
    return () => window.clearTimeout(timer);
  }, [isPlaying, lag, progress]);

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (progress === 100) updateProgress(0);
    setIsPlaying(true);
  };

  const middleCount = Math.max(0, lag - 1);
  const guidance = progress === 0
    ? lag === 1
      ? "Lag 1 has no middle observations to remove. Scan it first so we have a reference."
      : `The green band contains ${middleCount} middle observation${middleCount === 1 ? "" : "s"}. It predicts both endpoints.`
    : progress < 100
      ? "Each point is a pair of residuals: what the middle failed to predict on the left and on the right."
      : lag < 10
        ? `Lag ${lag} is complete. Its PACF is saved, and lag ${Math.min(10, lag + 1)} is now available.`
        : "All ten lags are complete. Select any lag to inspect or replay its residual scan.";

  if (points.length < 24) {
    return <p className={styles.error}>The PACF playground needs at least twenty-four observations.</p>;
  }

  return (
    <section className={styles.playground} aria-label="Explore partial autocorrelation by removing intermediate observations">
      <div className={styles.timePanel}>
        <div className={styles.panelHeader}>
          <strong>Middle values predict both ends</strong>
          <span>Window {windowCount} of {windowTotal} · {middleCount} middle value{middleCount === 1 ? "" : "s"}</span>
        </div>
        <PacfTimeSeriesChart points={points} lag={lag} pairCount={windowCount} scale={seriesScale} />
        <label className={styles.scanControl} htmlFor={rangeId}>
          <span>Scan windows</span>
          <strong>{windowCount} / {windowTotal}</strong>
          <input
            id={rangeId}
            type="range"
            min="0"
            max="100"
            value={progress}
            aria-valuetext={`${windowCount} of ${windowTotal} windows`}
            onInput={(event) => {
              setIsPlaying(false);
              updateProgress(Number(event.currentTarget.value));
            }}
            onChange={(event) => updateProgress(Number(event.currentTarget.value))}
          />
        </label>
      </div>

      <div className={styles.lowerPanels}>
        <section className={styles.scatterPanel} aria-labelledby={`${rangeId}-residual-title`}>
          <div className={styles.panelHeader}>
            <strong id={`${rangeId}-residual-title`}>Lag {lag} residual pairs</strong>
            <span>partial r = {format(correlation)}</span>
          </div>
          <p className={styles.panelNote}>Only what the middle values could not predict enters this scatter plot.</p>
          <ResidualScatterChart pairs={residualPairs} lag={lag} scale={residualScale} correlation={correlation} />
        </section>
        <section className={styles.barPanel} aria-labelledby={`${rangeId}-pacf-title`}>
          <div className={styles.panelHeader}>
            <strong id={`${rangeId}-pacf-title`}>Partial correlation by lag</strong>
            <span>{completedLagCount} completed</span>
          </div>
          <PacfBars values={values} selectedLag={lag} progressByLag={progressByLag} />
        </section>
      </div>

      <div className={styles.guide}>
        <p>{guidance}</p>
        <div className={styles.guideControls}>
          <button type="button" className={styles.runButton} onClick={togglePlayback}>
            {isPlaying ? "Pause scan" : progress === 100 ? "Replay scan" : "Run scan"}
          </button>
          <fieldset className={styles.lagPicker}>
            <legend>Choose lag</legend>
            <div className={styles.lagButtons}>
              {LAGS.map((candidate) => (
                <button
                  type="button"
                  className={candidate === lag ? styles.activeLag : undefined}
                  aria-pressed={candidate === lag}
                  disabled={candidate > highestUnlockedLag}
                  onClick={() => {
                    setIsPlaying(false);
                    setLag(candidate);
                  }}
                  key={candidate}
                >
                  {candidate}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
      <p className={styles.srOnly} aria-live="polite">
        Lag {lag}, {windowCount} of {windowTotal} windows scanned, partial correlation {format(correlation)}.
      </p>
    </section>
  );
}
