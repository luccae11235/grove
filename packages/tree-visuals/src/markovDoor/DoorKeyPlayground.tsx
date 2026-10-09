import { markovCountWord, markovNumber, markovText, type MarkovLocale } from "../markovLocale";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DoorKeyPlayground.module.css";
import { trainingFrameDelay } from "../markovTrainingMotion";
import {
  applyDoorRolloutLimit,
  createDoorEpisode,
  DEFAULT_DOOR_TRAINING,
  doorPolicyAction,
  MARKOV_DOOR,
  stepMarkovDoor,
  trainDoorPair,
  trainMarkovDoor,
  type DoorCurvePoint,
  type DoorObservationMode,
  type DoorTrueState,
} from "./experiment";

const CHECKPOINT_EPISODES = DEFAULT_DOOR_TRAINING.evaluationInterval;

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function linePath(points: readonly DoorCurvePoint[]) {
  const left = 38;
  const top = 12;
  const plotWidth = 468;
  const plotHeight = 177;
  return points.map((point, index) => {
    const x = left + (point.episode / DEFAULT_DOOR_TRAINING.episodes) * plotWidth;
    const y = top + (1 - point.successRate) * plotHeight;
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
        {[0, 1500, 3000].map((episode) => {
          const x = 38 + (episode / 3000) * 468;
          return <text key={episode} x={x} y="211" textAnchor={episode === 0 ? "start" : episode === 3000 ? "end" : "middle"}>{episode === 0 ? "0" : `${episode / 1000}k`}</text>;
        })}
      </g>
      {axisTitles ? <>
        <text className={styles.yLabel} x="-101" y="10" transform="rotate(-90)">{markovText(locale, "Goal rate (%)")}</text>
        <text className={styles.xLabel} x="272" y="218" textAnchor="middle">{markovText(locale, "Training episodes")}</text>
      </> : null}
      {children}
    </svg>
  );
}

function LearningChart({ points, mode, locale }: {
  locale: MarkovLocale;
  points: readonly DoorCurvePoint[];
  mode: DoorObservationMode;
}) {
  const latest = points[points.length - 1];
  return (
    <div className={styles.chartWrap}>
      <ChartFrame locale={locale} label={locale === "pt-BR" ? `A política com ${mode === "position" ? "apenas a posição" : "posição e memória da chave"} alcança o objetivo em ${percent(latest.successRate)} das avaliações após ${markovNumber(locale, latest.episode)} episódios de treinamento.` : `${mode === "position" ? "Position-only" : "Position and key memory"} policy reaches the goal in ${percent(latest.successRate)} of evaluations after ${latest.episode} training episodes.`}>
        <path d={linePath(points)} className={`${styles.curve} ${mode === "position" ? styles.positionCurve : styles.memoryCurve}`} />
      </ChartFrame>
    </div>
  );
}

function KeyShape() {
  return <svg className={styles.keyShape} viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="10" r="5" /><path d="M13 10h15v5m-6-5v4" /></svg>;
}

function DoorBoard({
  state,
  visited = [],
  showRoute = false,
  locale = "en",
}: {
  locale?: MarkovLocale;
  state: Pick<DoorTrueState, "x" | "hasKey" | "outcome">;
  visited?: readonly number[];
  showRoute?: boolean;
}) {
  const cells = Array.from({ length: MARKOV_DOOR.columns * MARKOV_DOOR.rows });
  return (
    <div
      className={styles.board}
      role="img"
      aria-label={locale === "pt-BR" ? `Corredor da porta e da chave. Agente na coluna ${state.x}. ${state.hasKey ? "O agente está com a chave e a porta está aberta." : "A chave não foi coletada e a porta está fechada."}${state.outcome === "goal" ? " O agente alcançou o objetivo." : state.outcome === "timeout" ? " O percurso atingiu o limite de passos." : ""}` : `Door and key corridor. Agent at column ${state.x}. ${state.hasKey ? "The agent holds the key and the door is open." : "The key has not been collected and the door is closed."}${state.outcome === "goal" ? " The agent reached the goal." : state.outcome === "timeout" ? " The route timed out." : ""}`}
      data-agent-x={state.x}
      data-has-key={String(state.hasKey)}
      data-outcome={state.outcome ?? "running"}
    >
      {cells.map((_, index) => {
        const x = index % MARKOV_DOOR.columns;
        const y = Math.floor(index / MARKOV_DOOR.columns);
        const corridor = y === MARKOV_DOOR.corridorY && x >= MARKOV_DOOR.firstX && x <= MARKOV_DOOR.lastX;
        return <span className={`${styles.cell} ${corridor ? styles.corridor : styles.wall} ${visited.includes(x) && corridor ? styles.visited : ""}`} key={index} aria-hidden="true" />;
      })}
      {!state.hasKey ? <span className={styles.keyAtCell}><KeyShape /></span> : null}
      <span className={`${styles.door} ${state.hasKey ? styles.doorOpen : ""}`} aria-hidden="true"><i /></span>
      <span className={styles.goal} aria-hidden="true">{markovText(locale, "Goal")}</span>
      <span className={styles.agent} style={{ "--agent-x": state.x } as React.CSSProperties} aria-hidden="true">
        {state.hasKey ? <KeyShape /> : null}
      </span>
      {showRoute ? <>
        <span className={styles.routeToKey} aria-hidden="true">{markovText(locale, "1 · collect key ←")}</span>
        <span className={styles.routeToGoal} aria-hidden="true">{markovText(locale, "2 · return and unlock →")}</span>
      </> : null}
      {state.outcome ? <span className={state.outcome === "goal" ? styles.goalBadge : styles.timeoutBadge}>{state.outcome === "goal" ? markovText(locale, "Goal") : markovText(locale, "Timed out")}</span> : null}
    </div>
  );
}

export function DoorKeyFigure({ kind, locale = "en" }: { kind: "environment" | "state"; locale?: MarkovLocale }) {
  if (kind === "environment") {
    return (
      <figure className={`${styles.figure} ${styles.routeFigure}`} data-door-key-figure="environment">
        <figcaption>
          <p className={styles.kicker}>{markovText(locale, "The route")}</p>
          <h3>{markovText(locale, "The agent must cross the same corridor twice")}</h3>
        </figcaption>
        <DoorBoard state={createDoorEpisode()} showRoute locale={locale} />
        <p className={styles.figureNote}>{markovText(locale, "The useful direction reverses after the key is collected.")}</p>
      </figure>
    );
  }

  return (
    <figure className={`${styles.figure} ${styles.stateFigure}`} data-door-key-figure="state">
      <figcaption>
        <p className={styles.kicker}>{markovText(locale, "The hidden difference")}</p>
        <h3>{markovText(locale, "Same position. Same action. Different next state.")}</h3>
      </figcaption>
      <div className={styles.statePair}>
        <div>
          <span className={styles.stateLabel}>{markovText(locale, "physical state (p, 0)")}</span>
          <div className={styles.doorMoment} data-door-state="closed">
            <span className={styles.miniAgent} />
            <span className={styles.moveArrow}>→</span>
            <span className={styles.miniDoor} />
          </div>
          <strong>{markovText(locale, "Blocked")}</strong>
          <small>{markovText(locale, "key not collected")}</small>
        </div>
        <div>
          <span className={styles.stateLabel}>{markovText(locale, "physical state (p, 1)")}</span>
          <div className={styles.doorMoment} data-door-state="open">
            <span className={styles.miniAgent}><KeyShape /></span>
            <span className={styles.moveArrow}>→</span>
            <span className={`${styles.miniDoor} ${styles.miniDoorOpen}`} />
          </div>
          <strong>{markovText(locale, "Passes through")}</strong>
          <small>{markovText(locale, "key collected")}</small>
        </div>
      </div>
      <p className={styles.figureNote}>{markovText(locale, "Position alone merges these two states. The key bit keeps them separate.")}</p>
    </figure>
  );
}

export function DoorKeyPlayground({ mode, locale = "en" }: { mode: DoorObservationMode; locale?: MarkovLocale }) {
  const titleId = `markov-door-title-${mode}`;
  const results = useMemo(() => trainMarkovDoor(mode), [mode]);
  const [curveIndex, setCurveIndex] = useState(0);
  const [training, setTraining] = useState(false);
  const [running, setRunning] = useState(false);
  const [episodesPerSecond, setEpisodesPerSecond] = useState(300);
  const [state, setState] = useState<DoorTrueState>(() => createDoorEpisode());
  const [visited, setVisited] = useState<number[]>([MARKOV_DOOR.startX]);
  const [runResult, setRunResult] = useState({ goals: 0, timeouts: 0 });
  const curveIndexRef = useRef(curveIndex);
  const maximumCurveIndex = results.curve.length - 1;
  const revealedCurve = results.curve.slice(0, curveIndex + 1);
  const currentPoint = revealedCurve[revealedCurve.length - 1];
  const remembersKey = mode === "memory";
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
          setVisited([MARKOV_DOOR.startX]);
          return createDoorEpisode();
        }
        const qValues = running ? results.qValues : results.qSnapshots[curveIndexRef.current];
        const next = applyDoorRolloutLimit(
          stepMarkovDoor(current, doorPolicyAction(qValues, mode, current)).state,
        );
        setVisited((path) => path.includes(next.x) ? path : [...path, next.x]);
        if (running && next.done) {
          setRunResult((result) => next.outcome === "goal"
            ? { ...result, goals: result.goals + 1 }
            : { ...result, timeouts: result.timeouts + 1 });
        }
        return next;
      });
    }, running ? 120 : trainingFrameMs);
    return () => window.clearInterval(timer);
  }, [mode, results.qSnapshots, results.qValues, running, training, trainingFrameMs]);

  function toggleAgent() {
    if (curveIndex >= maximumCurveIndex) {
      if (!running) {
        setState(createDoorEpisode());
        setVisited([MARKOV_DOOR.startX]);
        setRunResult({ goals: 0, timeouts: 0 });
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
      data-markov-door-lab
      data-mode={mode}
      data-training={String(training)}
      data-training-frame-ms={trainingFrameMs}
      style={{ "--training-frame-ms": `${trainingFrameMs}ms` } as React.CSSProperties}
    >
      <header className={styles.header}>
        <p className={styles.kicker}>{remembersKey ? markovText(locale, "Experiment 2 · Markov state") : markovText(locale, "Experiment 1 · Broken state")}</p>
        <h3 id={titleId}>{remembersKey ? markovText(locale, "What changes when the key is part of the state?") : markovText(locale, "Can position alone encode the return route?")}</h3>
      </header>

      <div className={styles.experimentBand}>
        <span>{markovText(locale, "Agent sees")}</span>
        <code>{remembersKey ? "z = (p, has_key)" : "z = p"}</code>
        <strong>{remembersKey ? markovText(locale, "Key remembered") : markovText(locale, "Key status hidden")}</strong>
      </div>

      <div className={styles.body}>
        <div className={styles.environmentColumn}>
          <DoorBoard state={state} visited={visited} locale={locale} />
          {curveIndex >= maximumCurveIndex ? <div className={styles.runScore} aria-live="polite" data-run-goals={runResult.goals} data-run-timeouts={runResult.timeouts}>
            <strong>{runResult.goals}</strong> {markovCountWord(locale, runResult.goals, "goals")} <span>· {runResult.timeouts} {markovCountWord(locale, runResult.timeouts, "timeouts")}</span>
          </div> : null}
        </div>

        <div className={styles.learningColumn} data-training-episodes={currentPoint.episode} data-active-success-rate={Math.round(currentPoint.successRate * 100)}>
          <div className={styles.result}>
            <strong>{percent(currentPoint.successRate)}</strong>
            <span>{markovText(locale, "goal rate")}</span>
            <small>{markovNumber(locale, currentPoint.episode)} / {markovNumber(locale, 3000)} {markovText(locale, "episodes")}</small>
          </div>
          <LearningChart points={revealedCurve} mode={mode} locale={locale} />
          {curveIndex < maximumCurveIndex ? <label className={styles.speedControl}>
            <span>{markovText(locale, "Training speed")} <strong>{markovNumber(locale, episodesPerSecond)} {markovText(locale, "episodes/s")}</strong></span>
            <input type="range" min="100" max="1500" step="100" value={episodesPerSecond} onChange={(event) => setEpisodesPerSecond(Number(event.target.value))} aria-label={locale === "pt-BR" ? "Velocidade do treinamento da porta em episódios por segundo" : "Door training speed in episodes per second"} />
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
            ? locale === "pt-BR" ? `Treinamento concluído após ${markovNumber(locale, currentPoint.episode)} episódios. Resultado final: ${percent(currentPoint.successRate)} dos objetivos alcançados.` : `Training complete after ${currentPoint.episode} episodes. Final goal result ${percent(currentPoint.successRate)}.`
            : curveIndex > 0
              ? locale === "pt-BR" ? `Treinamento pausado após ${markovNumber(locale, currentPoint.episode)} episódios. Objetivos alcançados: ${percent(currentPoint.successRate)}.` : `Training paused after ${currentPoint.episode} episodes. Goal result ${percent(currentPoint.successRate)}.`
              : markovText(locale, "Training has not started.")}
      </p>
    </section>
  );
}

export function DoorKeyComparison({ locale = "en" }: { locale?: MarkovLocale }) {
  const results = trainDoorPair();
  return (
    <figure className={`${styles.lab} ${styles.comparison}`} aria-labelledby="markov-door-comparison-title" data-markov-door-comparison>
      <figcaption className={styles.comparisonHeader}>
        <p className={styles.kicker}>{markovText(locale, "Matched result")}</p>
        <h3 id="markov-door-comparison-title">{markovText(locale, "One bit of memory makes the route learnable")}</h3>
        <p>{markovText(locale, "Same corridor and training budget. Only the state representation differs.")}</p>
      </figcaption>
      <div className={styles.comparisonBody}>
        <ChartFrame locale={locale} axisTitles label={locale === "pt-BR" ? `Após 3.000 episódios, a política que só vê a posição alcança o objetivo em ${percent(results.position.finalSuccessRate)} das avaliações; a política que conhece a chave alcança em ${percent(results.memory.finalSuccessRate)}.` : `After 3,000 episodes, the position-only policy reaches the goal ${percent(results.position.finalSuccessRate)} of the time and the key-aware policy reaches it ${percent(results.memory.finalSuccessRate)} of the time.`}>
          <path d={linePath(results.position.curve)} className={`${styles.curve} ${styles.positionCurve}`} />
          <path d={linePath(results.memory.curve)} className={`${styles.curve} ${styles.memoryCurve}`} />
        </ChartFrame>
        <div className={styles.comparisonStats}>
          <div><span className={styles.positionLegend}>{markovText(locale, "Position only")}</span><strong>{percent(results.position.finalSuccessRate)}</strong><small>{markovText(locale, "key hidden")}</small></div>
          <div><span className={styles.memoryLegend}>{markovText(locale, "Position + key")}</span><strong>{percent(results.memory.finalSuccessRate)}</strong><small>{markovText(locale, "Markov state")}</small></div>
        </div>
      </div>
    </figure>
  );
}
