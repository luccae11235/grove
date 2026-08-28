import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MarkovPongPlayground.module.css";
import {
  createPongEpisode,
  DEFAULT_PONG_TRAINING,
  MARKOV_PONG,
  pongPolicyAction,
  stepMarkovPong,
  trainMarkovPong,
  trainPongPair,
  type PongCurvePoint,
  type PongObservationMode,
  type PongTrueState,
} from "./experiment";

const CHECKPOINT_EPISODES = DEFAULT_PONG_TRAINING.evaluationInterval;
const REPLAY_START = Object.freeze({ x: 0, y: 1, vx: -1 as const, vy: -1 as const });

function freshReplay() {
  return createPongEpisode(REPLAY_START.x, REPLAY_START.y, REPLAY_START.vx, REPLAY_START.vy);
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function linePath(points: readonly PongCurvePoint[], width = 520, height = 220) {
  const left = 38;
  const top = 12;
  const plotWidth = width - left - 14;
  const plotHeight = height - top - 31;
  return points.map((point, index) => {
    const x = left + (point.episode / DEFAULT_PONG_TRAINING.episodes) * plotWidth;
    const y = top + (1 - point.hitRate) * plotHeight;
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
        {[0, 2500, 5000].map((episode) => {
          const x = 38 + (episode / 5000) * 468;
          return <text key={episode} x={x} y="211" textAnchor={episode === 0 ? "start" : episode === 5000 ? "end" : "middle"}>{episode === 0 ? "0" : `${episode / 1000}k`}</text>;
        })}
      </g>
      {axisTitles ? <>
        <text className={styles.yLabel} x="-101" y="10" transform="rotate(-90)">Hit rate (%)</text>
        <text className={styles.xLabel} x="272" y="218" textAnchor="middle">Training episodes</text>
      </> : null}
      {children}
    </svg>
  );
}

function LearningChart({ points, mode }: { points: readonly PongCurvePoint[]; mode: PongObservationMode }) {
  const latest = points[points.length - 1];
  return (
    <div className={styles.chartWrap}>
      <ChartFrame label={`${mode === "position" ? "Position-only" : "Position and velocity"} policy hit rate is ${percent(latest.hitRate)} after ${latest.episode} training episodes.`}>
        <path d={linePath(points)} className={`${styles.curve} ${styles.activeCurve} ${mode === "position" ? styles.positionCurve : styles.velocityCurve}`} />
      </ChartFrame>
    </div>
  );
}

export function MarkovPongPlayground({ mode }: { mode: PongObservationMode }) {
  const titleId = `markov-pong-title-${mode}`;
  const results = useMemo(() => trainMarkovPong(mode), [mode]);
  const [curveIndex, setCurveIndex] = useState(0);
  const [training, setTraining] = useState(false);
  const [episodesPerSecond, setEpisodesPerSecond] = useState(500);
  const [state, setState] = useState<PongTrueState>(freshReplay);
  const curveIndexRef = useRef(curveIndex);
  const maximumCurveIndex = results.curve.length - 1;
  const revealedCurve = results.curve.slice(0, curveIndex + 1);
  const currentPoint = revealedCurve[revealedCurve.length - 1];
  const visibleVelocity = mode === "velocity";

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
    if (!training) return undefined;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.done) return freshReplay();
        return stepMarkovPong(current, pongPolicyAction(results.qSnapshots[curveIndexRef.current], mode, current)).state;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [mode, results.qSnapshots, training]);

  function toggleTraining() {
    if (curveIndex >= maximumCurveIndex) {
      setCurveIndex(0);
      setState(freshReplay());
      setTraining(true);
      return;
    }
    setTraining((current) => !current);
  }

  const title = visibleVelocity
    ? "What changes when velocity is part of the state?"
    : "Can a position-only agent learn to return the ball?";

  return (
    <section className={styles.lab} role="region" aria-labelledby={titleId} data-markov-pong-lab data-mode={mode}>
      <header className={styles.header}>
        <p className={styles.kicker}>{visibleVelocity ? "Experiment 2 · Markov state" : "Experiment 1 · Broken state"}</p>
        <h3 id={titleId}>{title}</h3>
      </header>

      <div className={styles.experimentBand}>
        <span>Agent sees</span>
        <code>{visibleVelocity ? "z = (x, y, vₓ, vᵧ, paddle)" : "z = (x, y, paddle)"}</code>
        <strong>{visibleVelocity ? "Velocity observed" : "Velocity hidden"}</strong>
      </div>

      <div className={styles.body}>
        <div className={styles.environmentColumn}>
          <div className={styles.court} role="img" aria-label={`Pong court during training. Ball at column ${state.ballX}, row ${state.ballY}. Paddle at column ${state.paddleX}.${state.outcome ? ` The agent ${state.outcome === "hit" ? "hit" : "missed"} the ball.` : ""}`} data-outcome={state.outcome ?? "playing"}>
            <span className={styles.centerLine} aria-hidden="true" />
            <span className={styles.ball} style={{ left: `${((state.ballX + 0.5) / MARKOV_PONG.columns) * 100}%`, top: `${((state.ballY + 0.5) / MARKOV_PONG.rows) * 100}%` }} data-ball-x={state.ballX} data-ball-y={state.ballY} aria-hidden="true" />
            {visibleVelocity ? <span className={styles.velocityArrow} style={{ left: `${((state.ballX + 0.5) / MARKOV_PONG.columns) * 100}%`, top: `${((state.ballY + 0.5) / MARKOV_PONG.rows) * 100}%`, "--vx": state.ballVx, "--vy": state.ballVy } as React.CSSProperties} aria-hidden="true">↘</span> : null}
            <span className={styles.paddle} style={{ left: `${((state.paddleX + 0.5) / MARKOV_PONG.columns) * 100}%` }} data-paddle-x={state.paddleX} aria-hidden="true" />
            {state.done ? <span className={state.outcome === "hit" ? styles.hitBadge : styles.missBadge}>{state.outcome === "hit" ? "Hit" : "Miss"}</span> : null}
          </div>
        </div>

        <div className={styles.learningColumn} data-training-episodes={currentPoint.episode} data-active-hit-rate={Math.round(currentPoint.hitRate * 100)}>
          <div className={styles.result}>
            <strong>{percent(currentPoint.hitRate)}</strong>
            <span>hit rate</span>
            <small>{currentPoint.episode.toLocaleString()} / 5,000 episodes</small>
          </div>
          <LearningChart points={revealedCurve} mode={mode} />
          <label className={styles.speedControl}>
            <span>Training speed <strong>{episodesPerSecond.toLocaleString()} episodes/s</strong></span>
            <input type="range" min="100" max="2000" step="100" value={episodesPerSecond} onChange={(event) => setEpisodesPerSecond(Number(event.target.value))} aria-label="Training speed in episodes per second" />
          </label>
          <button type="button" className={styles.trainButton} onClick={toggleTraining}>
            {training ? "Pause" : curveIndex >= maximumCurveIndex ? "Run again" : curveIndex === 0 ? "Train agent" : "Continue"}
          </button>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">Training has reached {currentPoint.episode} episodes. Hit rate {percent(currentPoint.hitRate)}.</p>
    </section>
  );
}

