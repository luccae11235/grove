import { useEffect, useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./GradientBoosting.module.css";
import { formatBoostingNumber, isPt, treeWord, type GradientBoostingLocale } from "./locale";
import {
  BOOSTING_CLASSIFICATION_EXPERIMENT,
  predictClassificationLogit,
  predictClassificationProbability,
  runClassificationBoosting,
  type ClassificationRun,
} from "./classificationExperiment";
import { boostingTreeLeafSegments, predictBoostingTree, type BoostingTree } from "./experiment";

const CHART = { width: 470, height: 270, left: 42, right: 14, top: 22, bottom: 226 };

function xScale(value: number): number {
  return CHART.left + ((value + 3) / 6) * (CHART.width - CHART.left - CHART.right);
}

function yScale(value: number, residual = false): number {
  const minimum = residual ? -1 : 0;
  const maximum = 1;
  return CHART.bottom - ((value - minimum) / (maximum - minimum)) * (CHART.bottom - CHART.top);
}

function thresholds(tree: BoostingTree): number[] {
  if (tree.kind === "leaf") return [];
  return [tree.threshold, ...thresholds(tree.left), ...thresholds(tree.right)];
}

function probabilityPath(run: ClassificationRun, treeCount: number): string {
  const boundaries = [
    -3,
    ...run.stages.slice(0, treeCount).flatMap((stage) => thresholds(stage.tree)),
    3,
  ].sort((left, right) => left - right).filter((value, index, values) => (
    index === 0 || Math.abs(value - values[index - 1]) > 1e-9
  ));
  return boundaries.slice(0, -1).map((lower, index) => {
    const upper = boundaries[index + 1];
    const probability = predictClassificationProbability(run, (lower + upper) / 2, treeCount);
    return `${index === 0 ? "M" : "L"}${xScale(lower).toFixed(2)},${yScale(probability).toFixed(2)}L${xScale(upper).toFixed(2)},${yScale(probability).toFixed(2)}`;
  }).join("");
}

function correctionPath(tree: BoostingTree): string {
  return boostingTreeLeafSegments(tree).map((segment, index) => (
    `${index === 0 ? "M" : "L"}${xScale(segment.lower).toFixed(2)},${yScale(segment.prediction, true).toFixed(2)}L${xScale(segment.upper).toFixed(2)},${yScale(segment.prediction, true).toFixed(2)}`
  )).join("");
}

function Axes({ residual = false }: { residual?: boolean }) {
  const ticks = residual ? [-1, 0, 1] : [0, 0.5, 1];
  return <>{ticks.map((tick) => <g key={tick}><line className={tick === 0 && residual ? styles.zeroLine : styles.gridline} x1={CHART.left} x2={CHART.width - CHART.right} y1={yScale(tick, residual)} y2={yScale(tick, residual)} /><text className={styles.tick} x={CHART.left - 7} y={yScale(tick, residual) + 4} textAnchor="end">{tick}</text></g>)}<line className={styles.axis} x1={CHART.left} x2={CHART.width - CHART.right} y1={CHART.bottom} y2={CHART.bottom} />{[-3, 0, 3].map((tick) => <text className={styles.tick} x={xScale(tick)} y={CHART.bottom + 19} textAnchor="middle" key={tick}>{tick}</text>)}<text className={styles.axisLabel} x={(CHART.left + CHART.width - CHART.right) / 2} y={CHART.height - 7} textAnchor="middle">input x</text></>;
}

function ProbabilityPlot({
  run,
  treeCount,
  selectedIndex,
  onSelectedIndex,
  locale,
}: {
  run: ClassificationRun;
  treeCount: number;
  selectedIndex: number | null;
  onSelectedIndex: (index: number | null) => void;
  locale: GradientBoostingLocale;
}) {
  const pt = isPt(locale);
  const selectNearest = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    const local = ((clientX - rect.left) / rect.width) * CHART.width;
    const x = -3 + ((local - CHART.left) / (CHART.width - CHART.left - CHART.right)) * 6;
    let nearest = 0;
    run.training.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(run.training[nearest].x - x)) nearest = index;
    });
    onSelectedIndex(nearest);
  };
  const handlePointer = (event: PointerEvent<SVGSVGElement>) => selectNearest(event.clientX, event.currentTarget);
  const handleKeyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Escape") return onSelectedIndex(null);
    if (event.key === "Home") return onSelectedIndex(0);
    if (event.key === "End") return onSelectedIndex(run.training.length - 1);
    const current = selectedIndex ?? Math.floor(run.training.length / 2);
    onSelectedIndex(Math.max(0, Math.min(run.training.length - 1, current + (event.key === "ArrowRight" ? 1 : -1))));
  };
  return (
    <svg className={styles.chart} viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label={pt ? `Rótulos de classe e probabilidade estimada da classe um após ${treeCount} ${treeWord(treeCount, locale)}. Use as setas para a esquerda e para a direita para inspecionar as observações.` : `Class labels and estimated class-one probability after ${treeCount} trees. Use left and right arrow keys to inspect observations.`} tabIndex={0} onPointerMove={handlePointer} onPointerDown={handlePointer} onPointerLeave={() => onSelectedIndex(null)} onKeyDown={handleKeyboard}>
      <title>{pt ? "Probabilidade atual da classe um" : "Current probability of class one"}</title><desc>{pt ? "As observações binárias permanecem fixas em zero e um. Uma curva verde por partes mostra a probabilidade obtida ao aplicar a sigmoid ao modelo logit acumulado." : "Binary observations remain fixed at zero and one. A green piecewise curve shows the probability obtained by applying sigmoid to the accumulated logit model."}</desc>
      <Axes />
      {treeCount > 0 && <path className={styles.previousLine} d={probabilityPath(run, treeCount - 1)} />}
      <path className={styles.modelLine} d={probabilityPath(run, treeCount)} />
      {run.training.map((point, index) => point.y === 1
        ? <path className={index === selectedIndex ? styles.classOneSelected : styles.classOnePoint} d={`M${xScale(point.x)},${yScale(1) - 4.3}l4.3,4.3l-4.3,4.3l-4.3,-4.3z`} key={point.id} />
        : <circle className={index === selectedIndex ? styles.selectedPoint : styles.classZeroPoint} cx={xScale(point.x)} cy={yScale(0)} r={index === selectedIndex ? 5 : 3} key={point.id} />)}
      <text className={styles.directLabel} x={xScale(2.12)} y={yScale(predictClassificationProbability(run, 2.12, treeCount)) - 9}>p{treeCount}(x)</text>
      <text className={styles.classRailLabel} x={CHART.left + 5} y={yScale(1) - 8}>{pt ? "classe 1" : "class 1"}</text><text className={styles.classRailLabel} x={CHART.left + 5} y={yScale(0) - 8}>{pt ? "classe 0" : "class 0"}</text>
    </svg>
  );
}

