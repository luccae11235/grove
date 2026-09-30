import { markovCountWord, markovNumber, markovText, type MarkovLocale } from "../markovLocale";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MarkovPongPlayground.module.css";
import { trainingFrameDelay } from "../markovTrainingMotion";
import {
  continuePongRally,
  DEFAULT_PONG_TRAINING,
  enumeratePongStarts,
  MARKOV_PONG,
  pongPolicyAction,
  pongRandom,
  stepMarkovPong,
  trainMarkovPong,
  trainPongPair,
  type PongCurvePoint,
  type PongObservationMode,
  type PongTrueState,
} from "./experiment";

const CHECKPOINT_EPISODES = DEFAULT_PONG_TRAINING.evaluationInterval;
const DEMO_STARTS = (() => {
  const starts = enumeratePongStarts();
  const random = pongRandom(29);
  for (let index = starts.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [starts[index], starts[swapIndex]] = [starts[swapIndex], starts[index]];
  }
  return starts;
})();

function demoStart(index: number) {
  return { ...DEMO_STARTS[index % DEMO_STARTS.length] };
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
        {[0, 2500, 5000].map((episode) => {
          const x = 38 + (episode / 5000) * 468;
          return <text key={episode} x={x} y="211" textAnchor={episode === 0 ? "start" : episode === 5000 ? "end" : "middle"}>{episode === 0 ? "0" : `${episode / 1000}k`}</text>;
        })}
      </g>
      {axisTitles ? <>
        <text className={styles.yLabel} x="-101" y="10" transform="rotate(-90)">{markovText(locale, "Hit rate (%)")}</text>
        <text className={styles.xLabel} x="272" y="218" textAnchor="middle">{markovText(locale, "Training episodes")}</text>
      </> : null}
      {children}
    </svg>
  );
}

function LearningChart({ points, mode, locale }: { points: readonly PongCurvePoint[]; mode: PongObservationMode; locale: MarkovLocale }) {
  const latest = points[points.length - 1];
  return (
    <div className={styles.chartWrap}>
      <ChartFrame locale={locale} label={locale === "pt-BR" ? `A política com ${mode === "position" ? "apenas a posição" : "posição e velocidade"} acerta ${percent(latest.hitRate)} após ${markovNumber(locale, latest.episode)} episódios de treinamento.` : `${mode === "position" ? "Position-only" : "Position and velocity"} policy hit rate is ${percent(latest.hitRate)} after ${latest.episode} training episodes.`}>
        <path d={linePath(points)} className={`${styles.curve} ${styles.activeCurve} ${mode === "position" ? styles.positionCurve : styles.velocityCurve}`} />
      </ChartFrame>
    </div>
  );
}

