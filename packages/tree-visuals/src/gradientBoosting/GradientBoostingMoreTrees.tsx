import { useEffect, useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./GradientBoosting.module.css";
import { formatBoostingNumber, isPt, treeWord, type GradientBoostingLocale } from "./locale";
import {
  BOOSTING_EXPERIMENT,
  boostingTreeLeafSegments,
  predictBoostingRun,
  predictBoostingTree,
  rootMeanSquaredError,
  runGradientBoosting,
  type BoostingRun,
  type BoostingTree,
} from "./experiment";

const PLOT = { width: 470, height: 265, left: 42, right: 14, top: 22, bottom: 222 };
const RESIDUAL_DOMAIN = 1.4;
const HISTOGRAM_DOMAIN = 1.4;

function xScale(value: number): number {
  return PLOT.left + ((value - BOOSTING_EXPERIMENT.xMinimum) / 6) * (PLOT.width - PLOT.left - PLOT.right);
}

function yScale(value: number, residual = false): number {
  const minimum = residual ? -RESIDUAL_DOMAIN : BOOSTING_EXPERIMENT.yMinimum;
  const maximum = residual ? RESIDUAL_DOMAIN : BOOSTING_EXPERIMENT.yMaximum;
  return PLOT.bottom - ((value - minimum) / (maximum - minimum)) * (PLOT.bottom - PLOT.top);
}

function treeThresholds(tree: BoostingTree): number[] {
  if (tree.kind === "leaf") return [];
  return [tree.threshold, ...treeThresholds(tree.left), ...treeThresholds(tree.right)];
}

function modelPath(run: BoostingRun, treeCount: number): string {
  if (treeCount === 0) {
    return `M${xScale(-3)},${yScale(run.basePrediction)}L${xScale(3)},${yScale(run.basePrediction)}`;
  }
  const boundaries = [
    BOOSTING_EXPERIMENT.xMinimum,
    ...run.stages.slice(0, treeCount).flatMap((stage) => treeThresholds(stage.tree)),
    BOOSTING_EXPERIMENT.xMaximum,
  ].sort((left, right) => left - right).filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]) > 1e-9);
  return boundaries.slice(0, -1).map((lower, index) => {
    const upper = boundaries[index + 1];
    const prediction = predictBoostingRun(run, (lower + upper) / 2, treeCount);
    return `${index === 0 ? "M" : "L"}${xScale(lower).toFixed(2)},${yScale(prediction).toFixed(2)}L${xScale(upper).toFixed(2)},${yScale(prediction).toFixed(2)}`;
  }).join("");
}

function correctionPath(tree: BoostingTree): string {
  return boostingTreeLeafSegments(tree).map((segment, index) => (
    `${index === 0 ? "M" : "L"}${xScale(segment.lower).toFixed(2)},${yScale(segment.prediction, true).toFixed(2)}L${xScale(segment.upper).toFixed(2)},${yScale(segment.prediction, true).toFixed(2)}`
  )).join("");
}

function predictionsAt(run: BoostingRun, treeCount: number): number[] {
  if (treeCount === 0) return run.training.map(() => run.basePrediction);
  return run.stages[treeCount - 1].trainingPredictions;
}

function residualsAt(run: BoostingRun, treeCount: number): number[] {
  const predictions = predictionsAt(run, treeCount);
  return run.training.map((point, index) => point.y - predictions[index]);
}

function PlotAxes({ residual = false }: { residual?: boolean }) {
  return (
    <>
      {[-1, 0, 1].map((tick) => (
        <g key={tick}>
          <line className={tick === 0 && residual ? styles.zeroLine : styles.gridline} x1={PLOT.left} x2={PLOT.width - PLOT.right} y1={yScale(tick, residual)} y2={yScale(tick, residual)} />
          <text className={styles.tick} x={PLOT.left - 7} y={yScale(tick, residual) + 4} textAnchor="end">{tick}</text>
        </g>
      ))}
      <line className={styles.axis} x1={PLOT.left} x2={PLOT.width - PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} />
      {[-3, 0, 3].map((tick) => <text className={styles.tick} x={xScale(tick)} y={PLOT.bottom + 19} textAnchor="middle" key={tick}>{tick}</text>)}
      <text className={styles.axisLabel} x={(PLOT.left + PLOT.width - PLOT.right) / 2} y={PLOT.height - 8} textAnchor="middle">input x</text>
    </>
  );
}

