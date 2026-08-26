import { useEffect, useId, useMemo, useState } from "react";
import styles from "./AutocorrelationPlayground.module.css";

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export type AcfLocale = "en" | "pt-BR";

interface LagPair {
  index: number;
  laterIndex: number;
  left: number;
  right: number;
}

interface RegressionLine {
  slope: number;
  intercept: number;
}

export interface AutocorrelationPlaygroundProps {
  points: TimeSeriesPoint[];
  seriesKind?: "sales" | "synthetic";
  locale?: AcfLocale;
}

const SALES_MIN = 2000;
const SALES_MAX = 7000;
const LAGS = Array.from({ length: 10 }, (_, index) => index + 1);
const TIME_PLOT = { width: 960, height: 230, left: 52, right: 18, top: 20, bottom: 34 };
const SMALL_PLOT = { width: 520, height: 330, left: 56, right: 18, top: 20, bottom: 48 };

interface ValueScale {
  minimum: number;
  maximum: number;
  ticks: number[];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function pearsonCorrelation(left: number[], right: number[]): number | null {
  if (left.length !== right.length || left.length < 2) return null;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  const numerator = left.reduce(
    (sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean),
    0,
  );
  const leftSpread = left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0);
  const rightSpread = right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0);
  const denominator = Math.sqrt(leftSpread * rightSpread);
  return denominator === 0 ? null : numerator / denominator;
}

export function pairsAtLag(values: number[], lag: number, pairCount: number): LagPair[] {
  const available = Math.max(0, values.length - lag);
  const count = clamp(Math.round(pairCount), 0, available);
  return Array.from({ length: count }, (_, index) => ({
    index,
    laterIndex: index + lag,
    left: values[index],
    right: values[index + lag],
  }));
}

function fitLine(pairs: LagPair[]): RegressionLine | null {
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

function formatCorrelation(value: number | null, locale: AcfLocale = "en"): string {
  return value === null
    ? "—"
    : value.toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).replace("-", "−");
}

function formatSales(value: number, locale: AcfLocale): string {
  return Math.round(value).toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US");
}

function formatSeriesValue(value: number, seriesKind: "sales" | "synthetic", locale: AcfLocale): string {
  return seriesKind === "sales" ? formatSales(value, locale) : formatCorrelation(value, locale);
}

function valueScale(values: number[], seriesKind: "sales" | "synthetic"): ValueScale {
  if (seriesKind === "sales") {
    return { minimum: SALES_MIN, maximum: SALES_MAX, ticks: [2000, 4000, 6000] };
  }
  const maximumAbsoluteValue = Math.max(1, ...values.map((value) => Math.abs(value)));
  const limit = Math.ceil(maximumAbsoluteValue * 2) / 2;
  return { minimum: -limit, maximum: limit, ticks: [-limit, 0, limit] };
}

function formatDate(value: string, locale: AcfLocale): string {
  return new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : "en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function countAtProgress(total: number, progress: number): number {
  return progress <= 0 ? 0 : Math.max(1, Math.round(total * progress / 100));
}

