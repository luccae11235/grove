import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./MultiFeatureRegressionPlayground.module.css";

interface GreenhouseRow {
  id: string;
  temperature: number;
  water: number;
  sunlight: number;
  yield: number;
}

interface FeatureDefinition {
  key: "temperature" | "water" | "sunlight";
  label: string;
  shortLabel: string;
  unit: string;
  ticks: number[];
}

interface RegressionCandidate {
  featureIndex: number;
  threshold: number;
  leftIndices: number[];
  rightIndices: number[];
  leftMean: number;
  rightMean: number;
  splitError: number;
  improvement: number;
}

interface RegressionLeaf {
  kind: "leaf";
  indices: number[];
  prediction: number;
}

interface RegressionSplit {
  kind: "split";
  indices: number[];
  prediction: number;
  candidate: RegressionCandidate;
  left: RegressionTree;
  right: RegressionTree;
}

type RegressionTree = RegressionLeaf | RegressionSplit;
type RegressionLocale = "en" | "pt-BR";

const ROWS: GreenhouseRow[] = [
  { id: "A", temperature: 16, water: 3.0, sunlight: 6.5, yield: 1.7 },
  { id: "B", temperature: 17, water: 1.5, sunlight: 3.0, yield: 1.9 },
  { id: "C", temperature: 18, water: 4.0, sunlight: 5.0, yield: 2.0 },
  { id: "D", temperature: 20, water: 1.2, sunlight: 6.0, yield: 3.8 },
  { id: "E", temperature: 23, water: 1.6, sunlight: 3.5, yield: 4.0 },
  { id: "F", temperature: 26, water: 2.0, sunlight: 7.0, yield: 4.1 },
  { id: "G", temperature: 21, water: 3.0, sunlight: 2.5, yield: 5.0 },
  { id: "H", temperature: 24, water: 3.5, sunlight: 3.0, yield: 5.1 },
  { id: "I", temperature: 27, water: 4.0, sunlight: 3.5, yield: 5.2 },
  { id: "J", temperature: 22, water: 3.2, sunlight: 5.5, yield: 5.6 },
  { id: "K", temperature: 25, water: 3.7, sunlight: 6.0, yield: 5.8 },
  { id: "L", temperature: 28, water: 4.2, sunlight: 6.5, yield: 5.9 },
];

const FEATURES: FeatureDefinition[] = [
  {
    key: "temperature",
    label: "Temperature",
    shortLabel: "temperature",
    unit: "°C",
    ticks: [16, 18, 20, 22, 24, 26, 28],
  },
  {
    key: "water",
    label: "Water per week",
    shortLabel: "water",
    unit: "L",
    ticks: [1, 2, 3, 4],
  },
  {
    key: "sunlight",
    label: "Sunlight per day",
    shortLabel: "sunlight",
    unit: "h",
    ticks: [2, 3, 4, 5, 6, 7],
  },
];

const ALL_INDICES = ROWS.map((_, index) => index);
const MINIMUM_IMPROVEMENT = 0.25;
const EPSILON = 1e-9;

function featureValue(row: GreenhouseRow, featureIndex: number): number {
  return row[FEATURES[featureIndex].key];
}

function mean(indices: number[]): number {
  return indices.reduce((sum, index) => sum + ROWS[index].yield, 0) / indices.length;
}

function squaredError(indices: number[], prediction = mean(indices)): number {
  return indices.reduce((sum, index) => sum + (ROWS[index].yield - prediction) ** 2, 0);
}

function candidatesFor(indices: number[], featureIndex: number): RegressionCandidate[] {
  const ordered = [...indices].sort(
    (left, right) => featureValue(ROWS[left], featureIndex) - featureValue(ROWS[right], featureIndex),
  );
  const parentError = squaredError(indices);
  const candidates: RegressionCandidate[] = [];

  for (let position = 1; position < ordered.length; position += 1) {
    const previous = featureValue(ROWS[ordered[position - 1]], featureIndex);
    const next = featureValue(ROWS[ordered[position]], featureIndex);
    if (Math.abs(previous - next) < EPSILON) continue;

    const threshold = (previous + next) / 2;
    const leftIndices = indices.filter((index) => featureValue(ROWS[index], featureIndex) <= threshold);
    const rightIndices = indices.filter((index) => featureValue(ROWS[index], featureIndex) > threshold);
    const leftMean = mean(leftIndices);
    const rightMean = mean(rightIndices);
    const splitError = squaredError(leftIndices, leftMean) + squaredError(rightIndices, rightMean);
    candidates.push({
      featureIndex,
      threshold,
      leftIndices,
      rightIndices,
      leftMean,
      rightMean,
      splitError,
      improvement: parentError - splitError,
    });
  }

  return candidates;
}