export function MarkovPongPlayground({ mode, locale = "en" }: { mode: PongObservationMode; locale?: MarkovLocale }) {
  const titleId = `markov-pong-title-${mode}`;
  const results = useMemo(() => trainMarkovPong(mode), [mode]);
  const [curveIndex, setCurveIndex] = useState(0);
  const [training, setTraining] = useState(false);
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newRally, setNewRally] = useState(false);
  const [episodesPerSecond, setEpisodesPerSecond] = useState(500);
  const [state, setState] = useState<PongTrueState>(() => demoStart(0));
  const [runResult, setRunResult] = useState({ hits: 0, misses: 0 });
  const curveIndexRef = useRef(curveIndex);
  const launchIndexRef = useRef(0);
  const resetFrameRef = useRef<number | null>(null);
  const newRallyTimerRef = useRef<number | null>(null);
  const maximumCurveIndex = results.curve.length - 1;
  const revealedCurve = results.curve.slice(0, curveIndex + 1);
  const currentPoint = revealedCurve[revealedCurve.length - 1];
  const visibleVelocity = mode === "velocity";
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
        if (current.done && current.outcome !== "hit") return current;
        const active = continuePongRally(current);
        const qValues = running
          ? results.qValues
          : results.qSnapshots[curveIndexRef.current];
        const next = stepMarkovPong(active, pongPolicyAction(qValues, mode, active)).state;
        if (running && next.done) {
          setRunResult((result) => next.outcome === "hit"
            ? { ...result, hits: result.hits + 1 }
            : { ...result, misses: result.misses + 1 });
        }
        return next;
      });
    }, running ? 110 : trainingFrameMs);
    return () => window.clearInterval(timer);
  }, [mode, results.qSnapshots, results.qValues, running, training, trainingFrameMs]);

  useEffect(() => {
    if ((!training && !running) || !state.done) return undefined;

    if (state.outcome === "hit") return undefined;

    const missPause = window.setTimeout(() => {
      launchIndexRef.current = (launchIndexRef.current + 1) % DEMO_STARTS.length;
      setResetting(true);
      setNewRally(running);
      setState(demoStart(launchIndexRef.current));
      resetFrameRef.current = window.requestAnimationFrame(() => {
        resetFrameRef.current = window.requestAnimationFrame(() => setResetting(false));
      });
      if (running) {
        if (newRallyTimerRef.current !== null) window.clearTimeout(newRallyTimerRef.current);
        newRallyTimerRef.current = window.setTimeout(() => setNewRally(false), 520);
      }
    }, running ? 520 : 18);
    return () => window.clearTimeout(missPause);
  }, [running, state.done, state.outcome, training]);

  useEffect(() => () => {
    if (resetFrameRef.current !== null) window.cancelAnimationFrame(resetFrameRef.current);
    if (newRallyTimerRef.current !== null) window.clearTimeout(newRallyTimerRef.current);
  }, []);

  function toggleAgent() {
    if (curveIndex >= maximumCurveIndex) {
      if (!running) {
        launchIndexRef.current = 0;
        setState(demoStart(0));
        setRunResult({ hits: 0, misses: 0 });
        setResetting(false);
        setNewRally(false);
      }
      setRunning((current) => !current);
      return;
    }
    setRunning(false);
    setTraining((current) => !current);
  }

  const title = visibleVelocity
    ? markovText(locale, "What changes when velocity is part of the state?")
    : markovText(locale, "Can a position-only agent learn to return the ball?");
  const velocityAngle = Math.atan2(state.ballVy, state.ballVx) * (180 / Math.PI);

  return (
    <section
      className={styles.lab}
      role="region"
      aria-labelledby={titleId}
      data-markov-pong-lab
      data-mode={mode}
      data-training={String(training)}
      data-training-frame-ms={trainingFrameMs}
      style={{ "--training-frame-ms": `${trainingFrameMs}ms` } as React.CSSProperties}
    >
      <header className={styles.header}>
        <p className={styles.kicker}>{visibleVelocity ? markovText(locale, "Experiment 2 · Markov state") : markovText(locale, "Experiment 1 · Broken state")}</p>
        <h3 id={titleId}>{title}</h3>
      </header>

      <div className={styles.experimentBand}>
        <span>{markovText(locale, "Agent sees")}</span>
        <code>{visibleVelocity ? "z = (x, y, vₓ, vᵧ, paddle)" : "z = (x, y, paddle)"}</code>
        <strong>{visibleVelocity ? markovText(locale, "Velocity observed") : markovText(locale, "Velocity hidden")}</strong>
      </div>

      <div className={styles.body}>
        <div className={styles.environmentColumn}>
          <div className={`${styles.court} ${resetting ? styles.resetting : ""}`} role="img" aria-label={locale === "pt-BR" ? `Quadra de Pong. Bola na coluna ${state.ballX}, linha ${state.ballY}, movendo-se para a ${state.ballVx < 0 ? "esquerda" : "direita"} e para ${state.ballVy < 0 ? "cima" : "baixo"}. Raquete na coluna ${state.paddleX}.${state.outcome ? ` O agente ${state.outcome === "hit" ? "acertou" : "errou"} a bola.` : newRally ? " Uma nova jogada começou." : ""}` : `Pong court. Ball at column ${state.ballX}, row ${state.ballY}, moving ${state.ballVx < 0 ? "left" : "right"} and ${state.ballVy < 0 ? "up" : "down"}. Paddle at column ${state.paddleX}.${state.outcome ? ` The agent ${state.outcome === "hit" ? "hit" : "missed"} the ball.` : newRally ? " A new rally has started." : ""}`} data-outcome={state.outcome ?? "playing"} data-launch-index={launchIndexRef.current} data-ball-vx={state.ballVx} data-ball-vy={state.ballVy} data-resetting={String(resetting)}>
            <span className={styles.centerLine} aria-hidden="true" />
            <span className={styles.ball} style={{ left: `${((state.ballX + 0.5) / MARKOV_PONG.columns) * 100}%`, top: `${((state.ballY + 0.5) / MARKOV_PONG.rows) * 100}%` }} data-ball-x={state.ballX} data-ball-y={state.ballY} aria-hidden="true" />
            {visibleVelocity ? <span className={styles.velocityArrow} style={{ left: `${((state.ballX + 0.5) / MARKOV_PONG.columns) * 100}%`, top: `${((state.ballY + 0.5) / MARKOV_PONG.rows) * 100}%`, "--velocity-angle": `${velocityAngle}deg` } as React.CSSProperties} data-velocity-x={state.ballVx} data-velocity-y={state.ballVy} aria-hidden="true" /> : null}
            <span className={styles.paddle} style={{ left: `${((state.paddleX + 0.5) / MARKOV_PONG.columns) * 100}%` }} data-paddle-x={state.paddleX} aria-hidden="true" />
            {state.done ? <span className={state.outcome === "hit" ? styles.hitBadge : styles.missBadge}>{state.outcome === "hit" ? markovText(locale, "Hit") : markovText(locale, "Miss")}</span> : null}
            {newRally && !state.done ? <span className={styles.newRallyBadge}>{markovText(locale, "New rally")}</span> : null}
          </div>
          {curveIndex >= maximumCurveIndex ? <div className={styles.runScore} aria-live="polite" data-run-hits={runResult.hits} data-run-misses={runResult.misses}>
            <strong>{runResult.hits}</strong> {markovCountWord(locale, runResult.hits, "hits")} <span>· {runResult.misses} {markovCountWord(locale, runResult.misses, "misses")}</span>
          </div> : null}
        </div>

        <div className={styles.learningColumn} data-training-episodes={currentPoint.episode} data-active-hit-rate={Math.round(currentPoint.hitRate * 100)}>
          <div className={styles.result}>
            <strong>{percent(currentPoint.hitRate)}</strong>
            <span>{markovText(locale, "hit rate")}</span>
            <small>{markovNumber(locale, currentPoint.episode)} / {markovNumber(locale, 5000)} {markovText(locale, "episodes")}</small>
          </div>
          <LearningChart points={revealedCurve} mode={mode} locale={locale} />
          {curveIndex < maximumCurveIndex ? <label className={styles.speedControl}>
            <span>{markovText(locale, "Training speed")} <strong>{markovNumber(locale, episodesPerSecond)} {markovText(locale, "episodes/s")}</strong></span>
            <input type="range" min="100" max="2000" step="100" value={episodesPerSecond} onChange={(event) => setEpisodesPerSecond(Number(event.target.value))} aria-label={locale === "pt-BR" ? "Velocidade do treinamento em episódios por segundo" : "Training speed in episodes per second"} />
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
            ? locale === "pt-BR" ? `Treinamento concluído após ${markovNumber(locale, currentPoint.episode)} episódios. Taxa final de acertos: ${percent(currentPoint.hitRate)}.` : `Training complete after ${currentPoint.episode} episodes. Final hit rate ${percent(currentPoint.hitRate)}.`
            : curveIndex > 0
              ? locale === "pt-BR" ? `Treinamento pausado após ${markovNumber(locale, currentPoint.episode)} episódios. Taxa de acertos: ${percent(currentPoint.hitRate)}.` : `Training paused after ${currentPoint.episode} episodes. Hit rate ${percent(currentPoint.hitRate)}.`
              : markovText(locale, "Training has not started.")}
      </p>
    </section>
  );
}