function PseudoResidualPlot({ run, treeCount, locale }: { run: ClassificationRun; treeCount: number; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const probabilities = treeCount === 0
    ? run.training.map(() => run.baseProbability)
    : run.stages[treeCount - 1].trainingProbabilities;
  const residuals = run.training.map((point, index) => point.y - probabilities[index]);
  const nextTree = treeCount < 4 ? run.stages[treeCount].tree : undefined;
  return (
    <svg className={styles.chart} viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label={pt ? `Pseudo-resíduos y menos probabilidade após ${treeCount} ${treeWord(treeCount, locale)}.` : `Pseudo-residuals y minus probability after ${treeCount} trees.`}>
      <title>{pt ? "Sinal atual de correção dos pseudo-resíduos" : "Current pseudo-residual correction signal"}</title><desc>{pt ? "Cada observação mantém sua coordenada de input e se move para y menos a probabilidade atual da classe um. A linha em degraus âmbar é a próxima árvore rasa ajustada a esse sinal." : "Each observation keeps its input coordinate and moves to y minus the current class-one probability. The amber step line is the next shallow tree fitted to this signal."}</desc>
      <Axes residual />
      {run.training.map((point, index) => <circle className={styles.residualPoint} cx={xScale(point.x)} cy={yScale(residuals[index], true)} r="2.8" key={point.id} />)}
      {nextTree && <path className={styles.correctionLine} d={correctionPath(nextTree)} />}
      <text className={styles.directLabelMuted} x={xScale(2.14)} y={yScale(0, true) - 8}>zero</text>
      {nextTree && <text className={styles.warmDirectLabel} x={xScale(1.95)} y={yScale(predictBoostingTree(nextTree, 1.95), true) - 8}>h{treeCount + 1}(x)</text>}
    </svg>
  );
}

function MiniTree({ active = false }: { active?: boolean }) {
  return <svg className={active ? styles.treeGlyphActive : styles.treeGlyph} viewBox="0 0 36 30" aria-hidden="true"><path d="M18 4V12M18 12L8 23M18 12L28 23" /><circle cx="18" cy="4" r="3" /><circle cx="8" cy="23" r="3" /><circle cx="28" cy="23" r="3" /></svg>;
}

function LogitContributionStrip({ run, treeCount, selectedIndex, locale }: { run: ClassificationRun; treeCount: number; selectedIndex: number | null; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const point = selectedIndex == null ? undefined : run.training[selectedIndex];
  const previousLogit = point && treeCount > 1 ? predictClassificationLogit(run, point.x, treeCount - 1) : undefined;
  const activeContribution = point && treeCount > 0
    ? run.learningRate * predictBoostingTree(run.stages[treeCount - 1].tree, point.x)
    : undefined;
  const logitValue = point ? predictClassificationLogit(run, point.x, treeCount) : undefined;
  const probability = point ? predictClassificationProbability(run, point.x, treeCount) : undefined;
  const sourceLabel = treeCount > 1 ? (pt ? `modelo anterior F${treeCount - 1}` : `previous model F${treeCount - 1}`) : "baseline logit";
  const sourceValue = treeCount > 1 ? previousLogit : run.baseLogit;
  return (
    <div className={styles.classificationStrip} aria-label={point ? (pt ? `Atualização logit mais recente e probabilidade resultante em x ${formatBoostingNumber(point.x, 2, locale)}` : `Latest logit update and resulting probability at x ${formatBoostingNumber(point.x)}`) : (pt ? "Modelo atual mais a correção da árvore mais recente, seguido pela sigmoid" : "Current model plus the newest tree correction, followed by sigmoid")}>
      <div className={styles.baseTerm}><span>{sourceLabel}</span><strong>{sourceValue === undefined ? "score" : formatBoostingNumber(sourceValue, 3, locale)}</strong></div>
      {treeCount > 0 && <div className={styles.compactTreeTerm}><b>+</b><span><MiniTree active />ηh{treeCount}</span>{activeContribution !== undefined && <strong>{formatBoostingNumber(activeContribution, 2, locale)}</strong>}</div>}
      <div className={styles.totalTerm}><b>=</b><span>logit F{treeCount}</span><strong>{logitValue === undefined ? "score" : formatBoostingNumber(logitValue, 3, locale)}</strong></div>
      <div className={styles.sigmoidTerm}><b aria-hidden="true">→</b><span>sigmoid</span><strong>{probability === undefined ? `p${treeCount}` : formatBoostingNumber(probability, 2, locale)}</strong></div>
      <p>{point ? `x ${formatBoostingNumber(point.x, 2, locale)} · ${pt ? "classe" : "class"} ${point.y}` : (pt ? "passe o cursor ou focalize um ponto" : "hover or focus a point")}</p>
    </div>
  );
}

export function GradientBoostingClassificationPlayground({ locale = "en" }: { locale?: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const id = useId();
  const run = useMemo(() => runClassificationBoosting(0.8, 4), []);
  const [treeCount, setTreeCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const loss = treeCount === 0
    ? -(run.baseProbability * Math.log(run.baseProbability) + (1 - run.baseProbability) * Math.log(1 - run.baseProbability))
    : run.stages[treeCount - 1].trainingLogLoss;

  useEffect(() => {
    if (!playing) return undefined;
    if (treeCount >= 4) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setTreeCount((value) => value + 1), 1100);
    return () => window.clearTimeout(timer);
  }, [playing, treeCount]);

  const togglePlaying = () => {
    if (!playing && treeCount >= 4) setTreeCount(0);
    setPlaying((value) => !value);
  };
  const advanceOneTree = () => {
    setPlaying(false);
    setTreeCount((value) => Math.min(4, value + 1));
  };

  return (
    <section className={styles.playground} aria-labelledby={`${id}-title`} data-gradient-boosting-playground="classification">
      <div className={styles.playgroundHeader}><strong id={`${id}-title`}>{pt ? "O loop de correção sobrevive a uma nova loss" : "The correction loop survives a new loss"}</strong><span>{treeCount} {treeWord(treeCount, locale)} · η {pt ? "0,80" : "0.80"} · log loss {formatBoostingNumber(loss, 3, locale)}</span></div>
      <p className={styles.stageNarration}>{treeCount === 0 ? (pt ? "Comece pela taxa da classe um: p₀ = 0,40 e F₀ = −0,405." : "Start from the class-one rate: p₀ = 0.40 and F₀ = −0.405.") : (pt ? `A árvore ${treeCount} foi adicionada ao logit. As probabilidades alteradas criam o próximo sinal y − p.` : `Tree ${treeCount} was added to the logit. The changed probabilities create the next y − p signal.`)}</p>
      <div className={styles.processGrid}>
        <section className={styles.predictionPanel}><div className={styles.panelTitle}><strong>{pt ? "Probabilidade da classe 1" : "Probability of class 1"}</strong><span>{pt ? "os rótulos permanecem fixos" : "labels stay fixed"}</span></div><ProbabilityPlot run={run} treeCount={treeCount} selectedIndex={selectedIndex} onSelectedIndex={setSelectedIndex} locale={locale} /></section>
        <section className={styles.residualPanel}><div className={styles.panelTitle}><strong>{pt ? "Sinal de correção y − p" : "Correction signal y − p"}</strong><span>{treeCount < 4 ? (pt ? `próxima árvore h${treeCount + 1}` : `next tree h${treeCount + 1}`) : (pt ? "após quatro árvores" : "after four trees")}</span></div><PseudoResidualPlot run={run} treeCount={treeCount} locale={locale} /></section>
      </div>
      <LogitContributionStrip run={run} treeCount={treeCount} selectedIndex={selectedIndex} locale={locale} />
      <div className={styles.roundControls}>
        <button type="button" className={styles.playButton} onClick={togglePlaying}>{playing ? (pt ? "Pausar" : "Pause") : treeCount >= 4 ? (pt ? "Repetir" : "Replay") : (pt ? "Reproduzir" : "Play")}</button>
        <button type="button" className={styles.nextStepButton} onClick={advanceOneTree} disabled={treeCount >= 4}>
          {treeCount >= 4 ? (pt ? "Todas as etapas concluídas" : "All steps complete") : (pt ? `Próxima: adicionar árvore ${treeCount + 1}` : `Next: add tree ${treeCount + 1}`)}
        </button>
        <span>{pt ? "árvores concluídas" : "completed trees"}</span>
        <div className={styles.roundButtons} aria-label={pt ? "Escolha a rodada de boosting para classificação" : "Choose classification boosting round"}>{[0, 1, 2, 3, 4].map((value) => <button type="button" className={value === treeCount ? styles.roundButtonActive : styles.roundButton} aria-pressed={value === treeCount} onClick={() => { setPlaying(false); setTreeCount(value); }} key={value}>{value}</button>)}</div>
      </div>
      <p className={styles.srOnly} aria-live="polite">{pt ? `Após ${treeCount} ${treeWord(treeCount, locale)}, a log loss de treino é ${formatBoostingNumber(loss, 3, locale)}. A curva de probabilidade é a sigmoid do modelo logit aditivo.${selectedIndex == null ? "" : ` Observação selecionada x ${formatBoostingNumber(run.training[selectedIndex].x, 2, locale)}, classe ${run.training[selectedIndex].y}, logit ${formatBoostingNumber(predictClassificationLogit(run, run.training[selectedIndex].x, treeCount), 3, locale)}, probabilidade ${formatBoostingNumber(predictClassificationProbability(run, run.training[selectedIndex].x, treeCount), 2, locale)}.`}` : `After ${treeCount} ${treeWord(treeCount, locale)}, training log loss is ${formatBoostingNumber(loss, 3)}. The probability curve is the sigmoid of the additive logit model.${selectedIndex == null ? "" : ` Selected observation x ${formatBoostingNumber(run.training[selectedIndex].x)}, class ${run.training[selectedIndex].y}, logit ${formatBoostingNumber(predictClassificationLogit(run, run.training[selectedIndex].x, treeCount), 3)}, probability ${formatBoostingNumber(predictClassificationProbability(run, run.training[selectedIndex].x, treeCount))}.`}`}</p>
    </section>
  );
}