function PredictionPlot({
  run,
  treeCount,
  previousTreeCount,
  showErrors,
  selectedIndex,
  onSelectedIndex,
  locale,
}: {
  run: BoostingRun;
  treeCount: number;
  previousTreeCount?: number;
  showErrors?: boolean;
  selectedIndex?: number | null;
  onSelectedIndex?: (index: number | null) => void;
  locale: GradientBoostingLocale;
}) {
  const pt = isPt(locale);
  const predictions = predictionsAt(run, treeCount);
  const selectNearest = (clientX: number, target: SVGSVGElement) => {
    if (!onSelectedIndex) return;
    const rect = target.getBoundingClientRect();
    const local = ((clientX - rect.left) / rect.width) * PLOT.width;
    const value = BOOSTING_EXPERIMENT.xMinimum + ((local - PLOT.left) / (PLOT.width - PLOT.left - PLOT.right)) * 6;
    let nearest = 0;
    run.training.forEach((point, index) => {
      if (Math.abs(point.x - value) < Math.abs(run.training[nearest].x - value)) nearest = index;
    });
    onSelectedIndex(nearest);
  };
  const handlePointer = (event: PointerEvent<SVGSVGElement>) => selectNearest(event.clientX, event.currentTarget);
  const handleKeyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!onSelectedIndex || !["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Escape") return onSelectedIndex(null);
    if (event.key === "Home") return onSelectedIndex(0);
    if (event.key === "End") return onSelectedIndex(run.training.length - 1);
    const current = selectedIndex ?? Math.floor(run.training.length / 2);
    onSelectedIndex(Math.max(0, Math.min(run.training.length - 1, current + (event.key === "ArrowRight" ? 1 : -1))));
  };

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
      role="img"
      aria-label={pt ? `Targets de treino e modelo após ${treeCount} ${treeWord(treeCount, locale)}.` : `Training targets and model after ${treeCount} ${treeWord(treeCount, locale)}.`}
      tabIndex={onSelectedIndex ? 0 : undefined}
      onPointerMove={handlePointer}
      onPointerDown={handlePointer}
      onPointerLeave={() => onSelectedIndex?.(null)}
      onKeyDown={handleKeyboard}
    >
      <title>{pt ? "Predição atual do ensemble" : "Current ensemble prediction"}</title>
      <desc>{pt ? "Os targets observados permanecem fixos enquanto o ensemble constante por partes muda conforme as árvores são adicionadas." : "Observed targets remain fixed while the piecewise constant ensemble changes as trees are added."}</desc>
      <PlotAxes />
      {previousTreeCount !== undefined && previousTreeCount !== treeCount && <path className={styles.previousLine} d={modelPath(run, previousTreeCount)} />}
      {showErrors && run.training.map((point, index) => (
        <line className={styles.residualSegment} x1={xScale(point.x)} x2={xScale(point.x)} y1={yScale(predictions[index])} y2={yScale(point.y)} key={`error-${point.id}`} />
      ))}
      <path className={styles.modelLine} d={modelPath(run, treeCount)} />
      {run.training.map((point, index) => (
        <circle className={index === selectedIndex ? styles.selectedPoint : styles.point} cx={xScale(point.x)} cy={yScale(point.y)} r={index === selectedIndex ? 5 : 2.8} key={point.id} />
      ))}
      <text className={styles.directLabel} x={xScale(2.12)} y={yScale(predictBoostingRun(run, 2.12, treeCount)) - 8}>F{treeCount === 0 ? "₀" : treeCount === 1 ? "₁" : treeCount === 2 ? "₂" : treeCount === 3 ? "₃" : "₄"}(x)</text>
    </svg>
  );
}