export function MarkovPongComparison({ locale = "en" }: { locale?: MarkovLocale }) {
  const results = trainPongPair();
  return (
    <figure className={`${styles.lab} ${styles.comparison}`} aria-labelledby="markov-pong-comparison-title" data-markov-pong-comparison>
      <figcaption className={styles.comparisonHeader}>
        <p className={styles.kicker}>{markovText(locale, "Matched result")}</p>
        <h3 id="markov-pong-comparison-title">{markovText(locale, "One missing variable changes what can be learned")}</h3>
        <p>{markovText(locale, "Same game and training budget. Only the state representation differs.")}</p>
      </figcaption>
      <div className={styles.comparisonBody}>
        <ChartFrame locale={locale} axisTitles label={locale === "pt-BR" ? `Após 5.000 episódios, o agente que só vê a posição rebate ${percent(results.position.finalHitRate)} dos lançamentos; o agente que conhece a velocidade rebate ${percent(results.velocity.finalHitRate)}.` : `After 5,000 episodes, the position-only agent returns ${percent(results.position.finalHitRate)} of launches and the velocity-aware agent returns ${percent(results.velocity.finalHitRate)}.`}>
          <path d={linePath(results.position.curve)} className={`${styles.curve} ${styles.activeCurve} ${styles.positionCurve}`} />
          <path d={linePath(results.velocity.curve)} className={`${styles.curve} ${styles.activeCurve} ${styles.velocityCurve}`} />
        </ChartFrame>
        <div className={styles.comparisonStats}>
          <div><span className={styles.positionLegend}>{markovText(locale, "Position only")}</span><strong>{percent(results.position.finalHitRate)}</strong><small>{markovText(locale, "velocity hidden")}</small></div>
          <div><span className={styles.velocityLegend}>{markovText(locale, "Position + velocity")}</span><strong>{percent(results.velocity.finalHitRate)}</strong><small>{markovText(locale, "Markov state")}</small></div>
        </div>
      </div>
    </figure>
  );
}
