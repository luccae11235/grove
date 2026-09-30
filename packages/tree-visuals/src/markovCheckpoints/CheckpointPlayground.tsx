import { markovCountWord, markovNumber, markovText, type MarkovLocale } from "../markovLocale";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CheckpointPlayground.module.css";
import { trainingFrameDelay } from "../markovTrainingMotion";
import {
  applyCheckpointRolloutLimit,
  checkpointPolicyAction,
  createCheckpointEpisode,
  DEFAULT_CHECKPOINT_TRAINING,
  isCheckpointPath,
  MARKOV_CHECKPOINTS,
  stepMarkovCheckpoint,
  trainCheckpointPair,
  trainMarkovCheckpoints,
  type CheckpointCurvePoint,
  type CheckpointObservationMode,
  type CheckpointTrueState,
} from "./experiment";

const CHECKPOINT_EPISODES = DEFAULT_CHECKPOINT_TRAINING.evaluationInterval;

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function pointKey(x: number, y: number) {
  return `${x},${y}`;
}

function linePath(points: readonly CheckpointCurvePoint[]) {
  const left = 38;
  const top = 12;
  const plotWidth = 468;
  const plotHeight = 177;
  return points.map((point, index) => {
    const x = left + (point.episode / DEFAULT_CHECKPOINT_TRAINING.episodes) * plotWidth;
    const y = top + (1 - point.completionRate) * plotHeight;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function ChartFrame({ children, label, axisTitles = false, locale = "en" }: {
  locale?: MarkovLocale;
  children: React.ReactNode;
  label: string;
  axisTitles?: boolean;
}) {
  return (
    <svg className={styles.chart} viewBox="0 0 520 220" role="img" aria-label={label}>
      <g className={styles.grid} aria-hidden="true">
        {[0, 0.5, 1].map((rate) => {
          const y = 12 + (1 - rate) * 177;
          return <g key={rate}><line x1="38" x2="506" y1={y} y2={y} /><text x="31" y={y + 4} textAnchor="end">{Math.round(rate * 100)}</text></g>;
        })}
        {[0, 2000, 4000].map((episode) => {
          const x = 38 + (episode / 4000) * 468;
          return <text key={episode} x={x} y="211" textAnchor={episode === 0 ? "start" : episode === 4000 ? "end" : "middle"}>{episode === 0 ? "0" : `${episode / 1000}k`}</text>;
        })}
      </g>
      {axisTitles ? <>
        <text className={styles.yLabel} x="-101" y="10" transform="rotate(-90)">{markovText(locale, "Completion (%)")}</text>
        <text className={styles.xLabel} x="272" y="218" textAnchor="middle">{markovText(locale, "Training episodes")}</text>
      </> : null}
      {children}
    </svg>
  );
}

function LearningChart({ points, mode, locale }: {
  locale: MarkovLocale;
  points: readonly CheckpointCurvePoint[];
  mode: CheckpointObservationMode;
}) {
  const latest = points[points.length - 1];
  return (
    <div className={styles.chartWrap}>
      <ChartFrame locale={locale} label={locale === "pt-BR" ? `A política com ${mode === "position" ? "apenas a posição" : "posição e próximo checkpoint"} conclui o percurso ordenado em ${percent(latest.completionRate)} das avaliações após ${markovNumber(locale, latest.episode)} episódios de treinamento.` : `${mode === "position" ? "Position-only" : "Position and next-checkpoint"} policy completes the ordered route in ${percent(latest.completionRate)} of evaluations after ${latest.episode} training episodes.`}>
        <path d={linePath(points)} className={`${styles.curve} ${mode === "position" ? styles.positionCurve : styles.progressCurve}`} />
      </ChartFrame>
    </div>
  );
}

function CheckpointBoard({
  state,
  visited = [],
  revealProgress = false,
  showRoute = false,
  locale = "en",
}: {
  locale?: MarkovLocale;
  state: CheckpointTrueState;
  visited?: readonly string[];
  revealProgress?: boolean;
  showRoute?: boolean;
}) {
  const cells = Array.from({
    length: MARKOV_CHECKPOINTS.columns * MARKOV_CHECKPOINTS.rows,
  });
  const currentCheckpoint = MARKOV_CHECKPOINTS.checkpoints.findIndex(
    (checkpoint) => checkpoint.x === state.x && checkpoint.y === state.y,
  );
  const expected = MARKOV_CHECKPOINTS.checkpoints[state.nextCheckpoint];

  return (
    <div
      className={`${styles.board} ${state.rolloutStep === 0 ? styles.resetting : ""}`}
      role="img"
      aria-label={locale === "pt-BR" ? `Grade de checkpoints ordenados. Agente na coluna ${state.x + 1}, linha ${state.y + 1}.${revealProgress ? ` Próximo checkpoint: ${expected?.label ?? "concluído"}.` : " O progresso da tarefa está oculto para o agente."}${state.outcome === "complete" ? " O percurso foi concluído." : state.outcome === "timeout" ? " O percurso atingiu o limite de passos." : ""}` : `Ordered checkpoint grid. Agent at column ${state.x + 1}, row ${state.y + 1}.${revealProgress ? ` Next checkpoint ${expected?.label ?? "complete"}.` : " Task progress is hidden from the agent."}${state.outcome === "complete" ? " The route is complete." : state.outcome === "timeout" ? " The route timed out." : ""}`}
      data-agent-x={state.x}
      data-agent-y={state.y}
      data-next-checkpoint={expected?.label ?? "done"}
      data-outcome={state.outcome ?? "running"}
    >
      {cells.map((_, index) => {
        const x = index % MARKOV_CHECKPOINTS.columns;
        const y = Math.floor(index / MARKOV_CHECKPOINTS.columns);
        const path = isCheckpointPath(x, y);
        return <span
          className={`${styles.cell} ${path ? styles.path : styles.wall} ${path && visited.includes(pointKey(x, y)) ? styles.visited : ""}`}
          key={index}
          aria-hidden="true"
        />;
      })}
      <span className={styles.hub} aria-hidden="true">{markovText(locale, "Hub")}</span>
      {MARKOV_CHECKPOINTS.checkpoints.map((checkpoint, index) => (
        <span
          className={`${styles.checkpoint} ${index < state.nextCheckpoint ? styles.collected : ""} ${revealProgress && index === state.nextCheckpoint ? styles.expected : ""}`}
          style={{ "--checkpoint-x": checkpoint.x, "--checkpoint-y": checkpoint.y } as React.CSSProperties}
          key={checkpoint.label}
          aria-hidden="true"
        >
          {checkpoint.label}
        </span>
      ))}
      <span
        className={styles.agent}
        style={{ "--agent-x": state.x, "--agent-y": state.y } as React.CSSProperties}
        aria-hidden="true"
      />
      {revealProgress ? <span className={styles.nextBadge}>{locale === "pt-BR" ? "Próximo" : "Next"} · {expected?.label ?? (locale === "pt-BR" ? "concluído" : "done")}</span> : null}
      {showRoute ? <span className={styles.routeSequence} aria-hidden="true"><b>A</b><i>→</i><b>B</b><i>→</i><b>C</b></span> : null}
      {state.rolloutStep > 0 && currentCheckpoint >= 0 ? <span className={`${styles.rewardBadge} ${state.reward === 1 ? styles.positiveReward : styles.zeroReward}`}>{state.reward === 1 ? "+1" : "0"}</span> : null}
      {state.outcome ? <span className={state.outcome === "complete" ? styles.completeBadge : styles.timeoutBadge}>{state.outcome === "complete" ? markovText(locale, "Complete") : markovText(locale, "Timed out")}</span> : null}
    </div>
  );
}

function RewardMoment({ expected, reward, locale }: { expected: "B" | "C"; reward: "+1" | "0"; locale: MarkovLocale }) {
  return (
    <div className={styles.rewardCase}>
      <span className={styles.stateLabel}>q = {expected}</span>
      <div className={styles.rewardMoment} aria-hidden="true">
        <span className={styles.miniAgent} />
        <span className={styles.moveArrow}>↑</span>
        <span className={styles.miniCheckpoint}>B</span>
      </div>
      <strong className={reward === "+1" ? styles.rewardPositive : styles.rewardNeutral}>{reward}</strong>
      <small>{markovText(locale, expected === "B" ? "B was expected" : "C was expected")}</small>
    </div>
  );
}

export function CheckpointFigure({ kind, locale = "en" }: { kind: "environment" | "reward"; locale?: MarkovLocale }) {
  if (kind === "environment") {
    return (
      <figure className={`${styles.figure} ${styles.routeFigure}`} data-checkpoint-figure="environment">
        <figcaption>
          <p className={styles.kicker}>{markovText(locale, "The route")}</p>
          <h3>{markovText(locale, "Three open paths. One required order.")}</h3>
        </figcaption>
        <CheckpointBoard state={createCheckpointEpisode()} showRoute locale={locale} />
        <p className={styles.figureNote}>{markovText(locale, "The map never changes. Only the next expected checkpoint does.")}</p>
      </figure>
    );
  }

  return (
    <figure className={`${styles.figure} ${styles.rewardFigure}`} data-checkpoint-figure="reward">
      <figcaption>
        <p className={styles.kicker}>{markovText(locale, "The hidden difference")}</p>
        <h3>{markovText(locale, "Same move into B. Different reward.")}</h3>
      </figcaption>
      <div className={styles.rewardPair}>
        <RewardMoment expected="B" reward="+1" locale={locale} />
        <RewardMoment expected="C" reward="0" locale={locale} />
      </div>
      <p className={styles.figureNote}>{markovText(locale, "Position predicts the movement. Task progress predicts what that movement means.")}</p>
    </figure>
  );
}

export function CheckpointPlayground({ mode, locale = "en" }: { mode: CheckpointObservationMode; locale?: MarkovLocale }) {
  const titleId = `markov-checkpoint-title-${mode}`;
  const results = useMemo(() => trainMarkovCheckpoints(mode), [mode]);
  const [curveIndex, setCurveIndex] = useState(0);
  const [training, setTraining] = useState(false);
  const [running, setRunning] = useState(false);
  const [episodesPerSecond, setEpisodesPerSecond] = useState(400);
  const [state, setState] = useState<CheckpointTrueState>(() => createCheckpointEpisode());
  const [visited, setVisited] = useState<string[]>([pointKey(MARKOV_CHECKPOINTS.hubX, MARKOV_CHECKPOINTS.hubY)]);
  const [runResult, setRunResult] = useState({ complete: 0, timeouts: 0 });
  const curveIndexRef = useRef(curveIndex);
  const maximumCurveIndex = results.curve.length - 1;
  const revealedCurve = results.curve.slice(0, curveIndex + 1);
  const currentPoint = revealedCurve[revealedCurve.length - 1];
  const seesProgress = mode === "progress";
  const trainingFrameMs = trainingFrameDelay(episodesPerSecond);

  useEffect(() => {
    curveIndexRef.current = curveIndex;
  }, [curveIndex]);

  useEffect(() => {
    if (!training) return undefined;
    const checkpointDelay = (CHECKPOINT_EPISODES / episodesPerSecond) * 1_000;
    const timer = window.setInterval(() => {
      setCurveIndex((index) => {
        if (index >= maximumCurveIndex - 1) {
          setTraining(false);
          return maximumCurveIndex;
        }
        return index + 1;
      });
    }, checkpointDelay);
    return () => window.clearInterval(timer);
  }, [episodesPerSecond, maximumCurveIndex, training]);

  useEffect(() => {
    if (!training && !running) return undefined;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.done) {
          setVisited([pointKey(MARKOV_CHECKPOINTS.hubX, MARKOV_CHECKPOINTS.hubY)]);
          return createCheckpointEpisode();
        }
        const qValues = running
          ? results.qValues
          : results.qSnapshots[curveIndexRef.current];
        const next = applyCheckpointRolloutLimit(
          stepMarkovCheckpoint(
            current,
            checkpointPolicyAction(qValues, mode, current),
          ).state,
        );
        setVisited((path) => {
          const key = pointKey(next.x, next.y);
          return path.includes(key) ? path : [...path, key];
        });
        if (running && next.done) {
          setRunResult((result) => next.outcome === "complete"
            ? { ...result, complete: result.complete + 1 }
            : { ...result, timeouts: result.timeouts + 1 });
        }
        return next;
      });
    }, running ? 140 : trainingFrameMs);
    return () => window.clearInterval(timer);
  }, [mode, results.qSnapshots, results.qValues, running, training, trainingFrameMs]);

  function toggleAgent() {
    if (curveIndex >= maximumCurveIndex) {
      if (!running) {
        setState(createCheckpointEpisode());
        setVisited([pointKey(MARKOV_CHECKPOINTS.hubX, MARKOV_CHECKPOINTS.hubY)]);
        setRunResult({ complete: 0, timeouts: 0 });
      }
      setRunning((current) => !current);
      return;
    }
    setRunning(false);
    setTraining((current) => !current);
  }

  return (
    <section
      className={styles.lab}
      role="region"
      aria-labelledby={titleId}
      data-markov-checkpoint-lab
      data-mode={mode}
      data-training={String(training)}
      data-training-frame-ms={trainingFrameMs}
      style={{ "--training-frame-ms": `${trainingFrameMs}ms` } as React.CSSProperties}
    >
      <header className={styles.header}>
        <p className={styles.kicker}>{seesProgress ? markovText(locale, "Experiment 2 · Markov state") : markovText(locale, "Experiment 1 · Broken state")}</p>
        <h3 id={titleId}>{seesProgress ? markovText(locale, "What changes when task progress is part of the state?") : markovText(locale, "Can position alone learn the ordered route?")}</h3>
      </header>

      <div className={styles.experimentBand}>
        <span>{markovText(locale, "Agent sees")}</span>
        <code>{seesProgress ? "z = (p, next)" : "z = p"}</code>
        <strong>{seesProgress ? markovText(locale, "Next checkpoint observed") : markovText(locale, "Task progress hidden")}</strong>
      </div>

      <div className={styles.body}>
        <div className={styles.environmentColumn}>
          <CheckpointBoard state={state} visited={visited} revealProgress={seesProgress} locale={locale} />
          {curveIndex >= maximumCurveIndex ? <div className={styles.runScore} aria-live="polite" data-run-complete={runResult.complete} data-run-timeouts={runResult.timeouts}>
            <strong>{runResult.complete}</strong> {markovCountWord(locale, runResult.complete, "completed")} <span>· {runResult.timeouts} {markovCountWord(locale, runResult.timeouts, "timeouts")}</span>
          </div> : null}
        </div>

        <div className={styles.learningColumn} data-training-episodes={currentPoint.episode} data-active-completion-rate={Math.round(currentPoint.completionRate * 100)}>
          <div className={styles.result}>
            <strong>{percent(currentPoint.completionRate)}</strong>
            <span>{markovText(locale, "completion")}</span>
            <small>{markovNumber(locale, currentPoint.episode)} / {markovNumber(locale, 4000)} {markovText(locale, "episodes")}</small>
          </div>
          <LearningChart points={revealedCurve} mode={mode} locale={locale} />
          {curveIndex < maximumCurveIndex ? <label className={styles.speedControl}>
            <span>{markovText(locale, "Training speed")} <strong>{markovNumber(locale, episodesPerSecond)} {markovText(locale, "episodes/s")}</strong></span>
            <input type="range" min="100" max="2000" step="100" value={episodesPerSecond} onChange={(event) => setEpisodesPerSecond(Number(event.target.value))} aria-label={locale === "pt-BR" ? "Velocidade do treinamento dos checkpoints em episódios por segundo" : "Checkpoint training speed in episodes per second"} />
          </label> : null}
          <button type="button" className={styles.trainButton} onClick={toggleAgent}>
            {curveIndex >= maximumCurveIndex
              ? running ? markovText(locale, "Stop agent") : markovText(locale, "Run agent")
              : training ? markovText(locale, "Pause") : curveIndex === 0 ? markovText(locale, "Train agent") : markovText(locale, "Continue")}
          </button>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {training
          ? markovText(locale, "Training in progress.")
          : curveIndex >= maximumCurveIndex
            ? locale === "pt-BR" ? `Treinamento concluído após ${markovNumber(locale, currentPoint.episode)} episódios. Taxa final de conclusão: ${percent(currentPoint.completionRate)}.` : `Training complete after ${currentPoint.episode} episodes. Final completion result ${percent(currentPoint.completionRate)}.`
            : curveIndex > 0
              ? locale === "pt-BR" ? `Treinamento pausado após ${markovNumber(locale, currentPoint.episode)} episódios. Taxa de conclusão: ${percent(currentPoint.completionRate)}.` : `Training paused after ${currentPoint.episode} episodes. Completion result ${percent(currentPoint.completionRate)}.`
              : markovText(locale, "Training has not started.")}
      </p>
    </section>
  );
}