function ResidualPlot({ run, treeCount, correctionTree, locale }: { run: BoostingRun; treeCount: number; correctionTree?: BoostingTree; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const residuals = residualsAt(run, treeCount);
  return (
    <svg className={styles.chart} viewBox={`0 0 ${PLOT.width} ${PLOT.height}`} role="img" aria-label={pt ? `Resíduos restantes após ${treeCount} ${treeWord(treeCount, locale)}.` : `Residuals remaining after ${treeCount} trees.`}>
      <title>{pt ? "Resíduos restantes" : "Remaining residuals"}</title>
      <desc>{pt ? "Cada ponto mantém sua coordenada de input e se move para a diferença com sinal entre seu target e a predição atual." : "Each point keeps its input coordinate and moves to the signed difference between its target and current prediction."}</desc>
      <PlotAxes residual />
      {run.training.map((point, index) => <circle className={styles.residualPoint} cx={xScale(point.x)} cy={yScale(residuals[index], true)} r="2.8" key={point.id} />)}
      {correctionTree && <path className={styles.correctionLine} d={correctionPath(correctionTree)} />}
      <text className={styles.directLabelMuted} x={xScale(2.15)} y={yScale(0, true) - 8}>zero</text>
    </svg>
  );
}

function TreeGlyph({ active = false }: { active?: boolean }) {
  return (
    <svg className={active ? styles.treeGlyphActive : styles.treeGlyph} viewBox="0 0 36 30" aria-hidden="true">
      <path d="M18 4V12M18 12L8 23M18 12L28 23" />
      <circle cx="18" cy="4" r="3" /><circle cx="8" cy="23" r="3" /><circle cx="28" cy="23" r="3" />
    </svg>
  );
}

function ContributionStrip({ run, treeCount, selectedIndex, activeTree, pendingTree, locale }: { run: BoostingRun; treeCount: number; selectedIndex?: number | null; activeTree?: number; pendingTree?: number; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const point = selectedIndex == null ? undefined : run.training[selectedIndex];
  const visibleTreeCount = Math.max(treeCount, pendingTree ?? 0);
  const terms = run.stages.slice(0, visibleTreeCount).map((stage) => point ? run.learningRate * predictBoostingTree(stage.tree, point.x) : undefined);
  const includedTerms = terms.slice(0, treeCount);
  const final = point ? run.basePrediction + includedTerms.reduce<number>((sum, value) => sum + (value ?? 0), 0) : undefined;
  return (
    <div className={styles.contributionStrip} aria-label={point ? (pt ? `Contribuições para a predição em x ${formatBoostingNumber(point.x, 2, locale)}` : `Prediction contributions at x ${formatBoostingNumber(point.x)}`) : (pt ? `Modelo aditivo com ${treeCount} ${treeWord(treeCount, locale)}` : `Additive model with ${treeCount} trees`)}>
      <div className={styles.baseTerm}><span>baseline</span><strong>{formatBoostingNumber(run.basePrediction, 2, locale)}</strong></div>
      {terms.map((value, index) => (
        <div className={styles.treeTerm} key={index}>
          <b aria-hidden="true">+</b>
          <span><TreeGlyph active={activeTree === index + 1} />h{index + 1}</span>
          <strong>{value === undefined ? `η × ${pt ? "árvore" : "tree"} ${index + 1}` : formatBoostingNumber(value, 2, locale)}</strong>
        </div>
      ))}
      {treeCount > 0 && <div className={styles.totalTerm}><b>=</b><span>{pt ? "predição" : "prediction"}</span><strong>{final === undefined ? `F${treeCount}` : formatBoostingNumber(final, 2, locale)}</strong></div>}
      {point && <p className={styles.inspectLabel}>{pt ? "em" : "at"} x = {formatBoostingNumber(point.x, 2, locale)}</p>}
    </div>
  );
}

function RoundControls({
  count,
  onCount,
  playing,
  onPlaying,
  label,
  replayFromStart = false,
  onNextStep,
  nextStepLabel,
  nextStepDisabled = false,
  locale,
}: {
  count: number;
  onCount: (count: number) => void;
  playing: boolean;
  onPlaying: (playing: boolean) => void;
  label: string;
  replayFromStart?: boolean;
  onNextStep?: () => void;
  nextStepLabel?: string;
  nextStepDisabled?: boolean;
  locale: GradientBoostingLocale;
}) {
  const pt = isPt(locale);
  const handlePlay = () => {
    if (playing) {
      onPlaying(false);
      return;
    }
    if (replayFromStart) onCount(0);
    onPlaying(true);
  };

  return (
    <div className={styles.roundControls}>
      <button type="button" className={styles.playButton} onClick={handlePlay}>{playing ? (pt ? "Pausar" : "Pause") : replayFromStart || count >= 4 ? (pt ? "Repetir" : "Replay") : (pt ? "Reproduzir" : "Play")}</button>
      {onNextStep && (
        <button type="button" className={styles.nextStepButton} onClick={onNextStep} disabled={nextStepDisabled}>
          {nextStepDisabled ? (pt ? "Todas as etapas concluídas" : "All steps complete") : `${pt ? "Próxima" : "Next"}: ${nextStepLabel}`}
        </button>
      )}
      <span>{label}</span>
      <div className={styles.roundButtons} aria-label={pt ? "Escolha a rodada de boosting" : "Choose boosting round"}>
        {[0, 1, 2, 3, 4].map((value) => <button type="button" className={value === count ? styles.roundButtonActive : styles.roundButton} aria-pressed={value === count} onClick={() => { onPlaying(false); onCount(value); }} key={value}>{value}</button>)}
      </div>
    </div>
  );
}

export function GradientBoostingProcessAnimation({ locale = "en" }: { locale?: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const id = useId();
  const run = useMemo(() => runGradientBoosting(0.6, 4), []);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const round = Math.min(4, Math.floor((frame + 2) / 3));
  const phase = frame === 0 ? "baseline" : ["measure", "fit", "add"][(frame - 1) % 3];
  const activeRound = Math.min(4, Math.floor((frame - 1) / 3) + 1);
  const displayedTrees = phase === "add" ? activeRound : Math.max(0, activeRound - 1);

  useEffect(() => {
    if (!playing) return undefined;
    if (frame >= 12) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setFrame((value) => value + 1), 1050);
    return () => window.clearTimeout(timer);
  }, [frame, playing]);

  const setRound = (value: number) => setFrame(value === 0 ? 0 : value * 3);
  const togglePlaying = (next: boolean) => {
    if (next && frame >= 12) setFrame(0);
    setPlaying(next);
  };
  const advanceOneStep = () => {
    setPlaying(false);
    setFrame((value) => Math.min(12, value + 1));
  };
  const residualTree = phase === "fit" && activeRound > 0 ? run.stages[activeRound - 1].tree : undefined;
  const phaseText = phase === "baseline" ? (pt ? "Comece com uma predição constante." : "Start from one constant prediction.")
    : phase === "measure" ? (pt ? `Rodada ${activeRound}: meça o que o modelo atual ainda não captura.` : `Round ${activeRound}: measure what the current model still misses.`)
      : phase === "fit" ? (pt ? `Rodada ${activeRound}: ajuste uma árvore rasa a esses resíduos.` : `Round ${activeRound}: fit a shallow tree to those residuals.`)
        : (pt ? `Rodada ${activeRound}: adicione a árvore escalada e mantenha o modelo anterior como um fantasma.` : `Round ${activeRound}: add the scaled tree and keep the previous model as a ghost.`);
  const nextStepLabel = phase === "baseline" || phase === "add" ? (pt ? "medir erros" : "measure errors")
    : phase === "measure" ? (pt ? `ajustar árvore ${activeRound}` : `fit tree ${activeRound}`)
      : (pt ? `adicionar árvore ${activeRound}` : `add tree ${activeRound}`);

  return (
    <section className={styles.playground} aria-labelledby={`${id}-title`} data-gradient-boosting-animation="process">
      <div className={styles.playgroundHeader}><strong id={`${id}-title`}>{pt ? "Uma rodada de boosting muda o problema seguinte" : "One boosting round changes the next problem"}</strong><span>η {pt ? "0,60" : "0.60"} · {pt ? "quatro árvores de profundidade dois" : "four depth-two trees"}</span></div>
      <p className={styles.stageNarration}>{phaseText}</p>
      <div className={styles.processGrid}>
        <section className={styles.predictionPanel}><div className={styles.panelTitle}><strong>{pt ? "Predição atual" : "Current prediction"}</strong><span>{displayedTrees} {treeWord(displayedTrees, locale)}</span></div><PredictionPlot run={run} treeCount={displayedTrees} previousTreeCount={phase === "add" ? Math.max(0, displayedTrees - 1) : undefined} showErrors={phase === "measure"} locale={locale} /></section>
        <section className={styles.residualPanel}><div className={styles.panelTitle}><strong>{pt ? "Próximo target" : "Next target"}</strong><span>{phase === "fit" ? (pt ? `ajustar h${activeRound}` : `fit h${activeRound}`) : "residual"}</span></div><ResidualPlot run={run} treeCount={Math.max(0, activeRound - 1)} correctionTree={residualTree} locale={locale} /></section>
      </div>
      <ContributionStrip run={run} treeCount={displayedTrees} activeTree={phase === "fit" || phase === "add" ? activeRound : undefined} pendingTree={phase === "fit" ? activeRound : undefined} locale={locale} />
      <RoundControls
        count={round}
        onCount={setRound}
        playing={playing}
        onPlaying={togglePlaying}
        label={pt ? "rodada atual" : "current round"}
        replayFromStart
        onNextStep={advanceOneStep}
        nextStepLabel={nextStepLabel}
        nextStepDisabled={frame >= 12}
        locale={locale}
      />
      <p className={styles.srOnly} aria-live="polite">{phaseText}</p>
    </section>
  );
}

function histogramBins(values: number[]) {
  const count = 11;
  const width = (HISTOGRAM_DOMAIN * 2) / count;
  return Array.from({ length: count }, (_, index) => {
    const lower = -HISTOGRAM_DOMAIN + index * width;
    return { lower, upper: lower + width, count: values.filter((value) => value >= lower && (index === count - 1 ? value <= lower + width : value < lower + width)).length };
  });
}

function ResidualHistogram({ residuals, locale }: { residuals: number[]; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const bins = histogramBins(residuals);
  const maximum = Math.max(...bins.map((bin) => bin.count), 1);
  const x = (value: number) => 28 + ((value + HISTOGRAM_DOMAIN) / (HISTOGRAM_DOMAIN * 2)) * 214;
  const y = (value: number) => 152 - (value / maximum) * 116;
  return (
    <svg className={styles.chart} viewBox="0 0 260 182" role="img" aria-label={pt ? "Histograma dos resíduos de treino atuais, centrado em zero" : "Histogram of current training residuals centered on zero"}>
      <title>{pt ? "Distribuição dos resíduos restantes" : "Remaining residual distribution"}</title>
      {bins.map((bin, index) => <rect className={styles.histogramBar} x={x(bin.lower) + 1} y={y(bin.count)} width={Math.max(1, x(bin.upper) - x(bin.lower) - 2)} height={152 - y(bin.count)} key={index} />)}
      <line className={styles.histogramZero} x1={x(0)} x2={x(0)} y1="25" y2="156" />
      <line className={styles.axis} x1="28" x2="242" y1="152" y2="152" />
      <text className={styles.histogramLabel} x="28" y="170" textAnchor="middle">−1.4</text><text className={styles.histogramLabel} x={x(0)} y="170" textAnchor="middle">0</text><text className={styles.histogramLabel} x="242" y="170" textAnchor="middle">1.4</text>
    </svg>
  );
}

function ErrorTrace({ values, count, locale }: { values: number[]; count: number; locale: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const x = (index: number) => 34 + (index / 4) * 206;
  const y = (value: number) => 151 - ((value - 0.1) / 0.62) * 112;
  const path = values.slice(0, count + 1).map((value, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(value)}`).join("");
  return (
    <svg className={styles.chart} viewBox="0 0 260 182" role="img" aria-label={pt ? `O RMSE de treino após ${count} ${treeWord(count, locale)} é ${formatBoostingNumber(values[count], 3, locale)}` : `Training RMSE after ${count} trees is ${formatBoostingNumber(values[count], 3)}`}>
      <title>{pt ? "Erro ao longo das rodadas de boosting" : "Error across boosting rounds"}</title>
      {[0.2, 0.4, 0.6].map((tick) => <g key={tick}><line className={styles.gridline} x1="34" x2="240" y1={y(tick)} y2={y(tick)} /><text className={styles.histogramLabel} x="28" y={y(tick) + 3} textAnchor="end">{tick.toFixed(1)}</text></g>)}
      <line className={styles.axis} x1="34" x2="240" y1="151" y2="151" />
      <path className={styles.errorLine} d={path} />
      {values.slice(0, count + 1).map((value, index) => <circle className={index === count ? styles.errorPointActive : styles.errorPoint} cx={x(index)} cy={y(value)} r={index === count ? 5 : 3.3} key={index} />)}
      {[0, 1, 2, 3, 4].map((tick) => <text className={styles.histogramLabel} x={x(tick)} y="170" textAnchor="middle" key={tick}>{tick}</text>)}
    </svg>
  );
}

export function GradientBoostingErrorAnimation({ locale = "en" }: { locale?: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const id = useId();
  const run = useMemo(() => runGradientBoosting(0.6, 4), []);
  const [count, setCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const residuals = residualsAt(run, count);
  const baselineRmse = rootMeanSquaredError(run.training.map((point) => point.y), run.training.map(() => run.basePrediction));
  const errors = [baselineRmse, ...run.stages.map((stage) => stage.trainingRmse)];

  useEffect(() => {
    if (!playing) return undefined;
    if (count >= 4) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setCount((value) => value + 1), 1050);
    return () => window.clearTimeout(timer);
  }, [count, playing]);

  const togglePlaying = (next: boolean) => {
    if (next && count >= 4) setCount(0);
    setPlaying(next);
  };
  const advanceOneTree = () => {
    setPlaying(false);
    setCount((value) => Math.min(4, value + 1));
  };

  return (
    <section className={styles.playground} aria-labelledby={`${id}-title`} data-gradient-boosting-animation="errors">
      <div className={styles.playgroundHeader}><strong id={`${id}-title`}>{pt ? "Correções úteis puxam os erros restantes em direção a zero" : "Useful corrections pull the remaining errors toward zero"}</strong><span>{count} {treeWord(count, locale)} · {pt ? "RMSE de treino" : "training RMSE"} {formatBoostingNumber(errors[count], 3, locale)}</span></div>
      <div className={styles.errorAnimationGrid}>
        <section className={styles.predictionPanel}><div className={styles.panelTitle}><strong>{pt ? "Predição atual" : "Current prediction"}</strong></div><PredictionPlot run={run} treeCount={count} previousTreeCount={count > 0 ? count - 1 : undefined} showErrors locale={locale} /></section>
        <section className={styles.smallEvidencePanel}><div className={styles.panelTitle}><strong>{pt ? "Erros restantes" : "Remaining errors"}</strong></div><ResidualHistogram residuals={residuals} locale={locale} /></section>
        <section className={styles.smallEvidencePanel}><div className={styles.panelTitle}><strong>{pt ? "Erro por árvores" : "Error by trees"}</strong></div><ErrorTrace values={errors} count={count} locale={locale} /></section>
      </div>
      <RoundControls
        count={count}
        onCount={setCount}
        playing={playing}
        onPlaying={togglePlaying}
        label={pt ? "árvores concluídas" : "completed trees"}
        onNextStep={advanceOneTree}
        nextStepLabel={pt ? `adicionar árvore ${Math.min(4, count + 1)}` : `add tree ${Math.min(4, count + 1)}`}
        nextStepDisabled={count >= 4}
        locale={locale}
      />
      <p className={styles.srOnly} aria-live="polite">{pt ? `Após ${count} ${treeWord(count, locale)}, a raiz do erro quadrático médio de treino é ${formatBoostingNumber(errors[count], 3, locale)}.` : `After ${count} trees, training root mean squared error is ${formatBoostingNumber(errors[count], 3)}.`}</p>
    </section>
  );
}

export function GradientBoostingTreeRatePlayground({ locale = "en" }: { locale?: GradientBoostingLocale }) {
  const pt = isPt(locale);
  const id = useId();
  const [learningRate, setLearningRate] = useState(0.6);
  const [treeCount, setTreeCount] = useState(2);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const run = useMemo(() => runGradientBoosting(learningRate, 4), [learningRate]);
  const stage = run.stages[treeCount - 1];

  return (
    <section className={styles.playground} aria-labelledby={`${id}-title`} data-gradient-boosting-playground="tree-rate">
      <div className={styles.playgroundHeader}><strong id={`${id}-title`}>{pt ? "Equilibre o tamanho do passo e o número de árvores" : "Balance step size and number of trees"}</strong><span>{treeCount} {treeWord(treeCount, locale)} · η {formatBoostingNumber(learningRate, 2, locale)} · RMSE {formatBoostingNumber(stage.trainingRmse, 3, locale)}</span></div>
      <div className={styles.processGrid}>
        <section className={styles.predictionPanel}><div className={styles.panelTitle}><strong>{pt ? "Predição composta" : "Composed prediction"}</strong><span>{pt ? "passe o cursor ou focalize para inspecionar x" : "hover or focus to inspect x"}</span></div><PredictionPlot run={run} treeCount={treeCount} previousTreeCount={Math.max(0, treeCount - 1)} showErrors selectedIndex={selectedIndex} onSelectedIndex={setSelectedIndex} locale={locale} /></section>
        <section className={styles.residualPanel}><div className={styles.panelTitle}><strong>{pt ? "O que resta" : "What remains"}</strong><span>{pt ? "após" : "after"} F{treeCount}</span></div><ResidualPlot run={run} treeCount={treeCount} locale={locale} /></section>
      </div>
      <ContributionStrip run={run} treeCount={treeCount} selectedIndex={selectedIndex} locale={locale} />
      <div className={styles.controlArea}>
        <p className={styles.guidance}>{pt ? "Faça uma previsão primeiro: com apenas algumas árvores, um η pequeno vai parar antes do target, ou um η grande vai forçar as árvores posteriores a corrigirem de volta?" : "Predict first: with only a few trees, will a small η stop short, or will a large η force later trees to correct back?"}</p>
        <div className={styles.treeCountControl}><span>{pt ? "Número de árvores" : "Number of trees"}</span><div className={styles.treeCountButtons}>{[1, 2, 3, 4].map((value) => <button type="button" className={value === treeCount ? styles.treeCountButtonActive : styles.treeCountButton} aria-pressed={value === treeCount} onClick={() => setTreeCount(value)} key={value}>{value}</button>)}</div></div>
        <label className={styles.sliderLabel} htmlFor={`${id}-rate`}><span>Learning rate η</span><strong>{formatBoostingNumber(learningRate, 2, locale)}</strong><input id={`${id}-rate`} type="range" min="0.05" max="1.5" step="0.05" value={learningRate} onInput={(event) => setLearningRate(Number(event.currentTarget.value))} onChange={(event) => setLearningRate(Number(event.currentTarget.value))} /></label>
        <div className={styles.sliderTicks} aria-hidden="true"><span>{pt ? "0,05 · cautelosa" : "0.05 · cautious"}</span><span>{pt ? "0,60 · moderada" : "0.60 · measured"}</span><span>{pt ? "1,50 · agressiva" : "1.50 · aggressive"}</span></div>
      </div>
      <p className={styles.srOnly} aria-live="polite">{pt ? `${treeCount} ${treeWord(treeCount, locale)} com learning rate ${formatBoostingNumber(learningRate, 2, locale)}. Raiz do erro quadrático médio de treino ${formatBoostingNumber(stage.trainingRmse, 3, locale)}.` : `${treeCount} trees at learning rate ${formatBoostingNumber(learningRate)}. Training root mean squared error ${formatBoostingNumber(stage.trainingRmse, 3)}.`}</p>
    </section>
  );
}
