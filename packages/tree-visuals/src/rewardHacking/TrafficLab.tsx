/**
 * Lab 3 — metering-ramp scope failure.
 *
 * Nothing is repeated and no sensor is disabled. The proxy simply never counts
 * the ramp, so the queue it creates is invisible to its own reward. The visual
 * keeps highway and ramp in two stable regions so the reader can see which one
 * is paying for the good number.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./RewardHacking.module.css";
import { AgentTag, QBars, Scoreboard, fmt, isPt, type RhLocale } from "./shared";
import {
  TRAFFIC_ACTIONS,
  TRAFFIC_CONFIG,
  evaluateTrafficPolicy,
  trafficStateIndex,
  trainTrafficAgent,
} from "./trafficMdp";
import type { RewardMode } from "./engine";

const PLAYBACK_MS = 160;
const SCENE_WIDTH = 340;

function TrafficScene({
  frame,
  accent,
  locale,
}: {
  frame: ReturnType<typeof evaluateTrafficPolicy>["trace"][number];
  accent: string;
  locale: RhLocale;
}) {
  const pt = isPt(locale);
  const speed = frame.event?.speed ?? 1;
  const queue = frame.state.queue;
  const action = frame.action === null ? null : TRAFFIC_ACTIONS[frame.action].name;

  return (
    <div className={styles.trafficScene}>
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} 130`}
        role="img"
        style={{ width: "100%", height: "auto" }}
        aria-label={
          pt
            ? `Rodovia a ${Math.round(speed * 100)} por cento de velocidade com ${queue} carros na rampa`
            : `Highway at ${Math.round(speed * 100)} percent speed with ${queue} cars queued on the ramp`
        }
      >
        {/* Highway */}
        <rect x={0} y={14} width={SCENE_WIDTH} height={34} rx={5} fill="var(--surface-subtle)" />
        {Array.from({ length: 9 }, (_, index) => (
          <rect
            key={`lane-${index}`}
            x={12 + index * 37}
            y={30}
            width={20}
            height={2.5}
            fill="var(--grid-line, #d8ded9)"
          />
        ))}
        {Array.from({ length: TRAFFIC_CONFIG.highwayCars > 0 ? 7 : 0 }, (_, index) => (
          <rect
            key={`car-${index}`}
            x={16 + index * 46}
            y={22}
            width={17}
            height={11}
            rx={2.5}
            fill={accent}
            opacity={0.35 + 0.65 * speed}
          />
        ))}
        <text x={0} y={9} fontSize={9} fill="var(--text-muted)">
          {pt ? "RODOVIA" : "HIGHWAY"}
        </text>
        <text x={SCENE_WIDTH} y={9} fontSize={9} textAnchor="end" fill="var(--text-muted)">
          {Math.round(speed * 100)}%
        </text>

        {/* Signal */}
        <line
          x1={58}
          y1={48}
          x2={58}
          y2={72}
          stroke="var(--grid-line, #d8ded9)"
          strokeWidth={2}
        />
        <circle
          cx={58}
          cy={78}
          r={6.5}
          fill={action === "release" ? "#157451" : "#b23a48"}
        />

        {/* Ramp queue */}
        <text x={0} y={104} fontSize={9} fill="var(--text-muted)">
          {pt ? "RAMPA" : "RAMP"}
        </text>
        {Array.from({ length: TRAFFIC_CONFIG.maxQueue }, (_, index) => {
          const filled = index < queue;
          return (
            <rect
              key={`queued-${index}`}
              x={78 + index * 26}
              y={110}
              width={20}
              height={13}
              rx={2.5}
              fill={filled ? accent : "none"}
              stroke={filled ? accent : "var(--grid-line, #d8ded9)"}
              strokeWidth={1.4}
              opacity={filled ? 0.9 : 1}
            />
          );
        })}
      </svg>
      <p className={styles.caption} style={{ margin: 0 }}>
        <span
          className={`${styles.actionPill} ${
            action === "release" ? styles.actionRelease : styles.actionHold
          }`}
        >
          {action === "release" ? (pt ? "Liberar" : "Release") : pt ? "Segurar" : "Hold"}
        </span>{" "}
        {pt ? "fila" : "queue"} {queue}/{TRAFFIC_CONFIG.maxQueue}
      </p>
    </div>
  );
}

