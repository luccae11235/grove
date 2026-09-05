import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DoorKeyPlayground.module.css";
import { trainingFrameDelay } from "../markovTrainingMotion";
import {
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

function ChartFrame({ children, label, axisTitles = false }: {
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
        <text className={styles.yLabel} x="-101" y="10" transform="rotate(-90)">Goal rate (%)</text>
        <text className={styles.xLabel} x="272" y="218" textAnchor="middle">Training episodes</text>
      </> : null}
      {children}
    </svg>
  );
}

function LearningChart({ points, mode }: {
  points: readonly DoorCurvePoint[];
  mode: DoorObservationMode;
}) {
  const latest = points[points.length - 1];
  return (
    <div className={styles.chartWrap}>
      <ChartFrame label={`${mode === "position" ? "Position-only" : "Position and key memory"} policy reaches the goal in ${percent(latest.successRate)} of evaluations after ${latest.episode} training episodes.`}>
        <path d={linePath(points)} className={`${styles.curve} ${mode === "position" ? styles.positionCurve : styles.memoryCurve}`} />
      </ChartFrame>
    </div>
  );
}

function KeyShape() {
  return <span className={styles.keyShape} aria-hidden="true"><i /><b /></span>;
}

function DoorBoard({
  state,
  visited = [],
  showRoute = false,
}: {
  state: Pick<DoorTrueState, "x" | "hasKey" | "outcome">;
  visited?: readonly number[];
  showRoute?: boolean;
}) {
  const cells = Array.from({ length: MARKOV_DOOR.columns * MARKOV_DOOR.rows });
  return (
    <div
      className={styles.board}
      role="img"
      aria-label={`Door and key corridor. Agent at column ${state.x}. ${state.hasKey ? "The agent holds the key and the door is open." : "The key has not been collected and the door is closed."}${state.outcome === "goal" ? " The agent reached the goal." : state.outcome === "timeout" ? " The route timed out." : ""}`}
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
      <span className={styles.goal} aria-hidden="true">Goal</span>
      <span className={styles.agent} style={{ "--agent-x": state.x } as React.CSSProperties} aria-hidden="true">
        {state.hasKey ? <KeyShape /> : null}
      </span>
      {showRoute ? <>
        <span className={styles.routeToKey} aria-hidden="true">1 · collect key ←</span>
        <span className={styles.routeToGoal} aria-hidden="true">2 · return and unlock →</span>
      </> : null}
      {state.outcome ? <span className={state.outcome === "goal" ? styles.goalBadge : styles.timeoutBadge}>{state.outcome === "goal" ? "Goal" : "Timed out"}</span> : null}
    </div>
  );
}

export function DoorKeyFigure({ kind }: { kind: "environment" | "state" }) {
  if (kind === "environment") {
    return (
      <figure className={`${styles.figure} ${styles.routeFigure}`} data-door-key-figure="environment">
        <figcaption>
          <p className={styles.kicker}>The route</p>
          <h3>The agent must cross the same corridor twice</h3>
        </figcaption>
        <DoorBoard state={createDoorEpisode()} showRoute />
        <p className={styles.figureNote}>The useful direction reverses after the key is collected.</p>
      </figure>
    );
  }

  return (
    <figure className={`${styles.figure} ${styles.stateFigure}`} data-door-key-figure="state">
      <figcaption>
        <p className={styles.kicker}>The hidden difference</p>
        <h3>Same position. Same action. Different next state.</h3>
      </figcaption>
      <div className={styles.statePair}>
        <div>
          <span className={styles.stateLabel}>physical state (p, 0)</span>
          <div className={styles.doorMoment} data-door-state="closed">
            <span className={styles.miniAgent} />
            <span className={styles.moveArrow}>→</span>
            <span className={styles.miniDoor} />
          </div>
          <strong>Blocked</strong>
          <small>key not collected</small>
        </div>
        <div>
          <span className={styles.stateLabel}>physical state (p, 1)</span>
          <div className={styles.doorMoment} data-door-state="open">
            <span className={styles.miniAgent}><KeyShape /></span>
            <span className={styles.moveArrow}>→</span>
            <span className={`${styles.miniDoor} ${styles.miniDoorOpen}`} />
          </div>
          <strong>Passes through</strong>
          <small>key collected</small>
        </div>
      </div>
      <p className={styles.figureNote}>Position alone merges these two states. The key bit keeps them separate.</p>
    </figure>
  );
}