function TimeSeriesChart({
  points,
  lag,
  pairs,
  seriesKind,
  scale,
  locale,
}: {
  points: TimeSeriesPoint[];
  lag: number;
  pairs: LagPair[];
  seriesKind: "sales" | "synthetic";
  scale: ValueScale;
  locale: AcfLocale;
}) {
  const pt = locale === "pt-BR";
  const plotRight = TIME_PLOT.width - TIME_PLOT.right;
  const plotBottom = TIME_PLOT.height - TIME_PLOT.bottom;
  const x = (index: number) => TIME_PLOT.left
    + index / (points.length - 1) * (plotRight - TIME_PLOT.left);
  const y = (value: number) => TIME_PLOT.top
    + (scale.maximum - value) / (scale.maximum - scale.minimum) * (plotBottom - TIME_PLOT.top);
  const path = (visiblePoints: TimeSeriesPoint[]) => visiblePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(point.value).toFixed(2)}`)
    .join(" ");
  const current = pairs[pairs.length - 1];
  const processed = current ? points.slice(0, current.laterIndex + 1) : points.slice(0, 1);
  const firstY = current ? y(current.left) : TIME_PLOT.top;
  const secondY = current ? y(current.right) : TIME_PLOT.top;
  const bracketY = Math.max(TIME_PLOT.top + 7, Math.min(firstY, secondY) - 24);
  const timeTicks = seriesKind === "sales"
    ? [
        { index: 0, label: pt ? "jan." : "Jan" },
        { index: 31, label: pt ? "fev." : "Feb" },
        { index: 59, label: pt ? "mar." : "Mar" },
      ]
    : [
        { index: 0, label: "1" },
        { index: Math.floor((points.length - 1) / 2), label: String(Math.floor((points.length + 1) / 2)) },
        { index: points.length - 1, label: String(points.length) },
      ];

  return (
    <svg
      className={styles.timeChart}
      viewBox={`0 0 ${TIME_PLOT.width} ${TIME_PLOT.height}`}
      role="img"
      aria-label={pt
        ? `${seriesKind === "sales" ? "Vendas diárias" : "Série AR(1) sintética"} com o par ${pairs.length} destacado no lag ${lag}.`
        : `${seriesKind === "sales" ? "Daily sales" : "Synthetic AR(1) series"} with pair ${pairs.length} highlighted at lag ${lag}.`}
    >
      <title>{pt
        ? `Varredura da ${seriesKind === "sales" ? "série de vendas diárias" : "série sintética"} no lag ${lag}`
        : `${seriesKind === "sales" ? "Daily sales" : "Synthetic series"} scan at lag ${lag}`}</title>
      <desc>{pt
        ? `A série completa permanece fixa. Uma bifurcação marca o valor atual e o valor ${lag} passos adiante, enquanto a linha destacada mostra até onde a varredura avançou.`
        : `The full series remains fixed. A fork marks the current value and the value ${lag} steps later while the highlighted line shows how far the scan has progressed.`}</desc>
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line className={styles.gridline} x1={TIME_PLOT.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          <text className={styles.tick} x={TIME_PLOT.left - 9} y={y(tick) + 4} textAnchor="end">
            {seriesKind === "sales" ? `${tick / 1000}k` : formatSeriesValue(tick, seriesKind, locale)}
          </text>
        </g>
      ))}
      {timeTicks.map((tick) => (
        <text className={styles.tick} x={x(tick.index)} y={plotBottom + 23} textAnchor="middle" key={tick.label}>
          {tick.label}
        </text>
      ))}
      <path className={styles.seriesMuted} d={path(points)} />
      <path className={styles.seriesScanned} d={path(processed)} />
      {current && (
        <g className={styles.scanner}>
          <line x1={x(current.index)} x2={x(current.index)} y1={bracketY} y2={firstY} />
          <line x1={x(current.laterIndex)} x2={x(current.laterIndex)} y1={bracketY} y2={secondY} />
          <line x1={x(current.index)} x2={x(current.laterIndex)} y1={bracketY} y2={bracketY} />
          <circle className={styles.sourcePoint} cx={x(current.index)} cy={firstY} r="6" />
          <circle className={styles.targetPoint} cx={x(current.laterIndex)} cy={secondY} r="6" />
        </g>
      )}
    </svg>
  );
}

function ScatterChart({
  pairs,
  lag,
  correlation,
  seriesKind,
  scale,
  locale,
}: {
  pairs: LagPair[];
  lag: number;
  correlation: number | null;
  seriesKind: "sales" | "synthetic";
  scale: ValueScale;
  locale: AcfLocale;
}) {
  const pt = locale === "pt-BR";
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
      aria-label={pt
        ? `${pairs.length} pares da ${seriesKind === "sales" ? "série de vendas" : "série sintética"} no lag ${lag}; correlação de Pearson ${formatCorrelation(correlation, locale)}.`
        : `${pairs.length} ${seriesKind === "sales" ? "sales" : "synthetic-series"} pairs at lag ${lag}; Pearson correlation ${formatCorrelation(correlation, locale)}.`}
    >
      <title>{pt ? `Pares da ${seriesKind === "sales" ? "série de vendas" : "série sintética"} no lag ${lag}` : `${seriesKind === "sales" ? "Sales" : "Synthetic-series"} pairs at lag ${lag}`}</title>
      <desc>{pt ? "Cada par varrido se torna um ponto. A reta ajustada é atualizada à medida que os pontos se acumulam." : "Each scanned pair becomes one point. The fitted line updates as points accumulate."}</desc>
      <defs>
        <clipPath id={clipId}>
          <rect x={SMALL_PLOT.left} y={SMALL_PLOT.top} width={plotRight - SMALL_PLOT.left} height={plotBottom - SMALL_PLOT.top} />
        </clipPath>
      </defs>
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line className={styles.gridline} x1={SMALL_PLOT.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          <text className={styles.tick} x={SMALL_PLOT.left - 9} y={y(tick) + 4} textAnchor="end">{seriesKind === "sales" ? `${tick / 1000}k` : formatSeriesValue(tick, seriesKind, locale)}</text>
          <text className={styles.tick} x={x(tick)} y={plotBottom + 20} textAnchor="middle">{seriesKind === "sales" ? `${tick / 1000}k` : formatSeriesValue(tick, seriesKind, locale)}</text>
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
            <title>{`${formatSeriesValue(pair.left, seriesKind, locale)} → ${formatSeriesValue(pair.right, seriesKind, locale)}`}</title>
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
      <text className={styles.axisLabel} x={(SMALL_PLOT.left + plotRight) / 2} y={SMALL_PLOT.height - 8} textAnchor="middle">{pt ? `${seriesKind === "sales" ? "Vendas" : "Valor"} em t` : `${seriesKind === "sales" ? "Sales" : "Value"} at t`}</text>
      <text className={styles.axisLabel} x="14" y={(SMALL_PLOT.top + plotBottom) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(SMALL_PLOT.top + plotBottom) / 2})`}>
        {pt ? `${seriesKind === "sales" ? "Vendas" : "Valor"} em t + ${lag}` : `${seriesKind === "sales" ? "Sales" : "Value"} at t + ${lag}`}
      </text>
    </svg>
  );
}