export function TrafficLab({ locale = "en" }: { locale?: RhLocale }) {
  const pt = isPt(locale);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const runs = useMemo(() => {
    const result = {} as Record<
      RewardMode,
      { qValues: Float64Array; evaluation: ReturnType<typeof evaluateTrafficPolicy> }
    >;
    for (const mode of ["proxy", "aligned"] as const) {
      const qValues = trainTrafficAgent(mode);
      result[mode] = { qValues, evaluation: evaluateTrafficPolicy(qValues, mode) };
    }
    return result;
  }, []);

  const proxy = runs.proxy.evaluation;
  const aligned = runs.aligned.evaluation;
  const maxStep = Math.min(proxy.trace.length, aligned.trace.length) - 1;

  useEffect(() => {
    if (!playing) return undefined;
    timer.current = window.setInterval(() => {
      setStep((current) => {
        if (current >= maxStep) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, PLAYBACK_MS);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [playing, maxStep]);

  // Decisive state: four cars waiting, highway clear.
  const decisive = { queue: 4, congestion: 0 };
  const offset = trafficStateIndex(decisive) * TRAFFIC_ACTIONS.length;
  const actionLabels = pt ? ["segurar", "liberar"] : ["hold", "release"];
  const qBarsFor = (mode: RewardMode) =>
    TRAFFIC_ACTIONS.map((_, index) => ({
      label: actionLabels[index],
      value: runs[mode].qValues[offset + index],
    }));

  const delayRatio = proxy.totalSystemDelay / Math.max(1e-9, aligned.totalSystemDelay);

  return (
    <section className={styles.lab} aria-label={pt ? "Laboratório da rampa" : "Ramp lab"}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{pt ? "MDP 3 · Omissão" : "MDP 3 · Omission"}</p>
          <h3>{pt ? "Quem paga pelo número bonito?" : "Who pays for the pretty number?"}</h3>
          <p className={styles.lede}>
            {pt
              ? "Não há sensor para desligar nem evento para repetir. A recompensa proxy simplesmente não enxerga a rampa."
              : "There is no sensor to disable and no event to repeat. The proxy reward simply cannot see the ramp."}
          </p>
        </div>
      </header>

      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => {
            if (step >= maxStep) setStep(0);
            setPlaying((value) => !value);
          }}
        >
          {playing ? (pt ? "Pausar" : "Pause") : pt ? "Executar 120 passos" : "Run 120 steps"}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
          disabled={step === 0}
        >
          {pt ? "Reiniciar" : "Reset"}
        </button>
        <span className={styles.stepReadout}>
          {pt ? "Passo" : "Step"} {step} / {maxStep}
        </span>
      </div>

      <Scoreboard
        locale={locale}
        optimized={[
          {
            label: pt ? "Velocidade (proxy)" : "Highway speed (proxy)",
            value: `${Math.round(proxy.averageHighwaySpeed * 100)}%`,
            tone: "good",
          },
          {
            label: pt ? "Velocidade (alinhado)" : "Highway speed (aligned)",
            value: `${Math.round(aligned.averageHighwaySpeed * 100)}%`,
          },
        ]}
        human={[
          {
            label: pt ? "Atraso total (proxy)" : "Total delay (proxy)",
            value: fmt(proxy.totalSystemDelay, 0, locale),
            tone: "bad",
          },
          {
            label: pt ? "Atraso total (alinhado)" : "Total delay (aligned)",
            value: fmt(aligned.totalSystemDelay, 0, locale),
            tone: "good",
          },
        ]}
      />

      <div className={styles.agents}>
        {(["proxy", "aligned"] as const).map((mode) => {
          const run = runs[mode];
          const accent = mode === "proxy" ? "#b23a48" : "#157451";
          const frame = run.evaluation.trace[Math.min(step, run.evaluation.trace.length - 1)];
          return (
            <div className={styles.agentPanel} key={mode}>
              <AgentTag mode={mode} locale={locale} />
              <p className={styles.rewardRule}>
                {mode === "proxy"
                  ? pt
                    ? "Recompensa = velocidade da rodovia."
                    : "Reward = highway speed."
                  : pt
                    ? "Recompensa = −(fila da rampa + atraso da rodovia)."
                    : "Reward = −(ramp queue + highway delay)."}
              </p>
              <TrafficScene frame={frame} accent={accent} locale={locale} />
              <p className={styles.caption}>
                {pt
                  ? `Fila média ${fmt(run.evaluation.averageQueue, 2, locale)} · ${run.evaluation.releasedCars} carros liberados`
                  : `Mean queue ${fmt(run.evaluation.averageQueue, 2, locale)} · ${run.evaluation.releasedCars} cars released`}
              </p>
              <p className={styles.panelTitle} style={{ marginTop: 14 }}>
                {pt ? "Com quatro carros esperando" : "With four cars waiting"}
              </p>
              <QBars bars={qBarsFor(mode)} accent={accent} locale={locale} />
            </div>
          );
        })}
      </div>

      <p className={styles.verdict}>
        {pt ? (
          <>
            A rodovia do proxy fica em <strong>100%</strong> — a métrica perfeita. Mas ele libera{" "}
            <strong>zero carros</strong> e o atraso total fica{" "}
            <strong>{fmt(delayRatio, 1, locale)}× maior</strong> que o do agente alinhado. O custo
            não desapareceu: mudou de grupo.
          </>
        ) : (
          <>
            The proxy's highway sits at <strong>100%</strong> — a perfect metric. But it releases{" "}
            <strong>zero cars</strong>, and total delay ends up{" "}
            <strong>{fmt(delayRatio, 1, locale)}× higher</strong> than the aligned agent's. The cost
            did not disappear; it changed groups.
          </>
        )}
      </p>
    </section>
  );
}