export function MarkovPongComparison() {
  const results = trainPongPair();
  return (
    <figure className={`${styles.lab} ${styles.comparison}`} aria-labelledby="markov-pong-comparison-title" data-markov-pong-comparison>
      <figcaption className={styles.comparisonHeader}>
        <p className={styles.kicker}>Matched result</p>
        <h3 id="markov-pong-comparison-title">One missing variable changes what can be learned</h3>
        <p>Same game and training budget. Only the state representation differs.</p>
      </figcaption>
      <div className={styles.comparisonBody}>
        <ChartFrame axisTitles label={`After 5,000 episodes, the position-only agent returns ${percent(results.position.finalHitRate)} of launches and the velocity-aware agent returns ${percent(results.velocity.finalHitRate)}.`}>
          <path d={linePath(results.position.curve)} className={`${styles.curve} ${styles.activeCurve} ${styles.positionCurve}`} />
          <path d={linePath(results.velocity.curve)} className={`${styles.curve} ${styles.activeCurve} ${styles.velocityCurve}`} />
        </ChartFrame>
        <div className={styles.comparisonStats}>
          <div><span className={styles.positionLegend}>Position only</span><strong>{percent(results.position.finalHitRate)}</strong><small>velocity hidden</small></div>
          <div><span className={styles.velocityLegend}>Position + velocity</span><strong>{percent(results.velocity.finalHitRate)}</strong><small>Markov state</small></div>
        </div>
      </div>
    </figure>
  );
}
