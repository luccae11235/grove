import { useEffect, useMemo, useState } from "react";
import styles from "./MarkovPongPlayground.module.css";
import {
  createPongEpisode,
  DEFAULT_PONG_TRAINING,
  MARKOV_PONG,
  pongPolicyAction,
  stepMarkovPong,
  trainMarkovPong,
  trainPongPair,
  type PongAction,
  type PongCurvePoint,
  type PongObservationMode,
  type PongTrueState,
} from "./experiment";

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
  return points
    .map((point, index) => {
      const x = left + (point.episode / DEFAULT_PONG_TRAINING.episodes) * plotWidth;
      const y = top + (1 - point.hitRate) * plotHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function ChartFrame({ children, label }: { children: React.ReactNode; label: string }) {
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
      <text className={styles.yLabel} x="-101" y="10" transform="rotate(-90)">Hit rate (%)</text>
      <text className={styles.xLabel} x="272" y="218" textAnchor="middle">Training episodes</text>
      {children}
    </svg>
  );
}

function LearningChart({ points, mode }: { points: readonly PongCurvePoint[]; mode: PongObservationMode }) {
  const latest = points[points.length - 1];
  return (
    <div className={styles.chartWrap}>
      <ChartFrame label={`${mode === "position" ? "Position-only" : "Position and velocity"} greedy policy hit rate is ${percent(latest.hitRate)} after ${latest.episode} training episodes.`}>
        <path d={linePath(points)} className={`${styles.curve} ${styles.activeCurve} ${mode === "position" ? styles.positionCurve : styles.velocityCurve}`} />
      </ChartFrame>
      <div className={styles.legend} aria-hidden="true">
        <span className={mode === "position" ? styles.positionLegend : styles.velocityLegend}>{mode === "position" ? "Position only" : "Position + velocity"} · {percent(latest.hitRate)}</span>
      </div>
    </div>
  );
}

export function MarkovPongPlayground({ mode }: { mode: PongObservationMode }) {
  const titleId = `markov-pong-title-${mode}`;
  const results = useMemo(() => trainMarkovPong(mode), [mode]);
  const [curveIndex, setCurveIndex] = useState(0);
  const [training, setTraining] = useState(false);
  const [speed, setSpeed] = useState("normal");
  const [state, setState] = useState<PongTrueState>(freshReplay);
  const [watching, setWatching] = useState(false);
  const [checks, setChecks] = useState({ hits: 0, misses: 0 });
  const maximumCurveIndex = results.curve.length - 1;
  const revealedCurve = results.curve.slice(0, curveIndex + 1);
  const currentPoint = revealedCurve[revealedCurve.length - 1];
  const visibleVelocity = mode === "velocity";

  useEffect(() => {
    if (!training) return undefined;
    const delay = speed === "fast" ? 20 : speed === "slow" ? 260 : 110;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.done) {
          if (curveIndex >= maximumCurveIndex) {
            setTraining(false);
            return current;
          }
          setCurveIndex((index) => Math.min(maximumCurveIndex, index + 1));
          return freshReplay();
        }
        const action = pongPolicyAction(results.qSnapshots[curveIndex], mode, current);
        const next = stepMarkovPong(current, action).state;
        if (next.done) {
          setChecks((counts) => next.outcome === "hit"
            ? { ...counts, hits: counts.hits + 1 }
            : { ...counts, misses: counts.misses + 1 });
        }
        return next;
      });
    }, delay);
    return () => window.clearInterval(timer);
  }, [curveIndex, maximumCurveIndex, mode, results.qSnapshots, speed, training]);

  useEffect(() => {
    if (!watching) return undefined;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.done) {
          setWatching(false);
          return current;
        }
        const next = stepMarkovPong(current, pongPolicyAction(results.qValues, mode, current)).state;
        if (next.done) setWatching(false);
        return next;
      });
    }, 280);
    return () => window.clearInterval(timer);
  }, [mode, results.qValues, watching]);

  function resetRally() {
    setWatching(false);
    setState(freshReplay());
  }

  function manualStep(action: PongAction) {
    setWatching(false);
    setState((current) => current.done ? freshReplay() : stepMarkovPong(current, action).state);
  }

  function startOrPauseTraining() {
    if (!training && curveIndex === 0) {
      setState(freshReplay());
      setChecks({ hits: 0, misses: 0 });
    }
    setWatching(false);
    setTraining((current) => !current);
  }

  const liveResult = state.done ? state.outcome === "hit" ? "+1 · hit" : "−1 · miss" : "0 · rally in progress";
  const title = visibleVelocity ? "What changes when velocity is part of the state?" : "Can a position-only agent learn to return the ball?";

  return (
    <section className={styles.lab} role="region" aria-labelledby={titleId} data-markov-pong-lab data-mode={mode}>
      <header className={styles.header}>
        <p className={styles.kicker}>{visibleVelocity ? "Experiment 2 · Markov state" : "Experiment 1 · Broken state"}</p>
        <h3 id={titleId}>{title}</h3>
        <p>Watch the current greedy policy play the same rally at each 250-episode checkpoint.</p>
      </header>

      <div className={styles.experimentBand}>
        <strong>Agent observes</strong>
        <code>{visibleVelocity ? "z = (x, y, vₓ, vᵧ, paddle)" : "z = (x, y, paddle)"}</code>
        <span className={visibleVelocity ? styles.velocityVisible : styles.velocityHidden}>{visibleVelocity ? "Velocity observed" : "Velocity hidden"}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.environmentColumn}>
          <div className={styles.observation} aria-label={visibleVelocity ? `Observed ball position ${state.ballX}, ${state.ballY}; velocity ${state.ballVx}, ${state.ballVy}; paddle ${state.paddleX}.` : `Observed ball position ${state.ballX}, ${state.ballY}; paddle ${state.paddleX}. Velocity is hidden.`}>
            <span>ball ({state.ballX}, {state.ballY})</span>
            <span className={visibleVelocity ? styles.velocityVisible : styles.velocityHidden}>{visibleVelocity ? `velocity (${state.ballVx > 0 ? "+" : "−"}1, ${state.ballVy > 0 ? "+" : "−"}1)` : "velocity hidden"}</span>
            <span>paddle {state.paddleX}</span>
          </div>

          <div className={styles.court} tabIndex={0} onKeyDown={(event) => {
            const action = event.key === "ArrowLeft" ? 0 : event.key === "ArrowRight" ? 2 : event.key === " " || event.key === "ArrowDown" ? 1 : null;
            if (action !== null) { event.preventDefault(); manualStep(action); }
          }} role="application" aria-label={`Quantized Pong court. Ball at column ${state.ballX}, row ${state.ballY}. Paddle at column ${state.paddleX}. Use left and right arrows to move, or space to stay.`} data-outcome={state.outcome ?? "playing"}>
            <span className={styles.centerLine} aria-hidden="true" />
            <span className={styles.ball} style={{ left: `${((state.ballX + 0.5) / MARKOV_PONG.columns) * 100}%`, top: `${((state.ballY + 0.5) / MARKOV_PONG.rows) * 100}%` }} data-ball-x={state.ballX} data-ball-y={state.ballY} aria-hidden="true" />
            {visibleVelocity ? <span className={styles.velocityArrow} style={{ left: `${((state.ballX + 0.5) / MARKOV_PONG.columns) * 100}%`, top: `${((state.ballY + 0.5) / MARKOV_PONG.rows) * 100}%`, "--vx": state.ballVx, "--vy": state.ballVy } as React.CSSProperties} aria-hidden="true">↘</span> : null}
            <span className={styles.paddle} style={{ left: `${((state.paddleX + 0.5) / MARKOV_PONG.columns) * 100}%` }} data-paddle-x={state.paddleX} aria-hidden="true" />
            {state.done ? <span className={state.outcome === "hit" ? styles.hitBadge : styles.missBadge}>{state.outcome === "hit" ? "+1 · hit" : "−1 · miss"}</span> : null}
          </div>

          <div className={styles.playControls}>
            <button type="button" onClick={() => manualStep(0)} disabled={training || watching} aria-label="Move paddle left">← Left</button>
            <button type="button" onClick={() => manualStep(1)} disabled={training || watching}>Stay</button>
            <button type="button" onClick={() => manualStep(2)} disabled={training || watching} aria-label="Move paddle right">Right →</button>
          </div>
          <div className={styles.replayRow}>
            <button type="button" className={styles.watchButton} onClick={() => { if (state.done) setState(freshReplay()); setWatching((current) => !current); }} disabled={curveIndex < maximumCurveIndex || training}>{watching ? "Pause final policy" : "Replay final policy"}</button>
            <button type="button" className={styles.resetButton} onClick={resetRally} disabled={training}>Reset rally</button>
            <span>{liveResult}</span>
          </div>
          <p className={styles.humanNote}>Manual controls are identical in both experiments. During training, the court shows the policy available at the current checkpoint.</p>
        </div>

        <div className={styles.learningColumn} data-training-episodes={currentPoint.episode} data-active-hit-rate={Math.round(currentPoint.hitRate * 100)}>
          <div className={styles.chartHeader}>
            <div><p>Greedy evaluation</p><strong>{currentPoint.episode.toLocaleString()} episodes · {percent(currentPoint.hitRate)}</strong></div>
            <label>Playback speed<select value={speed} onChange={(event) => setSpeed(event.target.value)}><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option></select></label>
          </div>
          <LearningChart points={revealedCurve} mode={mode} />
          <p className={styles.policyChecks} aria-label={`${checks.hits} visible policy checks hit and ${checks.misses} missed.`}>Visible checks: <strong>{checks.hits} hit</strong> · {checks.misses} missed</p>
          <div className={styles.trainingControls}>
            <button type="button" className={styles.trainButton} onClick={startOrPauseTraining} disabled={curveIndex >= maximumCurveIndex}>{training ? "Pause training" : curveIndex === 0 ? `Train ${visibleVelocity ? "velocity-aware" : "position-only"} agent` : "Continue training"}</button>
            <button type="button" className={styles.resetButton} onClick={() => { setTraining(false); setCurveIndex(0); setChecks({ hits: 0, misses: 0 }); resetRally(); }} disabled={curveIndex === 0}>Reset experiment</button>
          </div>
          <p className={styles.evaluationNote}>Every point tests the frozen greedy policy on all 176 possible launches—without exploration.</p>
        </div>
      </div>

      <details className={styles.details}>
        <summary>What stays fixed?</summary>
        <div><p>The 11 × 9 court, transition rules, reward (+1 hit, −1 miss), launch sequence, Q-learning updates, exploration schedule, seed, and 5,000-episode budget are identical.</p><p className={styles.formula}>Q(s,a) ← Q(s,a) + 0.20 [r + 0.98 max Q(s′,a′) − Q(s,a)]</p><p>Only the state representation changes.</p></div>
      </details>
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">Training has reached {currentPoint.episode} episodes. Greedy hit rate {percent(currentPoint.hitRate)}.</p>
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
        <ChartFrame label={`After 5,000 episodes, the position-only agent returns ${percent(results.position.finalHitRate)} of launches and the velocity-aware agent returns ${percent(results.velocity.finalHitRate)}.`}>
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
