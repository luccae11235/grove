import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import lessonJson from "./generated/firstSplitLesson.json";
import styles from "./DecisionTreeWorkshop.module.css";

type Criterion = "gini" | "entropy";
type Direction = "left" | "right";
export type WorkshopLocale = "en" | "pt-BR";

interface DistributionItem {
  label: string | number;
  count: number;
  probability: number;
}

interface LeafNode {
  kind: "leaf";
  id: string;
  depth: number;
  prediction: string | number;
  impurity: number;
  sampleCount: number;
  sampleIndices: number[];
  distribution: DistributionItem[];
  stopReason: string;
}

interface SplitNode {
  kind: "split";
  id: string;
  depth: number;
  featureIndex: number;
  featureName: string;
  threshold: number;
  missingDirection: Direction;
  prediction: string | number;
  impurity: number;
  gain: number;
  sampleCount: number;
  sampleIndices: number[];
  distribution: DistributionItem[];
  left: TreeNode;
  right: TreeNode;
}

type TreeNode = LeafNode | SplitNode;

interface SplitCandidate {
  nodeId: string;
  depth: number;
  featureIndex: number;
  featureName: string;
  threshold: number;
  parentImpurity: number;
  leftImpurity: number;
  rightImpurity: number;
  weightedImpurity: number;
  gain: number;
  missingDirection: Direction;
  missingIndices: number[];
  leftIndices: number[];
  rightIndices: number[];
}

interface TraceEvent {
  type: string;
  step: number;
  nodeId?: string;
  candidate?: SplitCandidate;
}

interface FeatureImportance {
  featureIndex: number;
  featureName: string;
  rawImportance: number;
  importance: number;
}

interface ImportanceContribution {
  nodeId: string;
  depth: number;
  featureIndex: number;
  featureName: string;
  gain: number;
  sampleFraction: number;
  weightedContribution: number;
}

interface LessonResult {
  model: TreeNode;
  bestSplit: SplitCandidate | null;
  featureImportances: FeatureImportance[];
  importanceContributions: ImportanceContribution[];
  trace: { events: TraceEvent[] };
}

interface Dataset {
  rowIds: string[];
  features: Array<Array<number | null>>;
  targets: string[];
  featureNames: string[];
}

interface ComplexityDataset {
  id: string;
  dataset: Dataset;
  scenario: LessonResult;
}

interface LessonData {
  dataset: Dataset;
  scenarios: Record<Criterion, LessonResult>;
  missingDataset: Dataset;
  missingScenario: LessonResult;
  multiFeatureDataset: Dataset;
  multiFeatureScenario: LessonResult;
  complexityDatasets: ComplexityDataset[];
  source: string;
  sourcePath: string;
}

const lessonData = lessonJson as unknown as LessonData;
const THRIVING = "Thriving";

function isPortuguese(locale: WorkshopLocale): boolean {
  return locale === "pt-BR";
}

function featureLabel(name: string, locale: WorkshopLocale, short = false): string {
  if (!isPortuguese(locale)) return short ? name.replace(" per week (L)", " / week") : name;
  if (name.startsWith("Sunlight")) return "Luz solar por dia (h)";
  if (name.startsWith("Water")) return short ? "Água / semana" : "Água por semana (L)";
  if (name.startsWith("Temperature")) return "Temperatura (°C)";
  return name;
}

function outcomeLabel(label: string, locale: WorkshopLocale): string {
  if (!isPortuguese(locale)) return label;
  if (label === THRIVING) return "Saudável";
  if (label === "Struggling") return "Com dificuldade";
  return label;
}

function format(value: number, digits = 3, locale: WorkshopLocale = "en"): string {
  const formatted = value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
  return isPortuguese(locale) ? formatted.replace(".", ",") : formatted;
}