export function CheckpointComparison({ locale = "en" }: { locale?: MarkovLocale }) {
  const results = trainCheckpointPair();
  return (
    <figure className={`${styles.lab} ${styles.comparison}`} aria-labelledby="markov-checkpoint-comparison-title" data-markov-checkpoint-comparison>
      <figcaption className={styles.comparisonHeader}>
        <p className={styles.kicker}>{markovText(locale, "Matched result")}</p>
        <h3 id="markov-checkpoint-comparison-title">{markovText(locale, "Task progress makes the order learnable")}</h3>
        <p>{markovText(locale, "Same map, rewards, and training budget. Only the state representation differs.")}</p>
      </figcaption>
      <div className={styles.comparisonBody}>
        <ChartFrame locale={locale} axisTitles label={locale === "pt-BR" ? `Após 4.000 episódios, a política que só vê a posição conclui o percurso ordenado em ${percent(results.position.finalCompletionRate)} das avaliações; a política que conhece o progresso conclui em ${percent(results.progress.finalCompletionRate)}.` : `After 4,000 episodes, the position-only policy completes the ordered route ${percent(results.position.finalCompletionRate)} of the time and the progress-aware policy completes it ${percent(results.progress.finalCompletionRate)} of the time.`}>
          <path d={linePath(results.position.curve)} className={`${styles.curve} ${styles.positionCurve}`} />
          <path d={linePath(results.progress.curve)} className={`${styles.curve} ${styles.progressCurve}`} />
        </ChartFrame>
        <div className={styles.comparisonStats}>
          <div><span className={styles.positionLegend}>{markovText(locale, "Position only")}</span><strong>{percent(results.position.finalCompletionRate)}</strong><small>{markovText(locale, "progress hidden")}</small></div>
          <div><span className={styles.progressLegend}>{markovText(locale, "Position + next")}</span><strong>{percent(results.progress.finalCompletionRate)}</strong><small>{markovText(locale, "Markov state")}</small></div>
        </div>
      </div>
    </figure>
  );
}