function CorrelationBars({
  values,
  selectedLag,
  progressByLag,
  locale,
}: {
  values: number[];
  selectedLag: number;
  progressByLag: Record<number, number>;
  locale: AcfLocale;
}) {
  const pt = locale === "pt-BR";
  const plotRight = SMALL_PLOT.width - SMALL_PLOT.right;
  const plotBottom = SMALL_PLOT.height - SMALL_PLOT.bottom;
  const y = (value: number) => SMALL_PLOT.top + (1 - value) / 2 * (plotBottom - SMALL_PLOT.top);
  const band = (plotRight - SMALL_PLOT.left) / LAGS.length;
  const barWidth = Math.min(27, band * 0.58);
  const results = LAGS.map((lag) => {
    const total = values.length - lag;
    const progress = progressByLag[lag] ?? 0;
    const count = countAtProgress(total, progress);
    const pairs = pairsAtLag(values, lag, count);
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
    <svg
      className={styles.smallChart}
      viewBox={`0 0 ${SMALL_PLOT.width} ${SMALL_PLOT.height}`}
      role="img"
      aria-label={pt ? "Resultados de correlação para os lags varridos até agora. Lags ainda não varridos não têm barra." : "Correlation results for the lags scanned so far. Unscanned lags have no bar."}
    >
      <title>{pt ? "Correlação por lag" : "Correlation by lag"}</title>
      <desc>{pt ? "As barras se estendem acima ou abaixo de zero. O lag selecionado está em destaque." : "Bars extend above or below zero. The selected lag is emphasized."}</desc>
      {[-1, -0.5, 0, 0.5, 1].map((tick) => (
        <g key={tick}>
          <line className={tick === 0 ? styles.zeroLine : styles.gridline} x1={SMALL_PLOT.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          <text className={styles.tick} x={SMALL_PLOT.left - 9} y={y(tick) + 4} textAnchor="end">
            {tick === 0 ? "0" : tick.toFixed(1).replace("-", "−")}
          </text>
        </g>
      ))}
      {results.map((result, index) => {
        const center = SMALL_PLOT.left + band * (index + 0.5);
        const value = result.correlation ?? 0;
        const top = value >= 0 ? y(value) : y(0);
        const height = Math.abs(y(value) - y(0));
        return (
          <g key={result.lag}>
            <rect
              className={result.lag === selectedLag ? styles.selectedBar : styles.bar}
              x={center - barWidth / 2}
              y={top}
              width={barWidth}
              height={height}
              rx="2"
            >
              <title>{pt ? `Lag ${result.lag}: r = ${formatCorrelation(result.correlation, locale)}, calculado com ${result.count} pares` : `Lag ${result.lag}: r = ${formatCorrelation(result.correlation, locale)} from ${result.count} pairs`}</title>
            </rect>
            <text
              className={result.lag === selectedLag ? styles.selectedTick : styles.tick}
              x={center}
              y={plotBottom + 20}
              textAnchor="middle"
            >
              {result.lag}
            </text>
          </g>
        );
      })}
      <text className={styles.axisLabel} x={(SMALL_PLOT.left + plotRight) / 2} y={SMALL_PLOT.height - 8} textAnchor="middle">Lag</text>
      <text className={styles.axisLabel} x="14" y={(SMALL_PLOT.top + plotBottom) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(SMALL_PLOT.top + plotBottom) / 2})`}>
        {pt ? "Correlação" : "Correlation"}
      </text>
    </svg>
  );
}

export function AutocorrelationPlayground({
  points,
  seriesKind = "sales",
  locale = "en",
}: AutocorrelationPlaygroundProps) {
  const pt = locale === "pt-BR";
  const [lag, setLag] = useState(1);
  const [progressByLag, setProgressByLag] = useState<Record<number, number>>(() =>
    Object.fromEntries(LAGS.map((candidate) => [candidate, 0])),
  );
  const [highestUnlockedLag, setHighestUnlockedLag] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const values = useMemo(() => points.map((point) => point.value), [points]);
  const scale = useMemo(() => valueScale(values, seriesKind), [values, seriesKind]);
  const progress = progressByLag[lag] ?? 0;
  const pairTotal = Math.max(1, values.length - lag);
  const pairCount = countAtProgress(pairTotal, progress);
  const pairs = useMemo(() => pairsAtLag(values, lag, pairCount), [values, lag, pairCount]);
  const correlation = pearsonCorrelation(
    pairs.map((pair) => pair.left),
    pairs.map((pair) => pair.right),
  );
  const current = pairs[pairs.length - 1];
  const completedLagCount = LAGS.filter((candidate) => progressByLag[candidate] === 100).length;
  const rangeId = useId();

  const unlockNextLag = (completedLag: number) => {
    setHighestUnlockedLag((currentLag) =>
      Math.max(currentLag, Math.min(10, completedLag + 1)),
    );
  };

  const updateProgress = (nextProgress: number) => {
    const boundedProgress = clamp(Math.round(nextProgress), 0, 100);
    setProgressByLag((currentProgress) => ({
      ...currentProgress,
      [lag]: boundedProgress,
    }));
    if (boundedProgress === 100) unlockNextLag(lag);
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

  const guidance = pt
    ? progress === 0
      ? `O lag ${lag} combina cada observação com o valor ${lag} ${lag === 1 ? "passo" : "passos"} adiante. Arraste a varredura ou execute-a.`
      : progress < 100
        ? "Cada novo par se torna um ponto. A reta ajustada e a correlação usam apenas os pontos varridos até agora."
        : lag < 10
          ? `O lag ${lag} está completo. O resultado foi salvo, e o lag ${Math.min(10, lag + 1)} já está disponível.`
          : "Os dez lags estão completos. Selecione qualquer lag para inspecionar ou repetir a varredura."
    : progress === 0
    ? `Lag ${lag} pairs each observation with the value ${lag} step${lag === 1 ? "" : "s"} later. Drag the scan or run it.`
    : progress < 100
      ? "Each new pair becomes one point. The fitted line and correlation use only the points scanned so far."
      : lag < 10
        ? `Lag ${lag} is complete. Its result is saved, and lag ${Math.min(10, lag + 1)} is now available.`
        : "All ten lags are complete. Select any lag to inspect or replay its scan.";

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (progress === 100) updateProgress(0);
    setIsPlaying(true);
  };

  if (points.length < 12) {
    return <p className={styles.error}>{pt ? "O playground precisa de pelo menos doze observações." : "The playground needs at least twelve observations."}</p>;
  }

  return (
    <section className={styles.playground} lang={locale} aria-label={pt ? `Explore a autocorrelação varrendo pares defasados da ${seriesKind === "sales" ? "série de vendas" : "série sintética"}` : `Explore autocorrelation by scanning lagged ${seriesKind === "sales" ? "sales" : "synthetic-series"} pairs`}>
      <div className={styles.timePanel}>
        <div className={styles.panelHeader}>
          <strong>{pt ? (seriesKind === "sales" ? "Vendas ao longo do tempo" : "Série AR(1) sintética") : (seriesKind === "sales" ? "Sales over time" : "Synthetic AR(1) series")}</strong>
          <span>
            {pt ? `Par ${pairCount} de ${pairTotal}` : `Pair ${pairCount} of ${pairTotal}`}
            {current ? ` · ${seriesKind === "sales" ? formatDate(points[current.index].date, locale) : `t = ${current.index + 1}`} → ${seriesKind === "sales" ? formatDate(points[current.laterIndex].date, locale) : `t = ${current.laterIndex + 1}`}` : ""}
          </span>
        </div>
        <TimeSeriesChart points={points} lag={lag} pairs={pairs} seriesKind={seriesKind} scale={scale} locale={locale} />
        <label className={styles.scanControl} htmlFor={rangeId}>
          <span>{pt ? "Varrer pares" : "Scan pairs"}</span>
          <strong>{pairCount} / {pairTotal}</strong>
          <input
            id={rangeId}
            type="range"
            min="0"
            max="100"
            value={progress}
            aria-valuetext={pt ? `${pairCount} de ${pairTotal} pares` : `${pairCount} of ${pairTotal} pairs`}
            onInput={(event) => {
              setIsPlaying(false);
              updateProgress(Number(event.currentTarget.value));
            }}
            onChange={(event) => updateProgress(Number(event.currentTarget.value))}
          />
        </label>
      </div>

      <div className={styles.lowerPanels}>
        <section className={styles.scatterPanel} aria-labelledby={`${rangeId}-scatter-title`}>
          <div className={styles.panelHeader}>
            <strong id={`${rangeId}-scatter-title`}>{pt ? `Pares no lag ${lag}` : `Lag ${lag} pairs`}</strong>
            <span>r = {formatCorrelation(correlation, locale)}</span>
          </div>
          <p className={styles.panelNote}>
            {pt ? <>Cada ponto posiciona o valor em <i>t</i> na horizontal e o valor em <i>t + {lag}</i> na vertical.</> : <>Each point places the value at <i>t</i> horizontally and the value at <i>t + {lag}</i> vertically.</>}
          </p>
          <ScatterChart pairs={pairs} lag={lag} correlation={correlation} seriesKind={seriesKind} scale={scale} locale={locale} />
        </section>
        <section className={styles.barPanel} aria-labelledby={`${rangeId}-bars-title`}>
          <div className={styles.panelHeader}>
            <strong id={`${rangeId}-bars-title`}>{pt ? "Correlação por lag" : "Correlation by lag"}</strong>
            <span>{pt ? `${completedLagCount} concluídos` : `${completedLagCount} completed`}</span>
          </div>
          <CorrelationBars values={values} selectedLag={lag} progressByLag={progressByLag} locale={locale} />
        </section>
      </div>

      <div className={styles.guide}>
        <p>{guidance}</p>
        <div className={styles.guideControls}>
          <button type="button" className={styles.runButton} onClick={togglePlayback}>
            {pt ? (isPlaying ? "Pausar varredura" : progress === 100 ? "Repetir varredura" : "Executar varredura") : (isPlaying ? "Pause scan" : progress === 100 ? "Replay scan" : "Run scan")}
          </button>
          <fieldset className={styles.lagPicker}>
            <legend>{pt ? "Escolha o lag" : "Choose lag"}</legend>
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
        {pt ? `Lag ${lag}, ${pairCount} de ${pairTotal} pares varridos, correlação ${formatCorrelation(correlation, locale)}.` : `Lag ${lag}, ${pairCount} of ${pairTotal} pairs scanned, correlation ${formatCorrelation(correlation, locale)}.`}
      </p>
    </section>
  );
}
