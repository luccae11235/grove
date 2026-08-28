import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./MarkovPongPlayground.module.css";
import {
  createPongEpisode,
  DEFAULT_PONG_TRAINING,
  MARKOV_PONG,
  pongPolicyAction,
  stepMarkovPong,
  trainPongPair,
  type PongAction,
  type PongCurvePoint,
  type PongObservationMode,
  type PongTrueState,
} from "./experiment";

const REPLAY_START = Object.freeze({ x: 2, y: 1, vx: 1 as const, vy: 1 as const });

function freshReplay() {
  return createPongEpisode(REPLAY_START.x, REPLAY_START.y, REPLAY_START.vx, REPLAY_START.vy);
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function actionName(action: PongAction) {
  return action === 0 ? "left" : action === 2 ? "right" : "stay";
}

function linePath(points: readonly PongCurvePoint[], width: number, height: number) {
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

function LearningChart({
  position,
  velocity,
  active,
}: {
  position: readonly PongCurvePoint[];
  velocity: readonly PongCurvePoint[];
  active: PongObservationMode;
}) {
  const width = 520;
  const height = 220;
  const lastPosition = position[position.length - 1];
  const lastVelocity = velocity[velocity.length - 1];
  return (
    <div className={styles.chartWrap}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Greedy evaluation hit rate after ${lastPosition.episode} training episodes: position-only ${percent(lastPosition.hitRate)}, position plus velocity ${percent(lastVelocity.hitRate)}.`}
      >
        <g className={styles.grid} aria-hidden="true">
          {[0, 0.5, 1].map((rate) => {
            const y = 12 + (1 - rate) * 177;
            return (
              <g key={rate}>
                <line x1="38" x2="506" y1={y} y2={y} />
                <text x="31" y={y + 4} textAnchor="end">{Math.round(rate * 100)}</text>
              </g>
            );
          })}
          {[0, 2500, 5000].map((episode) => {
            const x = 38 + (episode / 5000) * 468;
            return <text key={episode} x={x} y="211" textAnchor={episode === 0 ? "start" : episode === 5000 ? "end" : "middle"}>{episode === 0 ? "0" : `${episode / 1000}k`}</text>;
          })}
        </g>
        <text className={styles.yLabel} x="-101" y="10" transform="rotate(-90)">Hit rate (%)</text>
        <text className={styles.xLabel} x="272" y="218" textAnchor="middle">Training episodes</text>
        <path
          d={linePath(position, width, height)}
          className={`${styles.curve} ${styles.positionCurve} ${active === "position" ? styles.activeCurve : ""}`}
        />
        <path
          d={linePath(velocity, width, height)}
          className={`${styles.curve} ${styles.velocityCurve} ${active === "velocity" ? styles.activeCurve : ""}`}
        />
      </svg>
      <div className={styles.legend} aria-hidden="true">
        <span className={styles.positionLegend}>Position only · {percent(lastPosition.hitRate)}</span>
        <span className={styles.velocityLegend}>+ velocity · {percent(lastVelocity.hitRate)}</span>
      </div>
    </div>
  );
}

export function MarkovPongPlayground() {
  const titleId = useId();
  const results = useMemo(() => trainPongPair(), []);
  const [mode, setMode] = useState<PongObservationMode>("position");
  const [curveIndex, setCurveIndex] = useState(0);
  const [training, setTraining] = useState(false);
  const [speed, setSpeed] = useState("normal");
  const [state, setState] = useState<PongTrueState>(freshReplay);
  const [watching, setWatching] = useState(false);
  const courtRef = useRef<HTMLDivElement>(null);
  const maximumCurveIndex = results.position.curve.length - 1;
  const revealedPosition = results.position.curve.slice(0, curveIndex + 1);
  const revealedVelocity = results.velocity.curve.slice(0, curveIndex + 1);
  const currentEpisode = revealedPosition[revealedPosition.length - 1].episode;
  const selected = results[mode];

  useEffect(() => {
    if (!training) return undefined;
    const delay = speed === "fast" ? 45 : speed === "slow" ? 220 : 110;
    const timer = window.setInterval(() => {
      setCurveIndex((current) => {
        if (current >= maximumCurveIndex) {
          setTraining(false);
          return current;
        }
        return current + 1;
      });
    }, delay);
    return () => window.clearInterval(timer);
  }, [maximumCurveIndex, speed, training]);

  useEffect(() => {
    if (!watching) return undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.done) {
          setWatching(false);
          return current;
        }
        const action = pongPolicyAction(selected.qValues, mode, current);
        const next = stepMarkovPong(current, action).state;
        if (next.done) setWatching(false);
        return next;
      });
    }, reducedMotion ? 650 : 360);
    return () => window.clearInterval(timer);
  }, [mode, selected.qValues, watching]);

  function resetReplay() {
    setWatching(false);
    setState(freshReplay());
  }

  function chooseMode(next: PongObservationMode) {
    setMode(next);
    resetReplay();
  }

  function manualStep(action: PongAction) {
    setWatching(false);
    setState((current) => current.done ? freshReplay() : stepMarkovPong(current, action).state);
  }

  function onCourtKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const action = event.key === "ArrowLeft" ? 0 : event.key === "ArrowRight" ? 2 : event.key === " " || event.key === "ArrowDown" ? 1 : null;
    if (action === null) return;
    event.preventDefault();
    manualStep(action);
  }

  const visibleVelocity = mode === "velocity";
  const liveResult = state.done ? state.outcome === "hit" ? "+1 · hit" : "−1 · miss" : "0 · rally in progress";

  return (
    <section className={styles.lab} aria-labelledby={titleId} data-markov-pong-lab data-mode={mode}>
      <header className={styles.header}>
        <p className={styles.kicker}>Same game · same learner</p>
        <h3 id={titleId}>What changes when the agent can see velocity?</h3>
        <p>Train both representations together, then play or replay the policy that each one learned.</p>
      </header>

      <fieldset className={styles.modeControl}>
        <legend>Agent observation</legend>
        <label className={mode === "position" ? styles.selectedMode : undefined}>
          <input type="radio" name="pong-observation" checked={mode === "position"} onChange={() => chooseMode("position")} />
          Position only <span>(x, y, paddle)</span>
        </label>
        <label className={mode === "velocity" ? styles.selectedMode : undefined}>
          <input type="radio" name="pong-observation" checked={mode === "velocity"} onChange={() => chooseMode("velocity")} />
          Position + velocity <span>(x, y, vₓ, vᵧ, paddle)</span>
        </label>
      </fieldset>

      <div className={styles.body}>
        <div className={styles.environmentColumn}>
          <div className={styles.observation} aria-label={visibleVelocity ? `Observed ball position ${state.ballX}, ${state.ballY}; velocity ${state.ballVx}, ${state.ballVy}; paddle ${state.paddleX}.` : `Observed ball position ${state.ballX}, ${state.ballY}; paddle ${state.paddleX}. Velocity is hidden.`}>
            <span>ball ({state.ballX}, {state.ballY})</span>
            <span className={visibleVelocity ? styles.velocityVisible : styles.velocityHidden}>{visibleVelocity ? `velocity (${state.ballVx > 0 ? "+" : "−"}1, ${state.ballVy > 0 ? "+" : "−"}1)` : "velocity hidden"}</span>
            <span>paddle {state.paddleX}</span>
          </div>

          <div
            className={styles.court}
            ref={courtRef}
            tabIndex={0}
            onKeyDown={onCourtKeyDown}
            role="application"
            aria-label={`Quantized Pong court. Ball at column ${state.ballX}, row ${state.ballY}. Paddle at column ${state.paddleX}. Use left and right arrows to move, or space to stay.`}
            data-outcome={state.outcome ?? "playing"}
          >
            <span className={styles.centerLine} aria-hidden="true" />
            <span className={styles.ball} style={{ left: `${((state.ballX + 0.5) / MARKOV_PONG.columns) * 100}%`, top: `${((state.ballY + 0.5) / MARKOV_PONG.rows) * 100}%` }} data-ball-x={state.ballX} data-ball-y={state.ballY} aria-hidden="true" />
            {visibleVelocity ? <span className={styles.velocityArrow} style={{ left: `${((state.ballX + 0.5) / MARKOV_PONG.columns) * 100}%`, top: `${((state.ballY + 0.5) / MARKOV_PONG.rows) * 100}%`, "--vx": state.ballVx, "--vy": state.ballVy } as React.CSSProperties} aria-hidden="true">↘</span> : null}
            <span className={styles.paddle} style={{ left: `${((state.paddleX + 0.5) / MARKOV_PONG.columns) * 100}%` }} data-paddle-x={state.paddleX} aria-hidden="true" />
            {state.done ? <span className={state.outcome === "hit" ? styles.hitBadge : styles.missBadge}>{state.outcome === "hit" ? "+1 · hit" : "−1 · miss"}</span> : null}
          </div>

          <div className={styles.playControls}>
            <button type="button" onClick={() => manualStep(0)} aria-label="Move paddle left">← Left</button>
            <button type="button" onClick={() => manualStep(1)}>Stay</button>
            <button type="button" onClick={() => manualStep(2)} aria-label="Move paddle right">Right →</button>
          </div>
          <div className={styles.replayRow}>
            <button type="button" className={styles.watchButton} onClick={() => { if (state.done) setState(freshReplay()); setWatching((current) => !current); }} disabled={curveIndex < maximumCurveIndex}>
              {watching ? "Pause policy" : "Watch learned policy"}
            </button>
            <button type="button" className={styles.resetButton} onClick={resetReplay}>New rally</button>
            <span>{liveResult}</span>
          </div>
          <p className={styles.humanNote}>You can use the motion you remember. The position-only learner cannot.</p>
        </div>

        <div className={styles.learningColumn} data-training-episodes={currentEpisode}>
          <div className={styles.chartHeader}>
            <div>
              <p>Greedy evaluation</p>
              <strong>{currentEpisode.toLocaleString()} episodes</strong>
            </div>
            <label>Playback speed
              <select value={speed} onChange={(event) => setSpeed(event.target.value)}>
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </label>
          </div>
          <LearningChart position={revealedPosition} velocity={revealedVelocity} active={mode} />
          <div className={styles.trainingControls}>
            <button type="button" className={styles.trainButton} onClick={() => setTraining((current) => !current)} disabled={curveIndex >= maximumCurveIndex}>
              {training ? "Pause training" : curveIndex === 0 ? "Train both agents" : "Continue training"}
            </button>
            <button type="button" className={styles.resetButton} onClick={() => { setTraining(false); setCurveIndex(0); resetReplay(); }} disabled={curveIndex === 0}>Reset experiment</button>
          </div>
          <p className={styles.evaluationNote}>Every point freezes learning and tests both policies on all 176 possible launches—without exploration.</p>
        </div>
      </div>

      <details className={styles.details}>
        <summary>How does the learner work?</summary>
        <div>
          <p>This teaching environment quantizes Pong into an 11 × 9 grid. Tabular Q-learning updates the chosen action after every transition:</p>
          <p className={styles.formula}>Q(s,a) ← Q(s,a) + 0.20 [r + 0.98 max Q(s′,a′) − Q(s,a)]</p>
          <p>Both agents receive the same launches, actions, rewards, 5,000-episode budget, and exploration schedule. Only the observation changes. Seed 7 makes the computed curve reproducible.</p>
        </div>
      </details>
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">Training has reached {currentEpisode} episodes. Position-only hit rate {percent(revealedPosition[revealedPosition.length - 1].hitRate)}. Position plus velocity hit rate {percent(revealedVelocity[revealedVelocity.length - 1].hitRate)}.</p>
    </section>
  );
}