export function DoorKeyPlayground({ mode }: { mode: DoorObservationMode }) {
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
        const next = stepMarkovDoor(current, doorPolicyAction(qValues, mode, current)).state;
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
        <p className={styles.kicker}>{remembersKey ? "Experiment 2 · Markov state" : "Experiment 1 · Broken state"}</p>
        <h3 id={titleId}>{remembersKey ? "What changes when the key is part of the state?" : "Can position alone encode the return route?"}</h3>
      </header>

      <div className={styles.experimentBand}>
        <span>Agent sees</span>
        <code>{remembersKey ? "z = (p, has_key)" : "z = p"}</code>
        <strong>{remembersKey ? "Key remembered" : "Key status hidden"}</strong>
      </div>

      <div className={styles.body}>
        <div className={styles.environmentColumn}>
          <DoorBoard state={state} visited={visited} />
          {curveIndex >= maximumCurveIndex ? <div className={styles.runScore} aria-live="polite" data-run-goals={runResult.goals} data-run-timeouts={runResult.timeouts}>
            <strong>{runResult.goals}</strong> goals <span>· {runResult.timeouts} timed out</span>
          </div> : null}
        </div>

        <div className={styles.learningColumn} data-training-episodes={currentPoint.episode} data-active-success-rate={Math.round(currentPoint.successRate * 100)}>
          <div className={styles.result}>
            <strong>{percent(currentPoint.successRate)}</strong>
            <span>goal rate</span>
            <small>{currentPoint.episode.toLocaleString()} / 3,000 episodes</small>
          </div>
          <LearningChart points={revealedCurve} mode={mode} />
          {curveIndex < maximumCurveIndex ? <label className={styles.speedControl}>
            <span>Training speed <strong>{episodesPerSecond.toLocaleString()} episodes/s</strong></span>
            <input type="range" min="100" max="1500" step="100" value={episodesPerSecond} onChange={(event) => setEpisodesPerSecond(Number(event.target.value))} aria-label="Door training speed in episodes per second" />
          </label> : null}
          <button type="button" className={styles.trainButton} onClick={toggleAgent}>
            {curveIndex >= maximumCurveIndex
              ? running ? "Stop agent" : "Run agent"
              : training ? "Pause" : curveIndex === 0 ? "Train agent" : "Continue"}
          </button>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">Training has reached {currentPoint.episode} episodes. Goal rate {percent(currentPoint.successRate)}.</p>
    </section>
  );
}

export function DoorKeyComparison() {
  const results = trainDoorPair();
  return (
    <figure className={`${styles.lab} ${styles.comparison}`} aria-labelledby="markov-door-comparison-title" data-markov-door-comparison>
      <figcaption className={styles.comparisonHeader}>
        <p className={styles.kicker}>Matched result</p>
        <h3 id="markov-door-comparison-title">One bit of memory makes the route learnable</h3>
        <p>Same corridor and training budget. Only the state representation differs.</p>
      </figcaption>
      <div className={styles.comparisonBody}>
        <ChartFrame axisTitles label={`After 3,000 episodes, the position-only policy reaches the goal ${percent(results.position.finalSuccessRate)} of the time and the key-aware policy reaches it ${percent(results.memory.finalSuccessRate)} of the time.`}>
          <path d={linePath(results.position.curve)} className={`${styles.curve} ${styles.positionCurve}`} />
          <path d={linePath(results.memory.curve)} className={`${styles.curve} ${styles.memoryCurve}`} />
        </ChartFrame>
        <div className={styles.comparisonStats}>
          <div><span className={styles.positionLegend}>Position only</span><strong>{percent(results.position.finalSuccessRate)}</strong><small>key hidden</small></div>
          <div><span className={styles.memoryLegend}>Position + key</span><strong>{percent(results.memory.finalSuccessRate)}</strong><small>Markov state</small></div>
        </div>
      </div>
    </figure>
  );
}