function countWord(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function outcomeMark(label: string): string {
  return label === THRIVING ? "○" : "□";
}

function countLabels(dataset: Dataset, indices: number[]) {
  return indices.reduce(
    (counts, index) => {
      if (dataset.targets[index] === THRIVING) counts.thriving += 1;
      else counts.struggling += 1;
      return counts;
    },
    { thriving: 0, struggling: 0 },
  );
}

function countBinaryLabels(dataset: Dataset, indices: number[], classA: string) {
  return indices.reduce(
    (counts, index) => {
      if (dataset.targets[index] === classA) counts.thriving += 1;
      else counts.struggling += 1;
      return counts;
    },
    { thriving: 0, struggling: 0 },
  );
}

function rootCandidates(result: LessonResult, featureIndex?: number): SplitCandidate[] {
  return result.trace.events.flatMap((event) =>
    event.type === "candidate_evaluated" &&
    event.nodeId === "root" &&
    event.candidate &&
    (featureIndex === undefined || event.candidate.featureIndex === featureIndex)
      ? [event.candidate]
      : [],
  );
}

function selectedSplits(result: LessonResult): SplitCandidate[] {
  return result.trace.events.flatMap((event) =>
    event.type === "split_selected" && event.candidate ? [event.candidate] : [],
  );
}

function CandidateTable({
  dataset,
  activeFeature,
  candidate,
  activeIndices,
  highlightMatchingRows = false,
  describeRoutes = false,
  hoveredIndex = null,
  onHoverIndex,
  locale = "en",
}: {
  dataset: Dataset;
  activeFeature: number;
  candidate: SplitCandidate | null;
  activeIndices?: number[];
  highlightMatchingRows?: boolean;
  describeRoutes?: boolean;
  hoveredIndex?: number | null;
  onHoverIndex?: (index: number | null) => void;
  locale?: WorkshopLocale;
}) {
  const activeSet = new Set(activeIndices ?? dataset.rowIds.map((_, index) => index));
  return (
    <div className={styles.tableWrap}>
      <table className={styles.datasetTable}>
        <caption className={styles.srOnly}>{isPortuguese(locale) ? "Dados de treino das sementes e rotas da divisão candidata atual" : "Seedling training data and current candidate routes"}</caption>
        <thead>
          <tr>
            <th scope="col">ID</th>
            {dataset.featureNames.map((name, index) => (
              <th className={index === activeFeature ? styles.activeColumn : undefined} scope="col" key={name}>
                {featureLabel(name, locale, true)}
              </th>
            ))}
            <th scope="col">{isPortuguese(locale) ? "Classe" : "Class"}</th>
            {candidate && <th scope="col">{isPortuguese(locale) ? "Rota" : "Route"}</th>}
          </tr>
        </thead>
        <tbody>
          {dataset.features.map((row, rowIndex) => {
            const isActive = activeSet.has(rowIndex);
            const matchesRule = candidate?.leftIndices.includes(rowIndex) ?? false;
            const route = matchesRule
              ? "L"
              : candidate?.rightIndices.includes(rowIndex)
                ? "R"
                : "–";
            const rowClassName = [
              !isActive ? styles.inactiveRow : undefined,
              isActive && highlightMatchingRows && matchesRule ? styles.matchingRow : undefined,
              hoveredIndex === rowIndex ? styles.linkedRow : undefined,
            ].filter(Boolean).join(" ");
            return (
              <tr
                className={rowClassName || undefined}
                key={dataset.rowIds[rowIndex]}
                tabIndex={onHoverIndex ? 0 : undefined}
                onMouseEnter={() => onHoverIndex?.(rowIndex)}
                onMouseLeave={() => onHoverIndex?.(null)}
                onFocus={() => onHoverIndex?.(rowIndex)}
                onBlur={() => onHoverIndex?.(null)}
                onClick={() => onHoverIndex?.(rowIndex)}
              >
                <th scope="row">{dataset.rowIds[rowIndex]}</th>
                {row.map((value, featureIndex) => (
                  <td className={featureIndex === activeFeature ? styles.activeColumn : undefined} key={featureIndex}>
                    {value === null ? <span className={styles.missingValue}>?</span> : format(value, 2, locale)}
                  </td>
                ))}
                <td>
                  <span
                    aria-label={outcomeLabel(dataset.targets[rowIndex], locale)}
                    className={dataset.targets[rowIndex] === THRIVING ? styles.thrivingLabel : styles.strugglingLabel}
                  >
                    <i aria-hidden="true">{outcomeMark(dataset.targets[rowIndex])}</i>{" "}
                    <b aria-hidden="true">{outcomeLabel(dataset.targets[rowIndex], locale)}</b>
                  </span>
                </td>
                {candidate && (
                  <td>
                    <span className={route === "L" ? styles.leftRoute : route === "R" ? styles.rightRoute : styles.noRoute}>
                      {describeRoutes ? (
                        route === "L" ? <><span>{isPortuguese(locale) ? "SIM" : "YES"}</span><i className={styles.routeDetail}> · ≤</i></> :
                          route === "R" ? <><span>{isPortuguese(locale) ? "NÃO" : "NO"}</span><i className={styles.routeDetail}> · &gt;</i></> : "–"
                      ) : route}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const SOURCE_PLOT = {
  width: 560,
  height: 340,
  left: 58,
  right: 536,
  top: 24,
  bottom: 292,
};

function sourceX(value: number): number {
  return SOURCE_PLOT.left + ((value - 0.5) / 6) * (SOURCE_PLOT.right - SOURCE_PLOT.left);
}

function sourceY(value: number): number {
  return SOURCE_PLOT.bottom - ((value - 1) / 3.6) * (SOURCE_PLOT.bottom - SOURCE_PLOT.top);
}

function CandidatePlot({
  dataset,
  candidate,
  candidates,
  onCandidateChange,
  hoveredIndex,
  onHoverIndex,
  locale = "en",
}: {
  dataset: Dataset;
  candidate: SplitCandidate;
  candidates?: SplitCandidate[];
  onCandidateChange?: (index: number) => void;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  locale?: WorkshopLocale;
}) {
  const vertical = candidate.featureIndex === 0;
  const thresholdX = sourceX(candidate.threshold);
  const thresholdY = sourceY(candidate.threshold);
  const thresholdLabel = featureLabel(candidate.featureName, locale, true);
  const interactive = Boolean(candidates?.length && onCandidateChange);

  const candidateIndexFromPointer = (event: PointerEvent<SVGSVGElement>): number => {
    if (!candidates?.length) return 0;
    const bounds = event.currentTarget.getBoundingClientRect();
    const plotCoordinate = vertical
      ? ((event.clientX - bounds.left) / bounds.width) * SOURCE_PLOT.width
      : ((event.clientY - bounds.top) / bounds.height) * SOURCE_PLOT.height;
    const value = vertical
      ? 0.5 + ((plotCoordinate - SOURCE_PLOT.left) / (SOURCE_PLOT.right - SOURCE_PLOT.left)) * 6
      : 1 + ((SOURCE_PLOT.bottom - plotCoordinate) / (SOURCE_PLOT.bottom - SOURCE_PLOT.top)) * 3.6;
    return candidates.reduce(
      (nearest, item, index) =>
        Math.abs(item.threshold - value) < Math.abs(candidates[nearest].threshold - value)
          ? index
          : nearest,
      0,
    );
  };

  const moveFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    onCandidateChange?.(candidateIndexFromPointer(event));
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!interactive || !candidates?.length) return;
    const currentIndex = Math.max(0, candidates.findIndex((item) => item.threshold === candidate.threshold));
    const previousKey = vertical ? "ArrowLeft" : "ArrowDown";
    const nextKey = vertical ? "ArrowRight" : "ArrowUp";
    if (![previousKey, nextKey, "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") onCandidateChange?.(0);
    else if (event.key === "End") onCandidateChange?.(candidates.length - 1);
    else onCandidateChange?.(Math.max(0, Math.min(candidates.length - 1, currentIndex + (event.key === nextKey ? 1 : -1))));
  };

  return (
    <div className={styles.candidatePlotWrap}>
      <svg
        className={`${styles.candidatePlot} ${interactive ? styles.interactivePlot : ""}`}
        viewBox={`0 0 ${SOURCE_PLOT.width} ${SOURCE_PLOT.height}`}
        role="img"
        aria-labelledby="candidate-plot-title candidate-plot-description"
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          if (!interactive) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          moveFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) moveFromPointer(event);
        }}
        onPointerUp={(event) => {
          if (!interactive) return;
          moveFromPointer(event);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <title id="candidate-plot-title">{isPortuguese(locale) ? "As dez sementes e a linha divisória atual" : "The ten seeds and the current dividing line"}</title>
        <desc id="candidate-plot-description">
          {isPortuguese(locale) ? "Os círculos representam sementes saudáveis; os quadrados, sementes com dificuldade. A linha se move quando o limiar selecionado muda." : "Circles are thriving seeds and squares are struggling seeds. The line moves when the selected threshold changes."}
        </desc>

        <rect
          className={styles.plotYesRegion}
          x={SOURCE_PLOT.left}
          y={vertical ? SOURCE_PLOT.top : thresholdY}
          width={vertical ? thresholdX - SOURCE_PLOT.left : SOURCE_PLOT.right - SOURCE_PLOT.left}
          height={vertical ? SOURCE_PLOT.bottom - SOURCE_PLOT.top : SOURCE_PLOT.bottom - thresholdY}
        />
        <rect
          className={styles.plotNoRegion}
          x={vertical ? thresholdX : SOURCE_PLOT.left}
          y={SOURCE_PLOT.top}
          width={vertical ? SOURCE_PLOT.right - thresholdX : SOURCE_PLOT.right - SOURCE_PLOT.left}
          height={vertical ? SOURCE_PLOT.bottom - SOURCE_PLOT.top : thresholdY - SOURCE_PLOT.top}
        />

        {[1, 2, 3, 4, 5, 6].map((tick) => (
          <g key={`x-${tick}`}>
            <line className={styles.plotGridline} x1={sourceX(tick)} x2={sourceX(tick)} y1={SOURCE_PLOT.top} y2={SOURCE_PLOT.bottom} />
            <text className={styles.plotTick} x={sourceX(tick)} y="311" textAnchor="middle">{tick}</text>
          </g>
        ))}
        {[1, 2, 3, 4].map((tick) => (
          <g key={`y-${tick}`}>
            <line className={styles.plotGridline} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.right} y1={sourceY(tick)} y2={sourceY(tick)} />
            <text className={styles.plotTick} x="46" y={sourceY(tick) + 4} textAnchor="end">{tick}</text>
          </g>
        ))}
        <line className={styles.plotAxis} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.right} y1={SOURCE_PLOT.bottom} y2={SOURCE_PLOT.bottom} />
        <line className={styles.plotAxis} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.left} y1={SOURCE_PLOT.top} y2={SOURCE_PLOT.bottom} />
        <line
          className={styles.dynamicThreshold}
          x1={vertical ? thresholdX : SOURCE_PLOT.left}
          x2={vertical ? thresholdX : SOURCE_PLOT.right}
          y1={vertical ? SOURCE_PLOT.top : thresholdY}
          y2={vertical ? SOURCE_PLOT.bottom : thresholdY}
        />
        <text
          className={styles.dynamicThresholdLabel}
          x={vertical ? Math.min(thresholdX + 7, 425) : SOURCE_PLOT.left + 8}
          y={vertical ? 42 : Math.max(thresholdY - 8, 18)}
        >
          {thresholdLabel} = {format(candidate.threshold, 3, locale)}
        </text>

        {dataset.features.map((row, rowIndex) => {
          const x = sourceX(Number(row[0]));
          const y = sourceY(Number(row[1]));
          const thriving = dataset.targets[rowIndex] === THRIVING;
          const linked = hoveredIndex === rowIndex;
          return (
            <g
              className={`${styles.candidatePoint} ${thriving ? styles.candidatePointThriving : styles.candidatePointStruggling} ${linked ? styles.linkedPoint : ""}`}
              key={dataset.rowIds[rowIndex]}
              role="button"
              tabIndex={0}
              aria-label={isPortuguese(locale) ? `Semente ${dataset.rowIds[rowIndex]}, ${outcomeLabel(dataset.targets[rowIndex], locale)}, ${format(Number(row[0]), 1, locale)} horas de luz solar, ${format(Number(row[1]), 1, locale)} litros de água` : `Seed ${dataset.rowIds[rowIndex]}, ${dataset.targets[rowIndex]}, ${format(Number(row[0]), 1)} sunlight hours, ${format(Number(row[1]), 1)} liters of water`}
              onMouseEnter={() => onHoverIndex(rowIndex)}
              onMouseLeave={() => onHoverIndex(null)}
              onFocus={() => onHoverIndex(rowIndex)}
              onBlur={() => onHoverIndex(null)}
              onClick={() => onHoverIndex(rowIndex)}
            >
              <title>{isPortuguese(locale) ? `Semente ${dataset.rowIds[rowIndex]} · ${outcomeLabel(dataset.targets[rowIndex], locale)} · ${format(Number(row[0]), 1, locale)} h de sol · ${format(Number(row[1]), 1, locale)} L de água` : `Seed ${dataset.rowIds[rowIndex]} · ${dataset.targets[rowIndex]} · ${format(Number(row[0]), 1)} h sunlight · ${format(Number(row[1]), 1)} L water`}</title>
              {thriving
                ? <circle cx={x} cy={y} r="8" />
                : <rect x={x - 7} y={y - 7} width="14" height="14" rx="1" />}
              <text x={x + 11} y={y - 10}>{dataset.rowIds[rowIndex]}</text>
            </g>
          );
        })}

        <text className={styles.plotAxisLabel} x={(SOURCE_PLOT.left + SOURCE_PLOT.right) / 2} y="333" textAnchor="middle">{isPortuguese(locale) ? "horas de luz solar por dia" : "sunlight hours per day"}</text>
        <text className={styles.plotAxisLabel} x="13" y={(SOURCE_PLOT.top + SOURCE_PLOT.bottom) / 2} textAnchor="middle" transform={`rotate(-90 13 ${(SOURCE_PLOT.top + SOURCE_PLOT.bottom) / 2})`}>{isPortuguese(locale) ? "água por semana (L)" : "water per week (L)"}</text>
      </svg>
    </div>
  );
}

function SplitRouteDiagram({
  dataset,
  candidate,
  hoveredIndex,
  onHoverIndex,
  locale = "en",
}: {
  dataset: Dataset;
  candidate: SplitCandidate;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  locale?: WorkshopLocale;
}) {
  const leftCounts = countLabels(dataset, candidate.leftIndices);
  const rightCounts = countLabels(dataset, candidate.rightIndices);
  const shortFeature = featureLabel(candidate.featureName, locale, true);
  const leftSeedWord = isPortuguese(locale) ? (candidate.leftIndices.length === 1 ? "semente" : "sementes") : (candidate.leftIndices.length === 1 ? "seed" : "seeds");
  const rightSeedWord = isPortuguese(locale) ? (candidate.rightIndices.length === 1 ? "semente" : "sementes") : (candidate.rightIndices.length === 1 ? "seed" : "seeds");

  return (
    <div className={styles.routeDiagramWrap}>
      <svg className={styles.routeDiagram} viewBox="0 0 460 310" aria-labelledby="route-title route-description">
        <title id="route-title">{isPortuguese(locale) ? "A pergunta atual encaminhando todas as dez sementes" : "The current question routing all ten seeds"}</title>
        <desc id="route-description">
          {isPortuguese(locale) ? "As sementes que satisfazem a pergunta seguem pelo ramo sim. As demais seguem pelo ramo não." : "Seeds satisfying the question move to the yes branch. The remaining seeds move to the no branch."}
        </desc>

        <path className={styles.routeBranchLine} d="M230 78 L118 129" />
        <path className={styles.routeBranchLine} d="M230 78 L342 129" />
        <rect className={styles.routeGroup} x="24" y="122" width="188" height="170" rx="13" />
        <rect className={styles.routeGroup} x="248" y="122" width="188" height="170" rx="13" />

        <g className={styles.routeQuestionNode}>
          <rect x="112" y="18" width="236" height="60" rx="11" />
          <text x="230" y="43" textAnchor="middle">{shortFeature} ≤ {format(candidate.threshold, 3, locale)}?</text>
          <text className={styles.routeNodeHint} x="230" y="62" textAnchor="middle">{isPortuguese(locale) ? "Todas as sementes respondem a esta pergunta" : "Every seed answers this question"}</text>
        </g>

        <text className={styles.routeGroupLabel} x="42" y="148">{isPortuguese(locale) ? "SIM" : "YES"} · {candidate.leftIndices.length} {leftSeedWord}</text>
        <text className={styles.routeGroupCounts} x="42" y="166">○ {leftCounts.thriving} {isPortuguese(locale) ? countWord(leftCounts.thriving, "saudável", "saudáveis") : "thriving"} · □ {leftCounts.struggling} {isPortuguese(locale) ? "com dificuldade" : "struggling"}</text>
        <text className={styles.routeGroupLabel} x="266" y="148">{isPortuguese(locale) ? "NÃO" : "NO"} · {candidate.rightIndices.length} {rightSeedWord}</text>
        <text className={styles.routeGroupCounts} x="266" y="166">○ {rightCounts.thriving} {isPortuguese(locale) ? countWord(rightCounts.thriving, "saudável", "saudáveis") : "thriving"} · □ {rightCounts.struggling} {isPortuguese(locale) ? "com dificuldade" : "struggling"}</text>

        {dataset.features.map((row, rowIndex) => {
          const goesLeft = candidate.leftIndices.includes(rowIndex);
          const branchIndices = goesLeft ? candidate.leftIndices : candidate.rightIndices;
          const rank = branchIndices.indexOf(rowIndex);
          const x = (goesLeft ? 58 : 282) + (rank % 4) * 39;
          const y = 205 + Math.floor(rank / 4) * 43;
          const thriving = dataset.targets[rowIndex] === THRIVING;
          const linked = hoveredIndex === rowIndex;
          const dotStyle = {
            "--route-x": `${x}px`,
            "--route-y": `${y}px`,
          } as CSSProperties;
          return (
            <g
              className={`${styles.routeDot} ${thriving ? styles.routeDotThriving : styles.routeDotStruggling} ${linked ? styles.linkedRouteDot : ""}`}
              style={dotStyle}
              key={dataset.rowIds[rowIndex]}
              role="button"
              tabIndex={0}
              aria-label={isPortuguese(locale) ? `Semente ${dataset.rowIds[rowIndex]}, ${outcomeLabel(dataset.targets[rowIndex], locale)}, encaminhada para ${goesLeft ? "sim" : "não"}` : `Seed ${dataset.rowIds[rowIndex]}, ${dataset.targets[rowIndex]}, routed ${goesLeft ? "yes" : "no"}`}
              onMouseEnter={() => onHoverIndex(rowIndex)}
              onMouseLeave={() => onHoverIndex(null)}
              onFocus={() => onHoverIndex(rowIndex)}
              onBlur={() => onHoverIndex(null)}
              onClick={() => onHoverIndex(rowIndex)}
            >
              {thriving ? <circle r="10" /> : <rect x="-9" y="-9" width="18" height="18" rx="2" />}
              <text className={styles.routeDotId} y="4" textAnchor="middle">{dataset.rowIds[rowIndex]}</text>
              <g className={styles.routeTooltip}>
                <rect x="-58" y="-49" width="116" height="34" rx="6" />
                <text x="0" y="-35" textAnchor="middle">{isPortuguese(locale) ? "Semente" : "Seed"} {dataset.rowIds[rowIndex]} · {outcomeLabel(dataset.targets[rowIndex], locale)}</text>
                <text x="0" y="-23" textAnchor="middle">{format(Number(row[0]), 1, locale)} h {isPortuguese(locale) ? "de sol" : "sun"} · {format(Number(row[1]), 1, locale)} L {isPortuguese(locale) ? "de água" : "water"}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <p className={styles.routeHint}>{isPortuguese(locale) ? "Passe o cursor ou mova o foco para uma semente e encontre a mesma linha ou o mesmo ponto à esquerda." : "Hover or focus a seed to find the same row or point on the left."}</p>
      <p className={styles.srOnly} aria-live="polite">
        {isPortuguese(locale) ? `O ramo sim contém ${candidate.leftIndices.length} sementes: ${leftCounts.thriving} saudáveis e ${leftCounts.struggling} com dificuldade. O ramo não contém ${candidate.rightIndices.length} sementes: ${rightCounts.thriving} saudáveis e ${rightCounts.struggling} com dificuldade.` : `The yes branch contains ${candidate.leftIndices.length} seeds: ${leftCounts.thriving} thriving and ${leftCounts.struggling} struggling. The no branch contains ${candidate.rightIndices.length} seeds: ${rightCounts.thriving} thriving and ${rightCounts.struggling} struggling.`}
      </p>
    </div>
  );
}

function MetricCards({ candidate, criterion, locale = "en" }: { candidate: SplitCandidate; criterion: Criterion; locale?: WorkshopLocale }) {
  const label = criterion === "gini" ? "Gini" : "Entropy";
  return (
    <div className={styles.metricCards}>
      <div>
        <span>{isPortuguese(locale) ? `Gini do grupo pai` : `Parent ${label}`}</span>
        <strong>{format(candidate.parentImpurity, 3, locale)}</strong>
      </div>
      <div>
        <span>{isPortuguese(locale) ? "Filhos ponderados" : "Weighted children"}</span>
        <strong>{format(candidate.weightedImpurity, 3, locale)}</strong>
      </div>
      <div className={styles.gainMetric}>
        <span>{isPortuguese(locale) ? "Ganho" : "Gain"}</span>
        <strong>{format(candidate.gain, 3, locale)}</strong>
      </div>
    </div>
  );
}

export function ThresholdIntuitionPlayground({ locale = "en" }: { locale?: WorkshopLocale }) {
  const result = lessonData.scenarios.gini;
  const [featureIndex, setFeatureIndex] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(2);
  const [revealed, setRevealed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const candidates = useMemo(
    () => rootCandidates(result, featureIndex),
    [featureIndex, result],
  );
  const best = result.bestSplit;
  const candidate = revealed ? best : candidates[Math.min(candidateIndex, candidates.length - 1)] ?? null;
  const bestLeftCounts = best ? countLabels(lessonData.dataset, best.leftIndices) : null;
  const bestRightCounts = best ? countLabels(lessonData.dataset, best.rightIndices) : null;

  const chooseFeature = (index: number) => {
    setFeatureIndex(index);
    const featureCandidates = rootCandidates(result, index);
    setCandidateIndex(Math.max(0, Math.floor((featureCandidates.length - 1) / 2)));
    setRevealed(false);
    setHoveredIndex(null);
  };

  if (!candidate || !best) return null;

  return (
    <section className={styles.workshop} aria-labelledby="threshold-intuition-title">
      <header className={styles.workshopHeader}>
        <div>
          <p className={styles.kicker}>{isPortuguese(locale) ? "Experimento 1 · use os olhos" : "Playground 1 · use your eyes"}</p>
          <h2 id="threshold-intuition-title">{isPortuguese(locale) ? "Onde você traçaria a linha divisória?" : "Where would you draw the dividing line?"}</h2>
        </div>
        <span className={styles.stepPill}>{isPortuguese(locale) ? "Ainda sem fórmula" : "No formula yet"}</span>
      </header>

      <div className={styles.controlStrip}>
        <div>
          <span className={styles.controlLabel}>{isPortuguese(locale) ? "1 · Escolha o que observar" : "1 · Choose what to inspect"}</span>
          <div className={styles.featureButtons}>
            {lessonData.dataset.featureNames.map((name, index) => (
              <button type="button" aria-pressed={featureIndex === index} onClick={() => chooseFeature(index)} key={name}>
                {featureLabel(name, locale)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={styles.controlLabel}>{isPortuguese(locale) ? "2 · Arraste ou clique no gráfico" : "2 · Drag or click in the graph"}</span>
          <div className={styles.lineNudges}>
            <button
              type="button"
              aria-label={isPortuguese(locale) ? "Mover a linha para o limiar anterior" : "Move line to the previous threshold"}
              disabled={candidateIndex <= 0}
              onClick={() => { setCandidateIndex((value) => Math.max(0, value - 1)); setRevealed(false); }}
            >
              {featureIndex === 0 ? "←" : "↓"}
            </button>
            <strong>{featureLabel(candidate.featureName, locale)} ≤ {format(candidate.threshold, 3, locale)}?</strong>
            <button
              type="button"
              aria-label={isPortuguese(locale) ? "Mover a linha para o próximo limiar" : "Move line to the next threshold"}
              disabled={candidateIndex >= candidates.length - 1}
              onClick={() => { setCandidateIndex((value) => Math.min(candidates.length - 1, value + 1)); setRevealed(false); }}
            >
              {featureIndex === 0 ? "→" : "↑"}
            </button>
          </div>
          <small className={styles.startingGuess}>
            {isPortuguese(locale)
              ? "Esta é apenas uma posição inicial. Mova a linha antes de revelar a resposta."
              : "This is only a starting position. Move the line before revealing the answer."}
          </small>
        </div>
      </div>

      <div className={styles.splitGrid}>
        <div>
          <div className={styles.panelTitle}>{isPortuguese(locale) ? "As mesmas dez sementes · mova a pergunta diretamente" : "The same ten seeds · move the question directly"}</div>
          <CandidatePlot
            dataset={lessonData.dataset}
            candidate={candidate}
            candidates={candidates}
            onCandidateChange={(index) => { setCandidateIndex(index); setRevealed(false); setHoveredIndex(null); }}
            hoveredIndex={hoveredIndex}
            onHoverIndex={setHoveredIndex}
            locale={locale}
          />
        </div>
        <div className={styles.splitOutcomePanel}>
          <div className={styles.panelTitle}>{isPortuguese(locale) ? "O que a sua linha cria" : "What your line creates"}</div>
          <SplitRouteDiagram
            dataset={lessonData.dataset}
            candidate={candidate}
            hoveredIndex={hoveredIndex}
            onHoverIndex={setHoveredIndex}
            locale={locale}
          />
          <div className={styles.intuitionPrompt}>
            <strong>{isPortuguese(locale) ? "Use apenas os olhos:" : "Use only your eyes:"}</strong>
            <span>{isPortuguese(locale) ? "Agora, os resultados de cada lado parecem mais semelhantes entre si do que na tabela original?" : "Does each side now contain outcomes that look more alike than the original table?"}</span>
          </div>
          <button className={styles.primaryButton} type="button" onClick={() => { setFeatureIndex(best.featureIndex); setRevealed(true); }}>
            {isPortuguese(locale) ? "Revelar a primeira divisão mais clara" : "Reveal the clearest first division"}
          </button>
          {revealed && (
            <p className={styles.feedback}>
              {isPortuguese(locale) ? <>Depois de verificar todas as posições possíveis, <strong>{featureLabel(best.featureName, locale)} ≤ {format(best.threshold, 3, locale)}</strong>{" "}cria a primeira divisão mais clara: o lado sim tem {bestLeftCounts?.thriving} sementes saudáveis e {bestLeftCounts?.struggling} com dificuldade; o lado não tem {bestRightCounts?.thriving} saudáveis e {bestRightCounts?.struggling} com dificuldade. Em breve, transformaremos “mais clara” em um número.</> : <>After checking every possible position, <strong>{best.featureName} ≤ {format(best.threshold)}</strong>{" "}creates the clearest first division: the yes side has {bestLeftCounts?.thriving} thriving and {bestLeftCounts?.struggling} struggling seeds; the no side has {bestRightCounts?.thriving} thriving and {bestRightCounts?.struggling} struggling seeds. Soon we will turn “clearest” into a number.</>}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

interface ManualBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface ManualLeaf {
  kind: "leaf";
  id: string;
  sampleIndices: number[];
}

interface ManualSplit {
  kind: "split";
  id: string;
  featureIndex: number;
  threshold: number;
  sampleIndices: number[];
  left: ManualNode;
  right: ManualNode;
}

type ManualNode = ManualLeaf | ManualSplit;

interface ManualRegion {
  node: ManualLeaf;
  bounds: ManualBounds;
}

interface ManualPartition {
  node: ManualSplit;
  bounds: ManualBounds;
}

const MANUAL_PLOT_BOUNDS: ManualBounds = {
  xMin: 0.5,
  xMax: 6.5,
  yMin: 1,
  yMax: 4.6,
};

function createManualRoot(): ManualLeaf {
  return {
    kind: "leaf",
    id: "root",
    sampleIndices: lessonData.dataset.rowIds.map((_, index) => index),
  };
}

function createGuidedManualTree(): ManualSplit {
  const allIndices = lessonData.dataset.rowIds.map((_, index) => index);
  const rootLeft = allIndices.filter(
    (index) => Number(lessonData.dataset.features[index][0]) <= 3.5,
  );
  const rootRight = allIndices.filter((index) => !rootLeft.includes(index));
  const leftLeft = rootLeft.filter(
    (index) => Number(lessonData.dataset.features[index][1]) <= 3.1,
  );
  const leftRight = rootLeft.filter((index) => !leftLeft.includes(index));
  return {
    kind: "split",
    id: "root",
    featureIndex: 0,
    threshold: 3.5,
    sampleIndices: allIndices,
    left: {
      kind: "split",
      id: "root-yes",
      featureIndex: 1,
      threshold: 3.1,
      sampleIndices: rootLeft,
      left: { kind: "leaf", id: "root-yes-yes", sampleIndices: leftLeft },
      right: { kind: "leaf", id: "root-yes-no", sampleIndices: leftRight },
    },
    right: { kind: "leaf", id: "root-no", sampleIndices: rootRight },
  };
}

function splitBounds(bounds: ManualBounds, featureIndex: number, threshold: number): [ManualBounds, ManualBounds] {
  if (featureIndex === 0) {
    return [
      { ...bounds, xMax: threshold },
      { ...bounds, xMin: threshold },
    ];
  }
  return [
    { ...bounds, yMax: threshold },
    { ...bounds, yMin: threshold },
  ];
}

function collectManualRegions(
  node: ManualNode,
  bounds: ManualBounds = MANUAL_PLOT_BOUNDS,
  regions: ManualRegion[] = [],
): ManualRegion[] {
  if (node.kind === "leaf") {
    regions.push({ node, bounds });
    return regions;
  }
  const [leftBounds, rightBounds] = splitBounds(bounds, node.featureIndex, node.threshold);
  collectManualRegions(node.left, leftBounds, regions);
  collectManualRegions(node.right, rightBounds, regions);
  return regions;
}

function collectManualPartitions(
  node: ManualNode,
  bounds: ManualBounds = MANUAL_PLOT_BOUNDS,
  partitions: ManualPartition[] = [],
): ManualPartition[] {
  if (node.kind === "leaf") return partitions;
  partitions.push({ node, bounds });
  const [leftBounds, rightBounds] = splitBounds(bounds, node.featureIndex, node.threshold);
  collectManualPartitions(node.left, leftBounds, partitions);
  collectManualPartitions(node.right, rightBounds, partitions);
  return partitions;
}

function replaceManualLeaf(node: ManualNode, leafId: string, replacement: ManualNode): ManualNode {
  if (node.id === leafId) return replacement;
  if (node.kind === "leaf") return node;
  return {
    ...node,
    left: replaceManualLeaf(node.left, leafId, replacement),
    right: replaceManualLeaf(node.right, leafId, replacement),
  };
}

function localThresholds(indices: number[], featureIndex: number): number[] {
  const values = Array.from(new Set(indices.map((index) => Number(lessonData.dataset.features[index][featureIndex]))))
    .sort((left, right) => left - right);
  return values.slice(0, -1).map((value, index) => (value + values[index + 1]) / 2);
}

function pureManualRegion(indices: number[]): boolean {
  return new Set(indices.map((index) => lessonData.dataset.targets[index])).size <= 1;
}

function manualSplitCount(node: ManualNode): number {
  return node.kind === "leaf" ? 0 : 1 + manualSplitCount(node.left) + manualSplitCount(node.right);
}

function manualLeafCount(node: ManualNode): number {
  return node.kind === "leaf" ? 1 : manualLeafCount(node.left) + manualLeafCount(node.right);
}

function nearestThresholdIndex(thresholds: number[], value: number): number {
  return thresholds.reduce(
    (nearest, threshold, index) =>
      Math.abs(threshold - value) < Math.abs(thresholds[nearest] - value) ? index : nearest,
    0,
  );
}

function manualPointerValue(
  event: { currentTarget: SVGRectElement; clientX: number; clientY: number },
  featureIndex: number,
): number {
  const svg = event.currentTarget.ownerSVGElement;
  if (!svg) return 0;
  const bounds = svg.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * SOURCE_PLOT.width;
  const y = ((event.clientY - bounds.top) / bounds.height) * SOURCE_PLOT.height;
  return featureIndex === 0
    ? 0.5 + ((x - SOURCE_PLOT.left) / (SOURCE_PLOT.right - SOURCE_PLOT.left)) * 6
    : 1 + ((SOURCE_PLOT.bottom - y) / (SOURCE_PLOT.bottom - SOURCE_PLOT.top)) * 3.6;
}

function ManualTreeView({
  node,
  selectedId,
  onSelect,
  locale,
  arrivalDirection = null,
}: {
  node: ManualNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  locale: WorkshopLocale;
  arrivalDirection?: Direction | null;
}) {
  if (node.kind === "leaf") {
    const counts = countLabels(lessonData.dataset, node.sampleIndices);
    const pure = pureManualRegion(node.sampleIndices);
    const prediction = pure
      ? outcomeLabel(lessonData.dataset.targets[node.sampleIndices[0]], locale)
      : isPortuguese(locale) ? "Região mista" : "Mixed region";
    return (
      <button
        type="button"
        className={`${styles.manualLeaf} ${pure ? styles.manualPureLeaf : ""}`}
        aria-pressed={selectedId === node.id}
        aria-label={`${prediction}. ${counts.thriving} ${outcomeLabel(THRIVING, locale)}, ${counts.struggling} ${outcomeLabel("Struggling", locale)}. ${isPortuguese(locale) ? "Sementes" : "Seeds"}: ${node.sampleIndices.map((index) => lessonData.dataset.rowIds[index]).join(", ")}`}
        onClick={() => onSelect(node.id)}
      >
        <span>{pure ? (isPortuguese(locale) ? "folha pronta" : "ready leaf") : (isPortuguese(locale) ? "clique para dividir" : "click to split")}</span>
        <strong>{prediction}</strong>
        <span className={styles.manualSeedMarks} aria-hidden="true">
          {node.sampleIndices.map((sampleIndex, order) => {
            const thriving = lessonData.dataset.targets[sampleIndex] === THRIVING;
            const seedStyle = {
              "--seed-order": order,
              "--seed-origin-x": arrivalDirection === "left" ? "34px" : arrivalDirection === "right" ? "-34px" : "0px",
            } as CSSProperties;
            return (
              <i
                className={`${styles.manualSeedMark} ${thriving ? styles.manualSeedThriving : styles.manualSeedStruggling}`}
                style={seedStyle}
                title={`${isPortuguese(locale) ? "Semente" : "Seed"} ${lessonData.dataset.rowIds[sampleIndex]} · ${outcomeLabel(lessonData.dataset.targets[sampleIndex], locale)}`}
                key={sampleIndex}
              >
                {lessonData.dataset.rowIds[sampleIndex]}
              </i>
            );
          })}
        </span>
      </button>
    );
  }

  const leftLeaves = manualLeafCount(node.left);
  const rightLeaves = manualLeafCount(node.right);
  const totalLeaves = leftLeaves + rightLeaves;
  const childLayout = {
    "--left-center": `${(leftLeaves / totalLeaves) * 50}%`,
    "--right-center": `${((leftLeaves + rightLeaves / 2) / totalLeaves) * 100}%`,
    gridTemplateColumns: `${leftLeaves}fr ${rightLeaves}fr`,
  } as CSSProperties;

  return (
    <div className={styles.manualTreeBranch}>
      <div className={styles.manualQuestionNode}>
        <span>{node.id === "root" ? (isPortuguese(locale) ? "pergunta raiz" : "root question") : (isPortuguese(locale) ? "pergunta local" : "local question")}</span>
        <strong>{featureLabel(lessonData.dataset.featureNames[node.featureIndex], locale, true)} ≤ {format(node.threshold, 3, locale)}?</strong>
      </div>
      <div className={styles.manualTreeChildren} style={childLayout}>
        <div>
          <span className={styles.manualEdgeLabel}>{isPortuguese(locale) ? "sim · ≤" : "yes · ≤"}</span>
          <ManualTreeView node={node.left} selectedId={selectedId} onSelect={onSelect} locale={locale} arrivalDirection="left" />
        </div>
        <div>
          <span className={styles.manualEdgeLabel}>{isPortuguese(locale) ? "não · >" : "no · >"}</span>
          <ManualTreeView node={node.right} selectedId={selectedId} onSelect={onSelect} locale={locale} arrivalDirection="right" />
        </div>
      </div>
    </div>
  );
}

export function ManualTreePlayground({ locale = "en" }: { locale?: WorkshopLocale }) {
  const [tree, setTree] = useState<ManualNode>(() => createManualRoot());
  const [history, setHistory] = useState<ManualNode[]>([]);
  const [selectedLeafId, setSelectedLeafId] = useState<string | null>("root");
  const [featureIndex, setFeatureIndex] = useState(0);
  const [draftIndex, setDraftIndex] = useState(4);
  const regions = useMemo(() => collectManualRegions(tree), [tree]);
  const partitions = useMemo(() => collectManualPartitions(tree), [tree]);
  const selectedRegion = regions.find((region) => region.node.id === selectedLeafId) ?? null;
  const thresholds = useMemo(
    () => selectedRegion ? localThresholds(selectedRegion.node.sampleIndices, featureIndex) : [],
    [featureIndex, selectedRegion],
  );
  const safeDraftIndex = Math.max(0, Math.min(draftIndex, thresholds.length - 1));
  const draftThreshold = thresholds[safeDraftIndex];
  const pureRegions = regions.filter((region) => pureManualRegion(region.node.sampleIndices)).length;
  const complete = regions.length > 0 && pureRegions === regions.length;

  const selectLeaf = (leafId: string) => {
    const region = regions.find((item) => item.node.id === leafId);
    setSelectedLeafId(leafId);
    const nextThresholds = region ? localThresholds(region.node.sampleIndices, featureIndex) : [];
    setDraftIndex(Math.max(0, Math.floor((nextThresholds.length - 1) / 2)));
  };

  const chooseFeature = (index: number) => {
    setFeatureIndex(index);
    const nextThresholds = selectedRegion ? localThresholds(selectedRegion.node.sampleIndices, index) : [];
    setDraftIndex(Math.max(0, Math.floor((nextThresholds.length - 1) / 2)));
  };

  const chooseFeatureFromKeyboard = (event: KeyboardEvent<SVGGElement>, index: number) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    chooseFeature(index);
  };

  const commitSplit = (threshold = draftThreshold) => {
    if (!selectedRegion || threshold === undefined || pureManualRegion(selectedRegion.node.sampleIndices)) return;
    const leftIndices = selectedRegion.node.sampleIndices.filter(
      (index) => Number(lessonData.dataset.features[index][featureIndex]) <= threshold,
    );
    const rightIndices = selectedRegion.node.sampleIndices.filter((index) => !leftIndices.includes(index));
    if (!leftIndices.length || !rightIndices.length) return;
    const replacement: ManualSplit = {
      kind: "split",
      id: selectedRegion.node.id,
      featureIndex,
      threshold,
      sampleIndices: selectedRegion.node.sampleIndices,
      left: { kind: "leaf", id: `${selectedRegion.node.id}-yes`, sampleIndices: leftIndices },
      right: { kind: "leaf", id: `${selectedRegion.node.id}-no`, sampleIndices: rightIndices },
    };
    setHistory((previous) => [...previous, tree]);
    setTree(replaceManualLeaf(tree, selectedRegion.node.id, replacement));
    setSelectedLeafId(null);
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setTree(previous);
    setHistory((items) => items.slice(0, -1));
    setSelectedLeafId(null);
  };

  const reset = () => {
    setTree(createManualRoot());
    setHistory([]);
    setSelectedLeafId("root");
    setFeatureIndex(0);
    setDraftIndex(4);
  };

  const showGuidedSolution = () => {
    setHistory((previous) => [...previous, tree]);
    setTree(createGuidedManualTree());
    setSelectedLeafId(null);
  };

  return (
    <section className={styles.workshop} aria-labelledby="manual-tree-title">
      <header className={styles.workshopHeader}>
        <div>
          <p className={styles.kicker}>{isPortuguese(locale) ? "Experimento 2 · construa a árvore" : "Playground 2 · build the tree"}</p>
          <h2 id="manual-tree-title">{isPortuguese(locale) ? "Transforme regiões em uma árvore de decisão" : "Turn regions into a decision tree"}</h2>
        </div>
        <span className={styles.stepPill}>
          {manualSplitCount(tree)} {isPortuguese(locale) ? "perguntas" : "questions"} · {pureRegions}/{regions.length} {isPortuguese(locale) ? "regiões prontas" : "regions clear"}
        </span>
      </header>

      <div className={styles.manualGuide}>
        <span><b>1</b>{isPortuguese(locale) ? "Escolha uma região" : "Choose a region"}</span>
        <span><b>2</b>{isPortuguese(locale) ? "Escolha um eixo" : "Choose an axis"}</span>
        <span><b>3</b>{isPortuguese(locale) ? "Clique na região para cortar" : "Click the region to cut"}</span>
      </div>

      <div className={styles.manualGrid}>
        <div className={styles.manualPlotPanel}>
          <div className={styles.panelTitle}>{isPortuguese(locale) ? "Espaço dos dados · regiões e eixos são clicáveis" : "Data space · regions and axes are clickable"}</div>
          <div className={styles.candidatePlotWrap}>
            <svg
              className={`${styles.candidatePlot} ${styles.manualPlot}`}
              viewBox={`0 0 ${SOURCE_PLOT.width} ${SOURCE_PLOT.height}`}
              role="group"
              aria-labelledby="manual-plot-title manual-plot-description"
            >
              <title id="manual-plot-title">{isPortuguese(locale) ? "Regiões criadas pela árvore manual" : "Regions created by the manual decision tree"}</title>
              <desc id="manual-plot-description">
                {isPortuguese(locale) ? "Escolha uma região, selecione uma característica pelo botão no eixo correspondente e clique na região para dividi-la. Círculos são sementes saudáveis e quadrados são sementes com dificuldade." : "Choose a region, select a feature with its axis button, and click the region to divide it. Circles are thriving seeds and squares are struggling seeds."}
              </desc>

              {regions.map((region) => {
                const counts = countLabels(lessonData.dataset, region.node.sampleIndices);
                const pure = pureManualRegion(region.node.sampleIndices);
                const selected = selectedLeafId === region.node.id;
                const x = sourceX(region.bounds.xMin);
                const y = sourceY(region.bounds.yMax);
                const width = sourceX(region.bounds.xMax) - x;
                const height = sourceY(region.bounds.yMin) - y;
                return (
                  <g key={region.node.id}>
                    <rect
                      className={`${styles.manualRegion} ${pure ? (counts.thriving ? styles.manualThrivingRegion : styles.manualStrugglingRegion) : styles.manualMixedRegion} ${selected ? styles.manualSelectedRegion : ""}`}
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      role="button"
                      tabIndex={0}
                      aria-label={isPortuguese(locale) ? `Região com ${counts.thriving} sementes saudáveis e ${counts.struggling} com dificuldade` : `Region with ${counts.thriving} thriving and ${counts.struggling} struggling seeds`}
                      onKeyDown={(event) => {
                        const previousKey = featureIndex === 0 ? "ArrowLeft" : "ArrowDown";
                        const nextKey = featureIndex === 0 ? "ArrowRight" : "ArrowUp";
                        if (selected && (event.key === previousKey || event.key === nextKey) && thresholds.length) {
                          event.preventDefault();
                          setDraftIndex((value) => Math.max(0, Math.min(thresholds.length - 1, value + (event.key === nextKey ? 1 : -1))));
                        } else if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (selected && !pure && draftThreshold !== undefined) commitSplit();
                          else selectLeaf(region.node.id);
                        }
                      }}
                      onPointerMove={(event) => {
                        if (!selected || !thresholds.length) return;
                        setDraftIndex(nearestThresholdIndex(thresholds, manualPointerValue(event, featureIndex)));
                      }}
                      onClick={(event) => {
                        if (!selected) {
                          selectLeaf(region.node.id);
                          return;
                        }
                        if (!thresholds.length || pure) return;
                        const index = nearestThresholdIndex(thresholds, manualPointerValue(event, featureIndex));
                        commitSplit(thresholds[index]);
                      }}
                    />
                    <text className={styles.manualRegionCount} x={x + 8} y={y + 15}>
                      ○ {counts.thriving} · □ {counts.struggling}
                    </text>
                  </g>
                );
              })}

              {[1, 2, 3, 4, 5, 6].map((tick) => (
                <g key={`manual-x-${tick}`}>
                  <line className={styles.plotGridline} x1={sourceX(tick)} x2={sourceX(tick)} y1={SOURCE_PLOT.top} y2={SOURCE_PLOT.bottom} />
                  <text className={styles.plotTick} x={sourceX(tick)} y="311" textAnchor="middle">{tick}</text>
                </g>
              ))}
              {[1, 2, 3, 4].map((tick) => (
                <g key={`manual-y-${tick}`}>
                  <line className={styles.plotGridline} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.right} y1={sourceY(tick)} y2={sourceY(tick)} />
                  <text className={styles.plotTick} x="46" y={sourceY(tick) + 4} textAnchor="end">{tick}</text>
                </g>
              ))}

              {partitions.map(({ node, bounds }) => {
                const vertical = node.featureIndex === 0;
                return (
                  <g key={`line-${node.id}`} className={styles.manualCommittedCut}>
                    <line
                      x1={vertical ? sourceX(node.threshold) : sourceX(bounds.xMin)}
                      x2={vertical ? sourceX(node.threshold) : sourceX(bounds.xMax)}
                      y1={vertical ? sourceY(bounds.yMax) : sourceY(node.threshold)}
                      y2={vertical ? sourceY(bounds.yMin) : sourceY(node.threshold)}
                    />
                    <text
                      x={vertical ? sourceX(node.threshold) + 5 : sourceX(bounds.xMin) + 5}
                      y={vertical ? sourceY(bounds.yMin) - 6 : sourceY(node.threshold) - 5}
                    >
                      {format(node.threshold, 2, locale)}
                    </text>
                  </g>
                );
              })}

              {selectedRegion && draftThreshold !== undefined && !pureManualRegion(selectedRegion.node.sampleIndices) && (
                <line
                  className={styles.manualDraftCut}
                  x1={featureIndex === 0 ? sourceX(draftThreshold) : sourceX(selectedRegion.bounds.xMin)}
                  x2={featureIndex === 0 ? sourceX(draftThreshold) : sourceX(selectedRegion.bounds.xMax)}
                  y1={featureIndex === 0 ? sourceY(selectedRegion.bounds.yMax) : sourceY(draftThreshold)}
                  y2={featureIndex === 0 ? sourceY(selectedRegion.bounds.yMin) : sourceY(draftThreshold)}
                />
              )}

              <line className={styles.plotAxis} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.right} y1={SOURCE_PLOT.bottom} y2={SOURCE_PLOT.bottom} />
              <line className={styles.plotAxis} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.left} y1={SOURCE_PLOT.top} y2={SOURCE_PLOT.bottom} />

              {lessonData.dataset.features.map((row, rowIndex) => {
                const x = sourceX(Number(row[0]));
                const y = sourceY(Number(row[1]));
                const thriving = lessonData.dataset.targets[rowIndex] === THRIVING;
                return (
                  <g className={`${styles.manualPoint} ${thriving ? styles.candidatePointThriving : styles.candidatePointStruggling}`} key={lessonData.dataset.rowIds[rowIndex]}>
                    {thriving ? <circle cx={x} cy={y} r="8" /> : <rect x={x - 7} y={y - 7} width="14" height="14" rx="1" />}
                    <text x={x + 11} y={y - 10}>{lessonData.dataset.rowIds[rowIndex]}</text>
                  </g>
                );
              })}

              <g
                className={`${styles.axisFeatureButton} ${featureIndex === 0 ? styles.axisFeatureButtonActive : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={featureIndex === 0}
                aria-label={isPortuguese(locale) ? "Usar horas de luz solar para a próxima divisão" : "Use sunlight hours for the next split"}
                onClick={() => chooseFeature(0)}
                onKeyDown={(event) => chooseFeatureFromKeyboard(event, 0)}
              >
                <title>{isPortuguese(locale) ? "Clique para dividir por horas de luz solar" : "Click to split by sunlight hours"}</title>
                <rect className={styles.axisFeatureButtonSurface} x="197" y="316" width="200" height="22" rx="11" />
                <text className={styles.axisFeatureButtonLabel} x={(SOURCE_PLOT.left + SOURCE_PLOT.right) / 2} y="331" textAnchor="middle">
                  {isPortuguese(locale) ? "horas de luz solar por dia" : "sunlight hours per day"}
                </text>
              </g>
              <g
                className={`${styles.axisFeatureButton} ${featureIndex === 1 ? styles.axisFeatureButtonActive : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={featureIndex === 1}
                aria-label={isPortuguese(locale) ? "Usar água por semana para a próxima divisão" : "Use water per week for the next split"}
                transform={`rotate(-90 13 ${(SOURCE_PLOT.top + SOURCE_PLOT.bottom) / 2})`}
                onClick={() => chooseFeature(1)}
                onKeyDown={(event) => chooseFeatureFromKeyboard(event, 1)}
              >
                <title>{isPortuguese(locale) ? "Clique para dividir por água por semana" : "Click to split by water per week"}</title>
                <rect className={styles.axisFeatureButtonSurface} x="-77" y="147" width="180" height="22" rx="11" />
                <text className={styles.axisFeatureButtonLabel} x="13" y="162" textAnchor="middle">
                  {isPortuguese(locale) ? "água por semana (L)" : "water per week (L)"}
                </text>
              </g>
            </svg>
          </div>

          <div className={styles.manualPlotActions}>
            <span>{isPortuguese(locale) ? "Controles da árvore" : "Tree controls"}</span>
            <button type="button" disabled={!history.length} onClick={undo}>↶ {isPortuguese(locale) ? "Desfazer última divisão" : "Undo last split"}</button>
            <button type="button" onClick={reset}>{isPortuguese(locale) ? "Recomeçar árvore" : "Reset tree"}</button>
            <button type="button" onClick={showGuidedSolution}>{isPortuguese(locale) ? "Mostrar uma solução guiada" : "Show one guided solution"}</button>
          </div>

        </div>

        <div className={styles.manualTreePanel}>
          <div className={styles.panelTitle}>{isPortuguese(locale) ? "O que suas linhas criam · a mesma árvore" : "What your lines create · the same tree"}</div>
          <div
            className={styles.manualTreeCanvas}
            style={{ "--manual-tree-width": `${Math.max(320, regions.length * 154)}px` } as CSSProperties}
          >
            <ManualTreeView node={tree} selectedId={selectedLeafId} onSelect={selectLeaf} locale={locale} />
          </div>
          {complete ? (
            <div className={styles.manualComplete} role="status">
              <strong>{isPortuguese(locale) ? "Você construiu uma árvore completa." : "You built a complete decision tree."}</strong>
              <span>{isPortuguese(locale) ? "Cada região final contém somente um tipo de resultado." : "Every final region now contains only one outcome."}</span>
            </div>
          ) : (
            <p className={styles.manualTreeHint}>{isPortuguese(locale) ? "Uma folha mista ainda contém círculos e quadrados. Selecione-a para continuar crescendo." : "A mixed leaf still contains circles and squares. Select it to keep growing."}</p>
          )}
          <p className={styles.srOnly} aria-live="polite">
            {isPortuguese(locale) ? `A árvore tem ${manualSplitCount(tree)} perguntas e ${regions.length} regiões finais; ${pureRegions} estão prontas.` : `The tree has ${manualSplitCount(tree)} questions and ${regions.length} final regions; ${pureRegions} are clear.`}
          </p>
        </div>
      </div>
    </section>
  );
}

export function SplitSearchPlayground({ locale = "en" }: { locale?: WorkshopLocale }) {
  const result = lessonData.scenarios.gini;
  const candidates = useMemo(() => rootCandidates(result), [result]);
  const [visitedCount, setVisitedCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!playing) return undefined;
    if (visitedCount >= candidates.length) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setVisitedCount((value) => value + 1), 620);
    return () => window.clearTimeout(timer);
  }, [playing, visitedCount, candidates.length]);

  const done = visitedCount === candidates.length;
  const currentIndex = inspectedIndex ?? (visitedCount > 0 ? visitedCount - 1 : null);
  const bestIndex = candidates.reduce<number | null>(
    (best, item, index) =>
      index < visitedCount && (best === null || item.gain > candidates[best].gain + 1e-9) ? index : best,
    null,
  );
  const best = bestIndex === null ? null : candidates[bestIndex];
  const focusIndex = currentIndex ?? (done && bestIndex !== null ? bestIndex : null);
  const candidate = focusIndex === null ? null : candidates[focusIndex];
  const tiedWithBest = best
    ? candidates.filter(
        (item, index) => index < visitedCount && index !== bestIndex && Math.abs(item.gain - best.gain) < 1e-9,
      )
    : [];

  const stepOnce = () => {
    setPlaying(false);
    setInspectedIndex(null);
    setVisitedCount((value) => Math.min(candidates.length, value + 1));
  };

  const reset = () => {
    setPlaying(false);
    setInspectedIndex(null);
    setVisitedCount(0);
  };

  const leftCounts = candidate ? countLabels(lessonData.dataset, candidate.leftIndices) : null;
  const rightCounts = candidate ? countLabels(lessonData.dataset, candidate.rightIndices) : null;

  return (
    <section className={styles.workshop} aria-labelledby="split-search-title">
      <header className={styles.workshopHeader}>
        <div>
          <p className={styles.kicker}>{isPortuguese(locale) ? "Experimento 3 · automatize a escolha" : "Playground 3 · automate the choice"}</p>
          <h2 id="split-search-title">{isPortuguese(locale) ? "Deixe o computador testar todas as perguntas" : "Let the computer try every question"}</h2>
        </div>
        <span className={styles.stepPill}>
          {visitedCount} {isPortuguese(locale) ? "de" : "of"} {candidates.length} {isPortuguese(locale) ? "perguntas testadas" : "questions tested"}
        </span>
      </header>

      <div className={styles.growthControls}>
        <button type="button" onClick={reset} disabled={visitedCount === 0}>{isPortuguese(locale) ? "Reiniciar" : "Reset"}</button>
        <button type="button" disabled={done} onClick={stepOnce}>{isPortuguese(locale) ? "Testar a próxima" : "Test the next one"} →</button>
        <button className={styles.primaryButton} type="button" disabled={done && !playing} onClick={() => { setInspectedIndex(null); setPlaying((value) => !value); }}>
          {playing ? (isPortuguese(locale) ? "Pausar" : "Pause") : (isPortuguese(locale) ? "Executar a busca completa" : "Run the full search")}
        </button>
      </div>

      <div className={styles.splitGrid}>
        <div>
          <div className={styles.panelTitle}>
            {candidate
              ? (isPortuguese(locale) ? "A linha que está sendo testada agora" : "The line being tested right now")
              : (isPortuguese(locale) ? "Nenhuma linha testada ainda" : "No line tested yet")}
          </div>
          <CandidatePlot
            dataset={lessonData.dataset}
            candidate={candidate ?? candidates[0]}
            hoveredIndex={null}
            onHoverIndex={() => {}}
            locale={locale}
          />
          {candidate && leftCounts && rightCounts ? (
            <>
              <div className={styles.inlineEquation}>
                <span>{isPortuguese(locale) ? "ganho" : "gain"}</span>
                <b>=</b>
                <strong>{format(candidate.parentImpurity, 3, locale)}</strong>
                <b>−</b>
                <strong>{format(candidate.weightedImpurity, 3, locale)}</strong>
                <b>=</b>
                <em>{format(candidate.gain, 3, locale)}</em>
              </div>
              <div className={styles.childGroups}>
                <div>
                  <span>{isPortuguese(locale) ? "Sim · esquerda" : "Yes · left"} · {candidate.leftIndices.length} {isPortuguese(locale) ? countWord(candidate.leftIndices.length, "linha", "linhas") : countWord(candidate.leftIndices.length, "row", "rows")}</span>
                  <strong>○ {leftCounts.thriving} · □ {leftCounts.struggling}</strong>
                  <small>Gini {format(candidate.leftImpurity, 3, locale)}</small>
                </div>
                <div>
                  <span>{isPortuguese(locale) ? "Não · direita" : "No · right"} · {candidate.rightIndices.length} {isPortuguese(locale) ? countWord(candidate.rightIndices.length, "linha", "linhas") : countWord(candidate.rightIndices.length, "row", "rows")}</span>
                  <strong>○ {rightCounts.thriving} · □ {rightCounts.struggling}</strong>
                  <small>Gini {format(candidate.rightImpurity, 3, locale)}</small>
                </div>
              </div>
            </>
          ) : (
            <p className={styles.searchIdle}>
              {isPortuguese(locale)
                ? "A busca ainda não começou. Execute-a e observe a linha varrer as duas características, uma pergunta de cada vez."
                : "The search has not started. Run it and watch the line sweep across both features, one question at a time."}
            </p>
          )}
        </div>

        <div className={styles.scorePanel} aria-live="polite">
          <div className={styles.panelTitle}>{isPortuguese(locale) ? "O registro da busca · um ganho por pergunta" : "The search ledger · one gain per question"}</div>
          <div className={styles.searchLanes}>
            {lessonData.dataset.featureNames.map((name, featureIdx) => (
              <div className={styles.searchLane} key={name}>
                <span className={styles.searchLaneTitle}>
                  {isPortuguese(locale) ? "para cada limiar de" : "for each threshold of"} <strong>{featureLabel(name, locale, true)}</strong>
                </span>
                <div className={styles.laneBars}>
                  {candidates.map((item, index) => {
                    if (item.featureIndex !== featureIdx) return null;
                    const visited = index < visitedCount;
                    const isBest = index === bestIndex;
                    const isCurrent = index === focusIndex;
                    return (
                      <button
                        type="button"
                        className={[
                          styles.laneBar,
                          visited ? styles.visitedBar : styles.unvisitedBar,
                          isBest ? styles.bestBar : "",
                          isCurrent ? styles.currentBar : "",
                        ].join(" ")}
                        disabled={!visited}
                        aria-pressed={isCurrent}
                        aria-label={
                          visited
                            ? `${featureLabel(item.featureName, locale, true)} ≤ ${format(item.threshold, 3, locale)}: ${isPortuguese(locale) ? "ganho" : "gain"} ${format(item.gain, 3, locale)}`
                            : (isPortuguese(locale) ? "Ainda não testada" : "Not tested yet")
                        }
                        onClick={() => { setPlaying(false); setInspectedIndex(index); }}
                        key={item.threshold}
                      >
                        <i style={{ height: `${4 + (visited ? item.gain : 0) * 260}px` }} />
                        <span>{format(item.threshold, 2, locale)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {best ? (
            <div className={styles.bestSoFar}>
              <span>{done ? (isPortuguese(locale) ? "Vencedora da busca" : "Winner of the search") : (isPortuguese(locale) ? "Melhor até agora" : "Best so far")}</span>
              <strong>{featureLabel(best.featureName, locale, true)} ≤ {format(best.threshold, 3, locale)}?</strong>
              <small>{isPortuguese(locale) ? "ganho" : "gain"} {format(best.gain, 3, locale)}</small>
            </div>
          ) : (
            <p className={styles.searchIdle}>
              {isPortuguese(locale)
                ? "Cada barra vai registrar o ganho de uma pergunta. A busca guarda a mais alta."
                : "Each bar will record the gain of one question. The search keeps the tallest."}
            </p>
          )}

          {done && best && (
            <p className={styles.feedback}>
              {isPortuguese(locale) ? (
                <>
                  A busca testou <strong>{candidates.length} perguntas</strong> e manteve{" "}
                  <strong>{featureLabel(best.featureName, locale, true)} ≤ {format(best.threshold, 3, locale)}</strong>.
                  {tiedWithBest.length > 0 && (
                    <>
                      {" "}Repare que <strong>{featureLabel(tiedWithBest[0].featureName, locale, true)} ≤ {format(tiedWithBest[0].threshold, 3, locale)}</strong>{" "}
                      empata com o mesmo ganho. A pontuação não desempata: o algoritmo simplesmente fica com a primeira vencedora que encontrou.
                    </>
                  )}
                </>
              ) : (
                <>
                  The search tested <strong>{candidates.length} questions</strong> and kept{" "}
                  <strong>{featureLabel(best.featureName, locale, true)} ≤ {format(best.threshold, 3, locale)}</strong>.
                  {tiedWithBest.length > 0 && (
                    <>
                      {" "}Notice that <strong>{featureLabel(tiedWithBest[0].featureName, locale, true)} ≤ {format(tiedWithBest[0].threshold, 3, locale)}</strong>{" "}
                      ties with the same gain. The score has no tiebreaker: the algorithm simply keeps the first winner it found.
                    </>
                  )}
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function SampleChips({
  dataset,
  classA,
  indices,
  stage,
  locale = "en",
}: {
  dataset: Dataset;
  classA: string;
  indices: number[];
  stage: number;
  locale?: WorkshopLocale;
}) {
  if (indices.length > 12) {
    const counts = countBinaryLabels(dataset, indices, classA);
    return <small className={styles.sampleSummary}>○ {counts.thriving} · □ {counts.struggling}</small>;
  }
  return (
    <div className={styles.sampleChips} key={`${indices.join("-")}-${stage}`}>
      {indices.map((index) => (
        <span
          className={dataset.targets[index] === classA ? styles.thrivingChip : styles.strugglingChip}
          title={`${dataset.rowIds[index]} · ${outcomeLabel(dataset.targets[index], locale)}`}
          key={index}
        >
          {dataset.rowIds[index]}
        </span>
      ))}
    </div>
  );
}

function leafCount(node: TreeNode): number {
  return node.kind === "leaf" ? 1 : leafCount(node.left) + leafCount(node.right);
}

function TreeNodeView({
  node,
  dataset,
  classA,
  visibleSplits,
  activeNodeId,
  stage,
  locale = "en",
}: {
  node: TreeNode;
  dataset: Dataset;
  classA: string;
  visibleSplits: Set<string>;
  activeNodeId?: string | null;
  stage: number;
  locale?: WorkshopLocale;
}) {
  const splitIsVisible = node.kind === "split" && visibleSplits.has(node.id);
  if (node.kind === "leaf" || !splitIsVisible) {
    return (
      <div className={`${styles.treeNode} ${node.kind === "leaf" ? styles.leafNode : styles.frontierNode} ${node.id === activeNodeId ? styles.activeFrontierNode : ""}`}>
        <span>{node.kind === "leaf" ? (isPortuguese(locale) ? "folha" : "leaf") : (isPortuguese(locale) ? "linhas aguardando aqui" : "rows waiting here")}</span>
        <strong>{node.kind === "leaf" ? outcomeLabel(String(node.prediction), locale) : `${node.sampleCount} ${isPortuguese(locale) ? "amostras" : "samples"}`}</strong>
        <SampleChips dataset={dataset} classA={classA} indices={node.sampleIndices} stage={stage} locale={locale} />
      </div>
    );
  }

  const leftLeaves = leafCount(node.left);
  const rightLeaves = leafCount(node.right);
  const totalLeaves = leftLeaves + rightLeaves;
  const childLayout = {
    "--left-center": `${(leftLeaves / totalLeaves) * 50}%`,
    "--right-center": `${((leftLeaves + rightLeaves / 2) / totalLeaves) * 100}%`,
    gridTemplateColumns: `${leftLeaves}fr ${rightLeaves}fr`,
  } as CSSProperties;

  return (
    <div className={styles.treeBranch}>
      <div className={`${styles.treeNode} ${styles.splitNode}`}>
        <span>{node.id === "root" ? (isPortuguese(locale) ? "pergunta da raiz" : "root question") : (isPortuguese(locale) ? "próxima pergunta" : "next question")}</span>
        <strong>{featureLabel(node.featureName, locale, true)} ≤ {format(node.threshold, 3, locale)}?</strong>
        <small>{isPortuguese(locale) ? "ganho" : "gain"} {format(node.gain, 3, locale)}</small>
      </div>
      <div className={styles.treeChildren} style={childLayout}>
        <div>
          <span className={styles.edgeWord}>{isPortuguese(locale) ? "sim · esquerda" : "yes · left"}</span>
          <TreeNodeView node={node.left} dataset={dataset} classA={classA} visibleSplits={visibleSplits} activeNodeId={activeNodeId} stage={stage} locale={locale} />
        </div>
        <div>
          <span className={styles.edgeWord}>{isPortuguese(locale) ? "não · direita" : "no · right"}</span>
          <TreeNodeView node={node.right} dataset={dataset} classA={classA} visibleSplits={visibleSplits} activeNodeId={activeNodeId} stage={stage} locale={locale} />
        </div>
      </div>
    </div>
  );
}

interface RecursiveRound {
  nodeId: string;
  candidates: SplitCandidate[];
  selected: SplitCandidate;
}

interface RecursiveFrame {
  roundIndex: number;
  visitedCount: number;
  inspectedIndex: number | null;
  committedCount: number;
  phase: "select" | "search" | "winner" | "complete";
}

interface VisibleTreeRegion {
  node: TreeNode;
  bounds: ManualBounds;
}

interface RecursivePlotDomain extends ManualBounds {
  xTicks: number[];
  yTicks: number[];
  xLabel: string;
  yLabel: string;
}

const TREE_GROWTH_DOMAIN: RecursivePlotDomain = {
  ...MANUAL_PLOT_BOUNDS,
  xTicks: [1, 2, 3, 4, 5, 6],
  yTicks: [1, 2, 3, 4],
  xLabel: "Sunlight hours",
  yLabel: "Water per week (L)",
};

const COMPLEXITY_DOMAIN: RecursivePlotDomain = {
  xMin: 0.5,
  xMax: 7.5,
  yMin: 0.5,
  yMax: 7.5,
  xTicks: [1, 2, 3, 4, 5, 6, 7],
  yTicks: [1, 2, 3, 4, 5, 6, 7],
  xLabel: "x",
  yLabel: "y",
};

function recursiveX(value: number, domain: RecursivePlotDomain): number {
  return SOURCE_PLOT.left + ((value - domain.xMin) / (domain.xMax - domain.xMin)) * (SOURCE_PLOT.right - SOURCE_PLOT.left);
}

function recursiveY(value: number, domain: RecursivePlotDomain): number {
  return SOURCE_PLOT.bottom - ((value - domain.yMin) / (domain.yMax - domain.yMin)) * (SOURCE_PLOT.bottom - SOURCE_PLOT.top);
}

function candidatesForNode(result: LessonResult, nodeId: string): SplitCandidate[] {
  return result.trace.events.flatMap((event) =>
    event.type === "candidate_evaluated" && event.nodeId === nodeId && event.candidate
      ? [event.candidate]
      : [],
  );
}

function collectVisibleTreeRegions(
  node: TreeNode,
  visibleSplits: Set<string>,
  bounds: ManualBounds,
  regions: VisibleTreeRegion[] = [],
): VisibleTreeRegion[] {
  if (node.kind !== "split" || !visibleSplits.has(node.id)) {
    regions.push({ node, bounds });
    return regions;
  }
  const [leftBounds, rightBounds] = splitBounds(bounds, node.featureIndex, node.threshold);
  collectVisibleTreeRegions(node.left, visibleSplits, leftBounds, regions);
  collectVisibleTreeRegions(node.right, visibleSplits, rightBounds, regions);
  return regions;
}

function boundsForNode(nodeId: string, splits: SplitCandidate[], domain: RecursivePlotDomain): ManualBounds {
  const selectedByNode = new Map(splits.map((candidate) => [candidate.nodeId, candidate]));
  const directions = nodeId.split(".").slice(1);
  let bounds: ManualBounds = domain;
  let parentId = "root";
  directions.forEach((direction) => {
    const parentSplit = selectedByNode.get(parentId);
    if (!parentSplit) return;
    const [leftBounds, rightBounds] = splitBounds(bounds, parentSplit.featureIndex, parentSplit.threshold);
    bounds = direction === "left" ? leftBounds : rightBounds;
    parentId = `${parentId}.${direction}`;
  });
  return bounds;
}

function RecursiveSearchPlot({
  model,
  dataset,
  classA,
  domain,
  idPrefix,
  rounds,
  visibleSplits,
  activeNodeId,
  candidate,
  phase,
  locale,
}: {
  model: TreeNode;
  dataset: Dataset;
  classA: string;
  domain: RecursivePlotDomain;
  idPrefix: string;
  rounds: RecursiveRound[];
  visibleSplits: Set<string>;
  activeNodeId: string | null;
  candidate: SplitCandidate | null;
  phase: RecursiveFrame["phase"];
  locale: WorkshopLocale;
}) {
  const selectedSplits = rounds.map((round) => round.selected);
  const activeRound = activeNodeId ? rounds.find((round) => round.nodeId === activeNodeId) ?? null : null;
  const activeIndices = new Set(activeRound ? activeRound.selected.leftIndices.concat(activeRound.selected.rightIndices) : []);
  const activeBounds = activeNodeId ? boundsForNode(activeNodeId, selectedSplits, domain) : null;
  const visibleRegions = collectVisibleTreeRegions(model, visibleSplits, domain);
  const committed = rounds.filter((round) => visibleSplits.has(round.nodeId));

  return (
    <div className={styles.recursivePlotWrap}>
      <svg
        className={`${styles.candidatePlot} ${styles.recursivePlot}`}
        viewBox={`0 0 ${SOURCE_PLOT.width} ${SOURCE_PLOT.height}`}
        role="img"
        aria-labelledby={`${idPrefix}-plot-title ${idPrefix}-plot-description`}
      >
        <title id={`${idPrefix}-plot-title`}>{isPortuguese(locale) ? "Busca recursiva no espaço dos dados" : "Recursive search in data space"}</title>
        <desc id={`${idPrefix}-plot-description`}>
          {isPortuguese(locale)
            ? "A região ativa permanece destacada enquanto uma linha testa cada limiar local. As linhas sólidas são divisões já confirmadas."
            : "The active region stays highlighted while a line tests each local threshold. Solid lines are already committed splits."}
        </desc>

        {visibleRegions.map(({ node, bounds }) => {
          const counts = countBinaryLabels(dataset, node.sampleIndices, classA);
          const pure = new Set(node.sampleIndices.map((index) => dataset.targets[index])).size <= 1;
          const x = recursiveX(bounds.xMin, domain);
          const y = recursiveY(bounds.yMax, domain);
          return (
            <g key={`recursive-region-${node.id}`}>
              <rect
                className={`${styles.recursiveRegion} ${pure ? (counts.thriving ? styles.manualThrivingRegion : styles.manualStrugglingRegion) : styles.manualMixedRegion}`}
                x={x}
                y={y}
                width={recursiveX(bounds.xMax, domain) - x}
                height={recursiveY(bounds.yMin, domain) - y}
              />
              <text className={styles.manualRegionCount} x={x + 8} y={y + 15}>○ {counts.thriving} · □ {counts.struggling}</text>
            </g>
          );
        })}

        {domain.xTicks.map((tick) => (
          <g key={`recursive-x-${tick}`}>
            <line className={styles.plotGridline} x1={recursiveX(tick, domain)} x2={recursiveX(tick, domain)} y1={SOURCE_PLOT.top} y2={SOURCE_PLOT.bottom} />
            <text className={styles.plotTick} x={recursiveX(tick, domain)} y="311" textAnchor="middle">{tick}</text>
          </g>
        ))}
        {domain.yTicks.map((tick) => (
          <g key={`recursive-y-${tick}`}>
            <line className={styles.plotGridline} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.right} y1={recursiveY(tick, domain)} y2={recursiveY(tick, domain)} />
            <text className={styles.plotTick} x="46" y={recursiveY(tick, domain) + 4} textAnchor="end">{tick}</text>
          </g>
        ))}

        {activeBounds && (
          <rect
            className={styles.recursiveActiveRegion}
            x={recursiveX(activeBounds.xMin, domain)}
            y={recursiveY(activeBounds.yMax, domain)}
            width={recursiveX(activeBounds.xMax, domain) - recursiveX(activeBounds.xMin, domain)}
            height={recursiveY(activeBounds.yMin, domain) - recursiveY(activeBounds.yMax, domain)}
          />
        )}

        {committed.map(({ selected }) => {
          const bounds = boundsForNode(selected.nodeId, selectedSplits, domain);
          const vertical = selected.featureIndex === 0;
          return (
            <g className={styles.recursiveCommittedCut} key={`recursive-cut-${selected.nodeId}`}>
              <line
                x1={vertical ? recursiveX(selected.threshold, domain) : recursiveX(bounds.xMin, domain)}
                x2={vertical ? recursiveX(selected.threshold, domain) : recursiveX(bounds.xMax, domain)}
                y1={vertical ? recursiveY(bounds.yMax, domain) : recursiveY(selected.threshold, domain)}
                y2={vertical ? recursiveY(bounds.yMin, domain) : recursiveY(selected.threshold, domain)}
              />
            </g>
          );
        })}

        {candidate && activeBounds && (
          <g className={phase === "winner" ? styles.recursiveWinningCut : styles.recursiveScanningCut}>
            <line
              x1={candidate.featureIndex === 0 ? recursiveX(candidate.threshold, domain) : recursiveX(activeBounds.xMin, domain)}
              x2={candidate.featureIndex === 0 ? recursiveX(candidate.threshold, domain) : recursiveX(activeBounds.xMax, domain)}
              y1={candidate.featureIndex === 0 ? recursiveY(activeBounds.yMax, domain) : recursiveY(candidate.threshold, domain)}
              y2={candidate.featureIndex === 0 ? recursiveY(activeBounds.yMin, domain) : recursiveY(candidate.threshold, domain)}
            />
            <text
              x={candidate.featureIndex === 0 ? recursiveX(candidate.threshold, domain) + 6 : recursiveX(activeBounds.xMin, domain) + 6}
              y={candidate.featureIndex === 0 ? recursiveY(activeBounds.yMax, domain) + 14 : recursiveY(candidate.threshold, domain) - 7}
            >
              {phase === "winner" ? (isPortuguese(locale) ? "melhor" : "best") : (isPortuguese(locale) ? "testando" : "testing")} · {format(candidate.threshold, 2, locale)}
            </text>
          </g>
        )}

        <line className={styles.plotAxis} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.right} y1={SOURCE_PLOT.bottom} y2={SOURCE_PLOT.bottom} />
        <line className={styles.plotAxis} x1={SOURCE_PLOT.left} x2={SOURCE_PLOT.left} y1={SOURCE_PLOT.top} y2={SOURCE_PLOT.bottom} />

        {dataset.features.map((row, rowIndex) => {
          const thriving = dataset.targets[rowIndex] === classA;
          const inactive = activeNodeId !== null && !activeIndices.has(rowIndex);
          const x = recursiveX(Number(row[0]), domain);
          const y = recursiveY(Number(row[1]), domain);
          return (
            <g className={`${styles.manualPoint} ${thriving ? styles.candidatePointThriving : styles.candidatePointStruggling} ${inactive ? styles.recursiveInactivePoint : ""}`} key={`recursive-point-${dataset.rowIds[rowIndex]}`}>
              {thriving ? <circle cx={x} cy={y} r="8" /> : <rect x={x - 7} y={y - 7} width="14" height="14" rx="1" />}
              {dataset.features.length <= 16 && <text x={x + 11} y={y - 10}>{dataset.rowIds[rowIndex]}</text>}
            </g>
          );
        })}

        <text className={styles.plotAxisLabel} x={(SOURCE_PLOT.left + SOURCE_PLOT.right) / 2} y="333" textAnchor="middle">{featureLabel(domain.xLabel, locale)}</text>
        <text className={styles.plotAxisLabel} x="13" y={(SOURCE_PLOT.top + SOURCE_PLOT.bottom) / 2} textAnchor="middle" transform={`rotate(-90 13 ${(SOURCE_PLOT.top + SOURCE_PLOT.bottom) / 2})`}>{featureLabel(domain.yLabel, locale)}</text>
      </svg>
    </div>
  );
}

function LocalGiniTrace({
  dataset,
  round,
  visitedCount,
  inspectedIndex,
  locale,
}: {
  dataset: Dataset;
  round: RecursiveRound;
  visitedCount: number;
  inspectedIndex: number | null;
  locale: WorkshopLocale;
}) {
  const bestIndex = round.candidates.reduce<number | null>((best, candidate, index) => {
    if (index >= visitedCount) return best;
    return best === null || candidate.gain > round.candidates[best].gain + 1e-9 ? index : best;
  }, null);
  const best = bestIndex === null ? null : round.candidates[bestIndex];
  const chart = { width: 430, height: 102, left: 42, right: 416, top: 14, bottom: 70 };
  const maximum = Math.max(round.selected.parentImpurity, ...round.candidates.map((item) => item.weightedImpurity), 0.001);

  return (
    <div className={styles.localGiniTrace} aria-live="polite">
      <div className={styles.localTraceHeader}>
        <span>{isPortuguese(locale) ? "Busca local" : "Local search"} · <strong>{round.nodeId === "root" ? (isPortuguese(locale) ? "raiz" : "root") : round.nodeId}</strong></span>
        <span>{visitedCount}/{round.candidates.length} {isPortuguese(locale) ? "limiares" : "thresholds"}</span>
      </div>
      <div className={styles.giniLanes}>
        {dataset.featureNames.map((name, featureIndex) => {
          const entries = round.candidates.flatMap((candidate, index) => candidate.featureIndex === featureIndex ? [{ candidate, index }] : []);
          const thresholdMin = entries[0]?.candidate.threshold ?? 0;
          const thresholdMax = entries[entries.length - 1]?.candidate.threshold ?? 1;
          const xFor = (threshold: number) => thresholdMin === thresholdMax
            ? (chart.left + chart.right) / 2
            : chart.left + ((threshold - thresholdMin) / (thresholdMax - thresholdMin)) * (chart.right - chart.left);
          const yFor = (gini: number) => chart.bottom - (gini / maximum) * (chart.bottom - chart.top);
          const visitedEntries = entries.filter(({ index }) => index < visitedCount);
          const path = visitedEntries.map(({ candidate }) => `${xFor(candidate.threshold)},${yFor(candidate.weightedImpurity)}`).join(" ");
          return (
            <div className={styles.giniLane} key={`gini-lane-${name}`}>
              <span className={styles.giniLaneLabel}>{featureLabel(name, locale, true)}</span>
              <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`${featureLabel(name, locale, true)}: ${isPortuguese(locale) ? "Gini ponderado por limiar; menor é melhor" : "weighted Gini by threshold; lower is better"}`}>
                <line className={styles.giniAxis} x1={chart.left} x2={chart.right} y1={chart.bottom} y2={chart.bottom} />
                <line className={styles.giniGuide} x1={chart.left} x2={chart.right} y1={yFor(round.selected.parentImpurity)} y2={yFor(round.selected.parentImpurity)} />
                {visitedEntries.length > 1 && <polyline className={styles.giniPath} points={path} />}
                {entries.map(({ candidate, index }, localIndex) => {
                  const visited = index < visitedCount;
                  const current = index === inspectedIndex;
                  const isBest = index === bestIndex;
                  const showLabel = entries.length <= 6 || localIndex === 0 || localIndex === entries.length - 1;
                  return (
                    <g className={`${styles.giniPoint} ${visited ? styles.giniPointVisited : ""} ${current ? styles.giniPointCurrent : ""} ${isBest ? styles.giniPointBest : ""}`} key={`gini-point-${name}-${candidate.threshold}`}>
                      <circle cx={xFor(candidate.threshold)} cy={visited ? yFor(candidate.weightedImpurity) : chart.bottom} r={current || isBest ? 5 : 3.5} />
                      {showLabel && <text x={xFor(candidate.threshold)} y="88" textAnchor="middle">{format(candidate.threshold, 2, locale)}</text>}
                    </g>
                  );
                })}
                <text className={styles.giniAxisTitle} x="5" y="12">{isPortuguese(locale) ? "Gini após divisão ↓" : "after-split Gini ↓"}</text>
              </svg>
            </div>
          );
        })}
      </div>
      {best ? (
        <div className={styles.localBestSoFar}>
          <span>{visitedCount === round.candidates.length ? (isPortuguese(locale) ? "vencedora local" : "local winner") : (isPortuguese(locale) ? "menor Gini até agora" : "lowest Gini so far")}</span>
          <strong>{featureLabel(best.featureName, locale, true)} ≤ {format(best.threshold, 3, locale)}</strong>
          <small>Gini {format(best.weightedImpurity, 3, locale)} · {isPortuguese(locale) ? "ganho" : "gain"} {format(best.gain, 3, locale)}</small>
        </div>
      ) : (
        <p className={styles.searchIdle}>{isPortuguese(locale) ? "A varredura ainda não começou nesta região." : "The sweep has not started inside this region yet."}</p>
      )}
    </div>
  );
}

function RecursiveGrowthWorkshop({
  dataset,
  result,
  classA,
  domain,
  idPrefix,
  kicker,
  title,
  datasetControl = null,
  locale = "en",
}: {
  dataset: Dataset;
  result: LessonResult;
  classA: string;
  domain: RecursivePlotDomain;
  idPrefix: string;
  kicker: string;
  title: string;
  datasetControl?: ReactNode;
  locale?: WorkshopLocale;
}) {
  const rounds = useMemo<RecursiveRound[]>(() => selectedSplits(result).map((selected) => ({
    nodeId: selected.nodeId,
    candidates: candidatesForNode(result, selected.nodeId),
    selected,
  })), [result]);
  const frames = useMemo<RecursiveFrame[]>(() => {
    const sequence: RecursiveFrame[] = [];
    rounds.forEach((round, roundIndex) => {
      sequence.push({ roundIndex, visitedCount: 0, inspectedIndex: null, committedCount: roundIndex, phase: "select" });
      round.candidates.forEach((_, inspectedIndex) => {
        sequence.push({ roundIndex, visitedCount: inspectedIndex + 1, inspectedIndex, committedCount: roundIndex, phase: "search" });
      });
      const winnerIndex = round.candidates.findIndex((candidate) =>
        candidate.featureIndex === round.selected.featureIndex && Math.abs(candidate.threshold - round.selected.threshold) < 1e-9,
      );
      sequence.push({ roundIndex, visitedCount: round.candidates.length, inspectedIndex: winnerIndex, committedCount: roundIndex, phase: "winner" });
    });
    sequence.push({
      roundIndex: Math.max(0, rounds.length - 1),
      visitedCount: rounds[rounds.length - 1]?.candidates.length ?? 0,
      inspectedIndex: null,
      committedCount: rounds.length,
      phase: "complete",
    });
    return sequence;
  }, [rounds]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const round = rounds[frame.roundIndex];
  const done = frame.phase === "complete";

  useEffect(() => {
    if (!playing) return undefined;
    if (frameIndex >= frames.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const delay = frame.phase === "winner" ? 1100 : frame.phase === "select" ? 720 : 390;
    const timer = window.setTimeout(() => setFrameIndex((value) => Math.min(frames.length - 1, value + 1)), delay);
    return () => window.clearTimeout(timer);
  }, [playing, frameIndex, frame.phase, frames.length]);

  const visibleSplits = new Set(rounds.slice(0, frame.committedCount).map(({ nodeId }) => nodeId));
  const candidate = frame.inspectedIndex === null ? null : round.candidates[frame.inspectedIndex] ?? null;
  const activeNodeId = done ? null : round.nodeId;
  const narration = done
    ? (isPortuguese(locale) ? `A mesma busca local terminou em todas as regiões mistas. ${rounds.length} vencedoras locais formam agora a árvore completa.` : `The same local search has finished in every mixed region. ${rounds.length} local winners now form the complete tree.`)
    : frame.phase === "select"
      ? (isPortuguese(locale) ? `A recursão escolheu ${round.nodeId === "root" ? "a raiz" : round.nodeId}: somente as ${round.selected.leftIndices.length + round.selected.rightIndices.length} linhas desta região entram na próxima busca.` : `Recursion selected ${round.nodeId === "root" ? "the root" : round.nodeId}: only this region's ${round.selected.leftIndices.length + round.selected.rightIndices.length} rows enter the next search.`)
      : frame.phase === "winner"
        ? (isPortuguese(locale) ? `Todos os ${round.candidates.length} limiares locais foram testados. A linha volta para a menor impureza e está pronta para entrar na árvore.` : `All ${round.candidates.length} local thresholds have been tested. The line returns to the lowest impurity and is ready to enter the tree.`)
        : (isPortuguese(locale) ? `Testando ${featureLabel(candidate?.featureName ?? "", locale, true)} ≤ ${format(candidate?.threshold ?? 0, 3, locale)} somente dentro da região ativa.` : `Testing ${featureLabel(candidate?.featureName ?? "", locale, true)} ≤ ${format(candidate?.threshold ?? 0)} inside the active region only.`);
  const nextAction = frame.phase === "winner"
    ? (frame.roundIndex === rounds.length - 1 ? (isPortuguese(locale) ? "Confirmar divisão final" : "Commit final split") : (isPortuguese(locale) ? "Confirmar e escolher próxima região" : "Commit & choose next region"))
    : (isPortuguese(locale) ? "Testar o próximo limiar" : "Test next threshold");

  return (
    <section className={styles.workshop} aria-labelledby={`${idPrefix}-title`}>
      <header className={styles.workshopHeader}>
        <div>
          <p className={styles.kicker}>{kicker}</p>
          <h2 id={`${idPrefix}-title`}>{title}</h2>
        </div>
        <span className={styles.stepPill}>{frame.committedCount} {isPortuguese(locale) ? "de" : "of"} {rounds.length} {isPortuguese(locale) ? "divisões confirmadas" : "splits committed"}</span>
      </header>

      {datasetControl}

      <div className={styles.growthControls}>
        <button type="button" disabled={frameIndex === 0} onClick={() => { setFrameIndex((value) => Math.max(0, value - 1)); setPlaying(false); }}>← {isPortuguese(locale) ? "Voltar um passo" : "Back one step"}</button>
        <button type="button" disabled={frameIndex === 0} onClick={() => { setFrameIndex(0); setPlaying(false); }}>{isPortuguese(locale) ? "Reiniciar" : "Reset"}</button>
        <button type="button" disabled={done} onClick={() => setPlaying((value) => !value)}>{playing ? (isPortuguese(locale) ? "Pausar" : "Pause") : (isPortuguese(locale) ? "Reproduzir busca recursiva" : "Play recursive search")}</button>
        <button className={styles.primaryButton} type="button" disabled={done} onClick={() => { setFrameIndex((value) => Math.min(frames.length - 1, value + 1)); setPlaying(false); }}>
          {nextAction} →
        </button>
      </div>

      <p className={styles.stageNarration} aria-live="polite">{narration}</p>

      <div className={styles.recursiveGrid}>
        <div className={styles.recursiveSearchPanel}>
          <div className={styles.panelTitle}>{isPortuguese(locale) ? "Mesmos pontos · a linha varre somente a região ativa" : "Same points · the line sweeps only the active region"}</div>
          <RecursiveSearchPlot
            model={result.model}
            dataset={dataset}
            classA={classA}
            domain={domain}
            idPrefix={idPrefix}
            rounds={rounds}
            visibleSplits={visibleSplits}
            activeNodeId={activeNodeId}
            candidate={candidate}
            phase={frame.phase}
            locale={locale}
          />
          <LocalGiniTrace dataset={dataset} round={round} visitedCount={frame.visitedCount} inspectedIndex={frame.inspectedIndex} locale={locale} />
        </div>
        <div className={styles.treeCanvas}>
          <div className={styles.panelTitle}>{isPortuguese(locale) ? "Cada vencedora local entra na árvore" : "Each local winner enters the tree"}</div>
          <TreeNodeView node={result.model} dataset={dataset} classA={classA} visibleSplits={visibleSplits} activeNodeId={activeNodeId} stage={frame.committedCount} locale={locale} />
        </div>
      </div>

      <div className={styles.focusStrip}>
        <span>{done ? (isPortuguese(locale) ? "Árvore completa" : "Tree complete") : (isPortuguese(locale) ? "Região em foco" : "Region in focus")}</span>
        <strong>{done ? (isPortuguese(locale) ? `${rounds.length} buscas locais, a mesma regra` : `${rounds.length} local searches, the same rule`) : (round.nodeId === "root" ? (isPortuguese(locale) ? "raiz" : "root") : round.nodeId)}</strong>
        <small>{done ? (isPortuguese(locale) ? "Todas as folhas finais são puras" : "Every final leaf is pure") : `${round.selected.leftIndices.length + round.selected.rightIndices.length} ${isPortuguese(locale) ? "linhas nesta busca" : "rows in this search"}`}</small>
      </div>
    </section>
  );
}

export function TreeGrowthPlayground({ locale = "en" }: { locale?: WorkshopLocale }) {
  return (
    <RecursiveGrowthWorkshop
      dataset={lessonData.dataset}
      result={lessonData.scenarios.gini}
      classA={THRIVING}
      domain={TREE_GROWTH_DOMAIN}
      idPrefix="tree-growth"
      kicker={isPortuguese(locale) ? "Experimento 4 · automatize a recursão" : "Playground 4 · automate the recursion"}
      title={isPortuguese(locale) ? "Veja a busca local se tornar uma árvore" : "Watch local searches become a tree"}
      locale={locale}
    />
  );
}

const complexityDatasetCopy: Record<string, { en: [string, string]; pt: [string, string] }> = {
  "clean-cut": {
    en: ["One clean cut", "One vertical question separates every point."],
    pt: ["Um corte limpo", "Uma pergunta vertical separa todos os pontos."],
  },
  "uneven-corners": {
    en: ["Uneven corners", "Alternating corners require several local searches."],
    pt: ["Cantos desiguais", "Cantos alternados exigem várias buscas locais."],
  },
  diagonal: {
    en: ["Diagonal", "Axis-aligned questions build a staircase around a slanted boundary."],
    pt: ["Diagonal", "Perguntas alinhadas aos eixos formam uma escada ao redor de uma fronteira inclinada."],
  },
  "center-island": {
    en: ["Center island", "Four nested questions isolate the small group in the center."],
    pt: ["Ilha central", "Quatro perguntas aninhadas isolam o pequeno grupo no centro."],
  },
};

export function DatasetComplexityPlayground({ locale = "en" }: { locale?: WorkshopLocale }) {
  const [datasetId, setDatasetId] = useState("clean-cut");
  const entry = lessonData.complexityDatasets.find((item) => item.id === datasetId) ?? lessonData.complexityDatasets[0];
  const copy = complexityDatasetCopy[entry.id]?.[isPortuguese(locale) ? "pt" : "en"] ?? [entry.id, ""];
  const datasetControl = (
    <div className={styles.recursiveDatasetBar}>
      <label className={styles.recursiveDatasetField}>
        <span>{isPortuguese(locale) ? "Conjunto de dados" : "Dataset"}</span>
        <select value={entry.id} onChange={(event) => setDatasetId(event.target.value)}>
          {lessonData.complexityDatasets.map((item) => {
            const optionCopy = complexityDatasetCopy[item.id]?.[isPortuguese(locale) ? "pt" : "en"];
            return <option value={item.id} key={item.id}>{optionCopy?.[0] ?? item.id}</option>;
          })}
        </select>
      </label>
      <p><strong>{copy[0]}.</strong> {copy[1]}</p>
    </div>
  );

  return (
    <RecursiveGrowthWorkshop
      key={entry.id}
      dataset={entry.dataset}
      result={entry.scenario}
      classA="Class A"
      domain={COMPLEXITY_DOMAIN}
      idPrefix={`dataset-growth-${entry.id}`}
      kicker={isPortuguese(locale) ? "Experimento 5 · varie os dados" : "Playground 5 · vary the data"}
      title={isPortuguese(locale) ? "Veja a mesma busca criar árvores diferentes" : "Watch the same search grow different trees"}
      datasetControl={datasetControl}
      locale={locale}
    />
  );
}

export function MultiFeatureSplitPlayground({ locale = "en" }: { locale?: WorkshopLocale }) {
  const dataset = lessonData.multiFeatureDataset;
  const result = lessonData.multiFeatureScenario;
  const rounds = useMemo<RecursiveRound[]>(() => selectedSplits(result).map((selected) => ({
    nodeId: selected.nodeId,
    candidates: candidatesForNode(result, selected.nodeId),
    selected,
  })), [result]);
  const frames = useMemo<RecursiveFrame[]>(() => {
    const sequence: RecursiveFrame[] = [];
    rounds.forEach((round, roundIndex) => {
      sequence.push({ roundIndex, visitedCount: 0, inspectedIndex: null, committedCount: roundIndex, phase: "select" });
      round.candidates.forEach((_, inspectedIndex) => {
        sequence.push({ roundIndex, visitedCount: inspectedIndex + 1, inspectedIndex, committedCount: roundIndex, phase: "search" });
      });
      const winnerIndex = round.candidates.findIndex((candidate) =>
        candidate.featureIndex === round.selected.featureIndex && Math.abs(candidate.threshold - round.selected.threshold) < 1e-9,
      );
      sequence.push({ roundIndex, visitedCount: round.candidates.length, inspectedIndex: winnerIndex, committedCount: roundIndex, phase: "winner" });
    });
    sequence.push({
      roundIndex: Math.max(0, rounds.length - 1),
      visitedCount: rounds[rounds.length - 1]?.candidates.length ?? 0,
      inspectedIndex: null,
      committedCount: rounds.length,
      phase: "complete",
    });
    return sequence;
  }, [rounds]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const round = rounds[frame.roundIndex];
  const done = frame.phase === "complete";

  useEffect(() => {
    if (!playing) return undefined;
    if (frameIndex >= frames.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const delay = frame.phase === "winner" ? 1700 : frame.phase === "select" ? 1200 : 650;
    const timer = window.setTimeout(() => setFrameIndex((value) => Math.min(frames.length - 1, value + 1)), delay);
    return () => window.clearTimeout(timer);
  }, [playing, frameIndex, frame.phase, frames.length]);

  const visibleSplits = new Set(rounds.slice(0, frame.committedCount).map(({ nodeId }) => nodeId));
  const candidate = frame.inspectedIndex === null ? null : round.candidates[frame.inspectedIndex] ?? null;
  const activeNodeId = done ? null : round.nodeId;
  const activeIndices = done
    ? undefined
    : round.selected.leftIndices.concat(round.selected.rightIndices);
  const activeRowIds = activeIndices?.map((index) => dataset.rowIds[index]).join(", ") ?? "";
  const narration = done
    ? (isPortuguese(locale)
        ? `A mesma busca local terminou em todos os grupos mistos. ${rounds.length} vencedoras locais formam a árvore — com três colunas em vez de duas.`
        : `The same local search has finished in every mixed group. ${rounds.length} local winners form the tree — with three columns instead of two.`)
    : frame.phase === "select"
      ? (isPortuguese(locale)
          ? `A recursão escolheu ${round.nodeId === "root" ? "a raiz" : round.nodeId}: somente as linhas ${activeRowIds} entram na próxima busca.`
          : `Recursion selected ${round.nodeId === "root" ? "the root" : round.nodeId}: only rows ${activeRowIds} enter the next search.`)
      : frame.phase === "winner"
        ? (isPortuguese(locale)
            ? `Todos os ${round.candidates.length} candidatos locais foram testados. O menor Gini ponderado vence e entra na árvore.`
            : `All ${round.candidates.length} local candidates have been tested. The lowest weighted Gini wins and enters the tree.`)
        : (isPortuguese(locale)
            ? `Testando ${featureLabel(candidate?.featureName ?? "", locale, true)} ≤ ${format(candidate?.threshold ?? 0, 3, locale)}: as linhas destacadas respondem sim.`
            : `Testing ${featureLabel(candidate?.featureName ?? "", locale, true)} ≤ ${format(candidate?.threshold ?? 0)}: the highlighted rows answer yes.`);
  const nextAction = frame.phase === "winner"
    ? (frame.roundIndex === rounds.length - 1 ? (isPortuguese(locale) ? "Confirmar divisão final" : "Commit final split") : (isPortuguese(locale) ? "Confirmar e escolher próximo grupo" : "Commit & choose next group"))
    : (isPortuguese(locale) ? "Testar o próximo candidato" : "Test next candidate");

  return (
    <section className={styles.workshop} aria-labelledby="multi-feature-title">
      <header className={styles.workshopHeader}>
        <div>
          <p className={styles.kicker}>{isPortuguese(locale) ? "Experimento 6 · além de duas características" : "Playground 6 · beyond two features"}</p>
          <h2 id="multi-feature-title">{isPortuguese(locale) ? "Deixe a mesma busca percorrer três colunas" : "Let the same search loop over three columns"}</h2>
        </div>
        <span className={styles.stepPill}>{frame.committedCount} {isPortuguese(locale) ? "de" : "of"} {rounds.length} {isPortuguese(locale) ? "divisões confirmadas" : "splits committed"}</span>
      </header>

      <div className={styles.growthControls}>
        <button type="button" disabled={frameIndex === 0} onClick={() => { setFrameIndex((value) => Math.max(0, value - 1)); setPlaying(false); }}>← {isPortuguese(locale) ? "Voltar um passo" : "Back one step"}</button>
        <button type="button" disabled={frameIndex === 0} onClick={() => { setFrameIndex(0); setPlaying(false); }}>{isPortuguese(locale) ? "Reiniciar" : "Reset"}</button>
        <button type="button" disabled={done} onClick={() => setPlaying((value) => !value)}>{playing ? (isPortuguese(locale) ? "Pausar" : "Pause") : (isPortuguese(locale) ? "Reproduzir busca recursiva" : "Play recursive search")}</button>
        <button className={styles.primaryButton} type="button" disabled={done} onClick={() => { setFrameIndex((value) => Math.min(frames.length - 1, value + 1)); setPlaying(false); }}>
          {nextAction} →
        </button>
      </div>

      <p className={styles.stageNarration} aria-live="polite">{narration}</p>

      <div className={styles.recursiveGrid}>
        <div className={styles.recursiveSearchPanel}>
          <div className={styles.panelTitle}>
            {isPortuguese(locale)
              ? "A tabela é o espaço dos dados · linhas destacadas respondem sim à pergunta atual"
              : "The table is the data space · highlighted rows answer yes to the current question"}
          </div>
          <CandidateTable
            dataset={dataset}
            activeFeature={candidate?.featureIndex ?? -1}
            candidate={candidate}
            activeIndices={activeIndices}
            highlightMatchingRows
            describeRoutes
            locale={locale}
          />
          <LocalGiniTrace dataset={dataset} round={round} visitedCount={frame.visitedCount} inspectedIndex={frame.inspectedIndex} locale={locale} />
        </div>
        <div className={styles.treeCanvas}>
          <div className={styles.panelTitle}>{isPortuguese(locale) ? "Cada vencedora local entra na árvore" : "Each local winner enters the tree"}</div>
          <TreeNodeView node={result.model} dataset={dataset} classA={THRIVING} visibleSplits={visibleSplits} activeNodeId={activeNodeId} stage={frame.committedCount} locale={locale} />
        </div>
      </div>

      <div className={styles.focusStrip}>
        <span>{done ? (isPortuguese(locale) ? "Árvore completa" : "Tree complete") : (isPortuguese(locale) ? "Grupo em foco" : "Group in focus")}</span>
        <strong>{done ? (isPortuguese(locale) ? `${rounds.length} buscas locais, a mesma regra` : `${rounds.length} local searches, the same rule`) : (round.nodeId === "root" ? (isPortuguese(locale) ? "raiz" : "root") : round.nodeId)}</strong>
        <small>{done ? (isPortuguese(locale) ? "Todas as folhas finais são puras" : "Every final leaf is pure") : `${round.selected.leftIndices.length + round.selected.rightIndices.length} ${isPortuguese(locale) ? "linhas nesta busca" : "rows in this search"} · ${round.candidates.length} ${isPortuguese(locale) ? "candidatos" : "candidates"}`}</small>
      </div>
    </section>
  );
}

export function MissingValuePlayground() {
  const candidates = rootCandidates(lessonData.missingScenario);
  const best = lessonData.missingScenario.bestSplit;
  const threshold = best?.threshold ?? 3.25;
  const leftOption = candidates.find((candidate) => candidate.threshold === threshold && candidate.missingDirection === "left");
  const rightOption = candidates.find((candidate) => candidate.threshold === threshold && candidate.missingDirection === "right");
  const [direction, setDirection] = useState<Direction>("left");
  const candidate = direction === "left" ? leftOption : rightOption;
  if (!candidate || !best) return null;
  const leftCounts = countLabels(lessonData.missingDataset, candidate.leftIndices);
  const rightCounts = countLabels(lessonData.missingDataset, candidate.rightIndices);
  const winner = direction === best.missingDirection;

  return (
    <section className={styles.workshop} aria-labelledby="missing-title">
      <header className={styles.workshopHeader}>
        <div>
          <p className={styles.kicker}>Playground 3 · learn a default route</p>
          <h2 id="missing-title">Where should “?” go?</h2>
        </div>
        <span className={styles.stepPill}>threshold fixed at {format(threshold)}</span>
      </header>
      <div className={styles.missingIntro}>
        <p>
          The observed values already define the threshold. The only unresolved choice is whether rows Q and R,
          whose sunlight value is missing, travel left or right.
        </p>
        <div className={styles.directionButtons}>
          <button type="button" aria-pressed={direction === "left"} onClick={() => setDirection("left")}>Send ? left</button>
          <button type="button" aria-pressed={direction === "right"} onClick={() => setDirection("right")}>Send ? right</button>
        </div>
      </div>
      <div className={styles.splitGrid}>
        <div>
          <div className={styles.panelTitle}>Missing stays missing · only its route changes</div>
          <CandidateTable dataset={lessonData.missingDataset} activeFeature={0} candidate={candidate} />
        </div>
        <div className={styles.scorePanel} aria-live="polite">
          <div className={styles.panelTitle}>Compare the two legal assignments</div>
          <div className={styles.childGroups}>
            <div>
              <span>Left group</span>
              <strong>○ {leftCounts.thriving} thriving</strong>
              <strong>□ {leftCounts.struggling} struggling</strong>
              <small>impurity {format(candidate.leftImpurity)}</small>
            </div>
            <div>
              <span>Right group</span>
              <strong>○ {rightCounts.thriving} thriving</strong>
              <strong>□ {rightCounts.struggling} struggling</strong>
              <small>impurity {format(candidate.rightImpurity)}</small>
            </div>
          </div>
          <MetricCards candidate={candidate} criterion="gini" />
          <div className={winner ? styles.winnerCallout : styles.tryCallout}>
            <strong>{winner ? "This direction wins." : "A valid route, but not the best one."}</strong>
            <span>
              Gain is {format(candidate.gain)}. The learned default is <b>{best.missingDirection}</b>,
              because it produces gain {format(best.gain)}.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeatureImportancePlayground() {
  const result = lessonData.scenarios.gini;
  const contributions = result.importanceContributions;
  const [included, setIncluded] = useState(0);
  const current = contributions.slice(0, included);
  const raw = result.featureImportances.map((feature) =>
    current
      .filter((item) => item.featureIndex === feature.featureIndex)
      .reduce((sum, item) => sum + item.weightedContribution, 0),
  );
  const total = raw.reduce((sum, value) => sum + value, 0);
  const active = included > 0 ? contributions[included - 1] : null;

  return (
    <section className={styles.workshop} aria-labelledby="importance-title">
      <header className={styles.workshopHeader}>
        <div>
          <p className={styles.kicker}>Playground 4 · follow the credit</p>
          <h2 id="importance-title">Let each split pay its feature</h2>
        </div>
        <span className={styles.stepPill}>{included} of {contributions.length} contributions</span>
      </header>
      <div className={styles.importanceGrid}>
        <div className={styles.contributionSteps}>
          <p>Commit splits in training order. A feature receives more credit when a split has high gain and governs many rows.</p>
          {contributions.map((contribution, index) => (
            <button
              type="button"
              aria-pressed={included === index + 1}
              className={index < included ? styles.includedContribution : undefined}
              onClick={() => setIncluded(index + 1)}
              key={contribution.nodeId}
            >
              <span>Split {index + 1} · {contribution.nodeId}</span>
              <strong>{contribution.featureName.replace(" per week (L)", " / week")}</strong>
              <small>{format(contribution.sampleFraction)} × {format(contribution.gain)} = {format(contribution.weightedContribution)}</small>
            </button>
          ))}
          <button className={styles.resetImportance} type="button" onClick={() => setIncluded(0)}>Clear the ledger</button>
        </div>
        <div className={styles.importancePanel} aria-live="polite">
          <div className={styles.panelTitle}>Accumulated weighted impurity decrease</div>
          <div className={styles.importanceBars}>
            {result.featureImportances.map((feature, index) => {
              const share = total > 0 ? raw[index] / total : 0;
              return (
                <div key={feature.featureName}>
                  <div>
                    <strong>{feature.featureName}</strong>
                    <span>{format(raw[index])} credit · {Math.round(share * 100)}%</span>
                  </div>
                  <i><b style={{ width: `${share * 100}%` }} /></i>
                </div>
              );
            })}
          </div>
          {active ? (
            <div className={styles.creditEquation}>
              <span>credit from {active.nodeId}</span>
              <strong>{format(active.sampleFraction)} × {format(active.gain)} = {format(active.weightedContribution)}</strong>
              <small>fraction of all rows × local impurity gain</small>
            </div>
          ) : (
            <div className={styles.emptyLedger}>Choose the first split to begin assigning credit.</div>
          )}
          {included === contributions.length && (
            <p className={styles.feedback}>
              Final normalized importance: {result.featureImportances.map((feature) =>
                `${feature.featureName} ${Math.round(feature.importance * 100)}%`,
              ).join(" · ")}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