function bestCandidate(candidates: RegressionCandidate[]): RegressionCandidate | null {
  return candidates.reduce<RegressionCandidate | null>(
    (best, candidate) =>
      best === null || candidate.splitError < best.splitError - EPSILON ? candidate : best,
    null,
  );
}

function growTree(indices: number[]): RegressionTree {
  const prediction = mean(indices);
  const candidates = FEATURES.flatMap((_, featureIndex) => candidatesFor(indices, featureIndex));
  const winner = bestCandidate(candidates);
  if (!winner || winner.improvement < MINIMUM_IMPROVEMENT) {
    return { kind: "leaf", indices, prediction };
  }
  return {
    kind: "split",
    indices,
    prediction,
    candidate: winner,
    left: growTree(winner.leftIndices),
    right: growTree(winner.rightIndices),
  };
}

const ROOT_CANDIDATES = FEATURES.map((_, featureIndex) => candidatesFor(ALL_INDICES, featureIndex));
const ROOT_BEST = ROOT_CANDIDATES.map((candidates) => bestCandidate(candidates));
const ROOT_CANDIDATE_COUNT = ROOT_CANDIDATES.reduce((total, candidates) => total + candidates.length, 0);
const FINAL_TREE = growTree(ALL_INDICES);

function format(value: number, digits = 2): string {
  return value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

function localizedFeature(feature: FeatureDefinition, locale: RegressionLocale) {
  if (locale !== "pt-BR") return feature;
  const labels = {
    temperature: { label: "Temperatura", shortLabel: "temperatura" },
    water: { label: "Água por semana", shortLabel: "água" },
    sunlight: { label: "Luz solar por dia", shortLabel: "luz solar" },
  } as const;
  return { ...feature, ...labels[feature.key] };
}

function FeaturePlot({
  featureIndex,
  candidate,
  locale = "en",
}: {
  featureIndex: number;
  candidate: RegressionCandidate;
  locale?: RegressionLocale;
}) {
  const pt = locale === "pt-BR";
  const feature = localizedFeature(FEATURES[featureIndex], locale);
  const values = ROWS.map((row) => featureValue(row, featureIndex));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = (maximum - minimum) * 0.06;
  const domainMin = minimum - padding;
  const domainMax = maximum + padding;
  const plot = { width: 620, height: 330, left: 58, right: 18, top: 20, bottom: 54 };
  const right = plot.width - plot.right;
  const bottom = plot.height - plot.bottom;
  const x = (value: number) => plot.left + ((value - domainMin) / (domainMax - domainMin)) * (right - plot.left);
  const y = (value: number) => bottom - ((value - 1.4) / (6.2 - 1.4)) * (bottom - plot.top);
  const splitX = x(candidate.threshold);
  const plotTitle = pt ? `Produtividade prevista a partir de ${feature.label.toLowerCase()}` : `Crop yield predicted from ${feature.label.toLowerCase()}`;
  const plotDescription = pt ? `Doze linhas da estufa são representadas por ${feature.label.toLowerCase()} e produtividade. Um limiar vertical cria dois grupos e uma média horizontal prevê cada grupo.` : `Twelve greenhouse rows are plotted by ${feature.label.toLowerCase()} and crop yield. A vertical threshold creates two groups, and a horizontal mean predicts each group.`;

  return (
    <svg
      className={styles.featurePlot}
      viewBox={`0 0 ${plot.width} ${plot.height}`}
      role="img"
      aria-labelledby="multi-regression-plot-title multi-regression-plot-description"
    >
      <title id="multi-regression-plot-title">{plotTitle}</title>
      <desc id="multi-regression-plot-description">{plotDescription}</desc>

      {[2, 3, 4, 5, 6].map((tick) => (
        <g key={`yield-${tick}`}>
          <line className={styles.gridline} x1={plot.left} x2={right} y1={y(tick)} y2={y(tick)} />
          <text className={styles.tick} x={plot.left - 10} y={y(tick) + 4} textAnchor="end">{tick}</text>
        </g>
      ))}
      {feature.ticks.map((tick) => (
        <g key={`${feature.key}-${tick}`}>
          <line className={styles.gridline} x1={x(tick)} x2={x(tick)} y1={plot.top} y2={bottom} />
          <text className={styles.tick} x={x(tick)} y={bottom + 20} textAnchor="middle">{tick}</text>
        </g>
      ))}

      <rect className={styles.leftRegion} x={plot.left} y={plot.top} width={splitX - plot.left} height={bottom - plot.top} />
      <rect className={styles.rightRegion} x={splitX} y={plot.top} width={right - splitX} height={bottom - plot.top} />

      {candidate.leftIndices.map((index) => (
        <line
          className={styles.residualLine}
          x1={x(featureValue(ROWS[index], featureIndex))}
          x2={x(featureValue(ROWS[index], featureIndex))}
          y1={y(ROWS[index].yield)}
          y2={y(candidate.leftMean)}
          key={`left-residual-${index}`}
        />
      ))}
      {candidate.rightIndices.map((index) => (
        <line
          className={styles.residualLine}
          x1={x(featureValue(ROWS[index], featureIndex))}
          x2={x(featureValue(ROWS[index], featureIndex))}
          y1={y(ROWS[index].yield)}
          y2={y(candidate.rightMean)}
          key={`right-residual-${index}`}
        />
      ))}

      <line className={styles.meanLine} x1={plot.left} x2={splitX} y1={y(candidate.leftMean)} y2={y(candidate.leftMean)} />
      <line className={styles.meanLine} x1={splitX} x2={right} y1={y(candidate.rightMean)} y2={y(candidate.rightMean)} />
      <line className={styles.thresholdLine} x1={splitX} x2={splitX} y1={plot.top} y2={bottom} />

      <text className={styles.predictionLabel} x={plot.left + 7} y={y(candidate.leftMean) - 7}>
        {pt ? "previsão" : "predict"} {format(candidate.leftMean)}
      </text>
      <text className={styles.predictionLabel} x={right - 7} y={y(candidate.rightMean) - 7} textAnchor="end">
        {pt ? "previsão" : "predict"} {format(candidate.rightMean)}
      </text>
      <text className={styles.thresholdLabel} x={splitX + 6} y={plot.top + 14}>
        ≤ {format(candidate.threshold)}
      </text>

      {ROWS.map((row) => {
        const pointX = x(featureValue(row, featureIndex));
        const pointY = y(row.yield);
        return (
          <g className={styles.point} key={row.id}>
            <circle cx={pointX} cy={pointY} r="6" />
            <text x={pointX + 8} y={pointY - 8}>{row.id}</text>
          </g>
        );
      })}

      <line className={styles.axis} x1={plot.left} x2={right} y1={bottom} y2={bottom} />
      <line className={styles.axis} x1={plot.left} x2={plot.left} y1={plot.top} y2={bottom} />
      <text className={styles.axisLabel} x={(plot.left + right) / 2} y={plot.height - 8} textAnchor="middle">
        {feature.label} ({feature.unit})
      </text>
      <text className={styles.axisLabel} transform={`rotate(-90 15 ${(plot.top + bottom) / 2})`} x="15" y={(plot.top + bottom) / 2} textAnchor="middle">
        {pt ? "Produtividade (t/hectare)" : "Yield (tons/hectare)"}
      </text>
    </svg>
  );
}

function ErrorTrace({
  candidates,
  selectedIndex,
  best,
  feature,
  locale = "en",
}: {
  candidates: RegressionCandidate[];
  selectedIndex: number;
  best: RegressionCandidate;
  feature: FeatureDefinition;
  locale?: RegressionLocale;
}) {
  const pt = locale === "pt-BR";
  const localized = localizedFeature(feature, locale);
  const chart = { width: 520, height: 230, left: 52, right: 18, top: 34, bottom: 48 };
  const right = chart.width - chart.right;
  const bottom = chart.height - chart.bottom;
  const errors = candidates.map((candidate) => candidate.splitError);
  const minimum = Math.min(...errors);
  const maximum = Math.max(...errors);
  const yPadding = Math.max((maximum - minimum) * 0.12, 0.4);
  const x = (index: number) => chart.left + (index / Math.max(1, candidates.length - 1)) * (right - chart.left);
  const y = (value: number) => bottom - ((value - (minimum - yPadding)) / (maximum - minimum + yPadding * 2)) * (bottom - chart.top);
  const points = errors.map((error, index) => `${x(index)},${y(error)}`).join(" ");
  const bestIndex = candidates.indexOf(best);
  const current = candidates[selectedIndex];

  return (
    <svg
      className={styles.errorTrace}
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      role="img"
      aria-label={pt ? `Erro da divisão para cada limiar de ${localized.label.toLowerCase()}. O mínimo é ${format(best.splitError, 3)} em ${format(best.threshold)} ${feature.unit}.` : `Split error for every ${feature.label.toLowerCase()} threshold. The minimum is ${format(best.splitError, 3)} at ${format(best.threshold)} ${feature.unit}.`}
    >
      <text className={styles.traceHeading} x={chart.left} y="16">{pt ? "Erro da divisão · menor é melhor" : "Split error · lower is better"}</text>
      <line className={styles.axis} x1={chart.left} x2={right} y1={bottom} y2={bottom} />
      <polyline className={styles.traceLine} points={points} />
      {candidates.map((candidate, index) => (
        <g className={index === selectedIndex ? styles.currentTracePoint : styles.tracePoint} key={candidate.threshold}>
          <circle cx={x(index)} cy={y(candidate.splitError)} r={index === selectedIndex ? 5 : 3.5} />
          <text x={x(index)} y={bottom + 18} textAnchor="middle">{format(candidate.threshold)}</text>
        </g>
      ))}
      <g className={styles.bestTracePoint}>
        <circle cx={x(bestIndex)} cy={y(best.splitError)} r="8" />
        <text x={x(bestIndex)} y={y(best.splitError) - 13} textAnchor="middle">{pt ? "melhor" : "best"} · {format(best.splitError, 3)}</text>
      </g>
      <text className={styles.traceValue} x={right} y="16" textAnchor="end">
        {pt ? "atual" : "current"} · {format(current.splitError, 3)}
      </text>
      <text className={styles.axisLabel} x={(chart.left + right) / 2} y={chart.height - 7} textAnchor="middle">
        {localized.shortLabel} {pt ? "· limiar" : "threshold"} ({feature.unit})
      </text>
    </svg>
  );
}

function TreeView({ tree, locale = "en" }: { tree: RegressionTree; locale?: RegressionLocale }): ReactNode {
  const pt = locale === "pt-BR";
  if (tree.kind === "leaf") {
    return (
      <div className={styles.treeLeaf}>
        <span>{pt ? "folha" : "leaf"} · {tree.indices.length} {pt ? "linhas" : "rows"}</span>
        <strong>{pt ? "previsão" : "predict"} {format(tree.prediction)} {pt ? "t/ha" : "tons/ha"}</strong>
        <small>{tree.indices.map((index) => ROWS[index].id).join(" ")}</small>
      </div>
    );
  }

  const feature = localizedFeature(FEATURES[tree.candidate.featureIndex], locale);
  return (
    <div className={styles.treeBranch}>
      <div className={styles.treeQuestion}>
        <span>{pt ? "pergunta" : "question"}</span>
        <strong>{feature.label} ≤ {format(tree.candidate.threshold)} {feature.unit}?</strong>
      </div>
      <div className={styles.treeChildren}>
        <div>
          <span className={styles.edgeLabel}>{pt ? "sim" : "yes"} · ≤</span>
          <TreeView tree={tree.left} locale={locale} />
        </div>
        <div>
          <span className={styles.edgeLabel}>{pt ? "não" : "no"} · &gt;</span>
          <TreeView tree={tree.right} locale={locale} />
        </div>
      </div>
    </div>
  );
}

export function MultiFeatureRegressionPlayground({ locale = "en" }: { locale?: RegressionLocale }) {
  const pt = locale === "pt-BR";
  const [featureIndex, setFeatureIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const candidates = ROOT_CANDIDATES[featureIndex];
  const best = ROOT_BEST[featureIndex];
  const feature = FEATURES[featureIndex];
  const displayFeature = localizedFeature(feature, locale);
  const candidate = candidates[selectedIndex];
  const bestIndex = best ? candidates.indexOf(best) : 0;

  useEffect(() => {
    if (!playing) return undefined;
    if (selectedIndex >= candidates.length - 1) {
      setPlaying(false);
      setSelectedIndex(bestIndex);
      return undefined;
    }
    const timer = window.setTimeout(() => setSelectedIndex((index) => index + 1), 520);
    return () => window.clearTimeout(timer);
  }, [bestIndex, candidates.length, playing, selectedIndex]);

  const selectFeature = (index: number) => {
    setPlaying(false);
    setFeatureIndex(index);
    setSelectedIndex(0);
  };

  const runSweep = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSelectedIndex(bestIndex);
      return;
    }
    setSelectedIndex(0);
    setPlaying(true);
  };

  const routedLeft = useMemo(() => new Set(candidate.leftIndices), [candidate]);

  if (!best) return null;

  return (
    <section className={styles.workshop} aria-labelledby="multi-regression-title">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{pt ? "Experimento 3 · loop pelas características" : "Playground 3 · loop over features"}</p>
          <h2 id="multi-regression-title">{pt ? "Compare a melhor divisão de cada característica" : "Compare each feature's best split"}</h2>
        </div>
        <span className={styles.stepPill}>11 + 9 + 7 = {ROOT_CANDIDATE_COUNT} {pt ? "candidatas na raiz" : "root candidates"}</span>
      </header>

      <div className={styles.featureControls} role="group" aria-label={pt ? "Escolha uma característica" : "Choose a feature"}>
        {FEATURES.map((item, index) => {
          const featureBest = ROOT_BEST[index];
          return (
            <button
              type="button"
              aria-pressed={featureIndex === index}
              onClick={() => selectFeature(index)}
              key={item.key}
            >
              <strong>{localizedFeature(item, locale).label}</strong>
              <small>{pt ? "melhor erro" : "best error"} {featureBest ? format(featureBest.splitError, 3) : "—"}</small>
            </button>
          );
        })}
      </div>

      <div className={styles.datasetPanel}>
        <div className={styles.panelTitle}>{pt ? "Dados de treino · característica selecionada em destaque" : "Training data · selected feature highlighted"}</div>
        <div className={styles.tableWrap} role="region" aria-label={pt ? "Dados de treino da estufa" : "Greenhouse training data"} tabIndex={0}>
          <table className={styles.datasetTable}>
            <caption className={styles.srOnly}>Greenhouse measurements and crop yield for twelve training rows</caption>
            <thead>
              <tr>
                <th scope="col">{pt ? "Linha" : "Row"}</th>
                {FEATURES.map((item, index) => (
                  <th className={featureIndex === index ? styles.activeColumn : undefined} scope="col" key={item.key}>
                    {localizedFeature(item, locale).label} ({item.unit})
                  </th>
                ))}
                <th scope="col">{pt ? "Produtividade (t/ha)" : "Yield (tons/ha)"}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, rowIndex) => (
                <tr className={routedLeft.has(rowIndex) ? styles.leftRow : undefined} key={row.id}>
                  <th scope="row">{row.id}</th>
                  {FEATURES.map((item, index) => (
                    <td className={featureIndex === index ? styles.activeColumn : undefined} key={item.key}>
                      {format(featureValue(row, index))}
                    </td>
                  ))}
                  <td>{format(row.yield)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.thresholdControls}>
        <label>
          <span>{pt ? "Limiar" : "Threshold"}</span>
          <input
            type="range"
            min="0"
            max={candidates.length - 1}
            step="1"
            value={selectedIndex}
            aria-label={`${displayFeature.label} ${pt ? "· limiar" : "threshold"}`}
            aria-valuetext={pt ? `${displayFeature.shortLabel} menor ou igual a ${format(candidate.threshold)} ${feature.unit}; erro da divisão ${format(candidate.splitError, 3)}` : `${feature.shortLabel} at or below ${format(candidate.threshold)} ${feature.unit}; split error ${format(candidate.splitError, 3)}`}
            onChange={(event) => {
              setPlaying(false);
              setSelectedIndex(Number(event.target.value));
            }}
          />
          <strong>{displayFeature.shortLabel} ≤ {format(candidate.threshold)} {feature.unit} · {pt ? "erro da divisão" : "split error"} {format(candidate.splitError, 3)}</strong>
        </label>
        <div className={styles.controlButtons}>
          <button type="button" onClick={() => { setPlaying(false); setSelectedIndex(bestIndex); }}>{pt ? "Mostrar melhor divisão" : "Show best split"}</button>
          <button className={styles.primaryButton} type="button" onClick={runSweep}>{playing ? (pt ? "Pausar" : "Pause") : (pt ? "Executar esta varredura" : "Run this sweep")}</button>
        </div>
      </div>

      <p className={styles.prompt}>
        {pt ? "Busque cada ponto médio distinto de uma característica e mantenha sua divisão de menor erro. A raiz então escolhe o menor erro entre as três vencedoras." : "Search every distinct midpoint in one feature and keep its lowest-error split. The root then keeps the lowest of the three feature winners."}
      </p>

      <div className={styles.visualGrid}>
        <div className={styles.plotPanel}>
          <div className={styles.panelTitle}>{pt ? "Dados e previsões dos dois grupos" : "Data and two group predictions"}</div>
          <div className={styles.chartScroll} role="region" aria-label={`${displayFeature.label} ${pt ? "e produtividade" : "and crop-yield chart"}`} tabIndex={0}>
            <FeaturePlot featureIndex={featureIndex} candidate={candidate} locale={locale} />
          </div>
        </div>
        <div className={styles.tracePanel}>
          <div className={styles.panelTitle}>{pt ? "Erro da divisão por limiar" : "Split error by threshold"}</div>
          <div className={styles.chartScroll} role="region" aria-label={`${feature.label} split-error chart`} tabIndex={0}>
            <ErrorTrace candidates={candidates} selectedIndex={selectedIndex} best={best} feature={feature} locale={locale} />
          </div>
          <div className={styles.featureWinner}>
            <span>{pt ? "Melhor divisão para" : "Best split for"} {displayFeature.label.toLowerCase()}</span>
            <strong>{displayFeature.shortLabel} ≤ {format(best.threshold)} {feature.unit}</strong>
            <small>{pt ? "erro da divisão" : "split error"} {format(best.splitError, 3)}</small>
          </div>
        </div>
      </div>

      <div className={styles.finalTree}>
        <div className={styles.finalTreeHeader}>
          <div>
            <p className={styles.kicker}>{pt ? "A árvore de decisão final" : "The final decision tree"}</p>
            <h3>{pt ? "A vencedora muda dentro de cada grupo" : "The winner changes inside each group"}</h3>
          </div>
          <span>{pt ? "parar quando a melhoria" : "stop when improvement"} &lt; {format(MINIMUM_IMPROVEMENT)}</span>
        </div>
        <div className={styles.treeCanvas} style={{ "--tree-depth": 3 } as CSSProperties}>
          <TreeView tree={FINAL_TREE} locale={locale} />
        </div>
      </div>
    </section>
  );
}

export const multiFeatureRegressionSummary = {
  rootCandidates: ROOT_CANDIDATE_COUNT,
  bestRootFeature: ROOT_BEST.reduce((bestIndex, candidate, index) => {
    const best = ROOT_BEST[bestIndex];
    return !best || (candidate && candidate.splitError < best.splitError) ? index : bestIndex;
  }, 0),
  minimumImprovement: MINIMUM_IMPROVEMENT,
};
