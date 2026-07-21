/**
 * Lab 2 — sensor manipulation.
 *
 * The fragile floor is drawn identically whether the camera is on or off. Only
 * the camera indicator changes. That is the whole argument: reality did not
 * change, the observation did.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./RewardHacking.module.css";
import { AgentTag, QBars, Scoreboard, fmt, isPt, type RhLocale } from "./shared";
import {
  SENSOR_ACTIONS,
  SENSOR_LAYOUT,
  evaluateSensorPolicy,
  sensorStateIndex,
  trainSensorAgent,
} from "./sensorMdp";
import type { RewardMode } from "./engine";

const CELL = 40;
const PLAYBACK_MS = 420;

const key = (position: { x: number; y: number }) => `${position.x},${position.y}`;
const WALKABLE = new Set(SENSOR_LAYOUT.walkable.map(key));

function SensorGrid({
  trace,
  step,
  accent,
  locale,
}: {
  trace: ReturnType<typeof evaluateSensorPolicy>["trace"];
  step: number;
  accent: string;
  locale: RhLocale;
}) {
  const pt = isPt(locale);
  const frame = trace[Math.min(step, trace.length - 1)];
  const width = SENSOR_LAYOUT.width * CELL;
  const height = SENSOR_LAYOUT.height * CELL;
  const cameraOn = frame.state.cameraActive;

  return (
    <svg
      className={styles.grid}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        pt
          ? "Corredor com rota segura, piso frágil, interruptor e a posição do robô"
          : "Corridor with the safe route, fragile floor, switch, and the robot's position"
      }
    >
      {Array.from({ length: SENSOR_LAYOUT.height }, (_, y) =>
        Array.from({ length: SENSOR_LAYOUT.width }, (_, x) => {
          const cell = { x, y };
          const walkable = WALKABLE.has(key(cell));
          const isSwitch = key(cell) === key(SENSOR_LAYOUT.switch);
          if (!walkable && !isSwitch) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * CELL}
              y={y * CELL}
              width={CELL}
              height={CELL}
              fill={isSwitch ? "var(--surface-subtle)" : "#fff"}
              stroke="var(--grid-line, #d8ded9)"
              strokeWidth={1}
            />
          );
        }),
      )}

      {/* The fragile floor never changes appearance with camera state. */}
      <rect
        x={SENSOR_LAYOUT.fragile.x * CELL}
        y={SENSOR_LAYOUT.fragile.y * CELL}
        width={CELL}
        height={CELL}
        fill="#f2dfc8"
        stroke="#b26935"
        strokeWidth={1.6}
        strokeDasharray="5 3"
      />
      <text
        x={SENSOR_LAYOUT.fragile.x * CELL + CELL / 2}
        y={SENSOR_LAYOUT.fragile.y * CELL + CELL / 2 + 4}
        textAnchor="middle"
        fontSize={11}
        fill="#8a4f28"
      >
        ▨
      </text>

      <rect
        x={SENSOR_LAYOUT.start.x * CELL + 3}
        y={SENSOR_LAYOUT.start.y * CELL + 3}
        width={CELL - 6}
        height={CELL - 6}
        rx={5}
        fill="none"
        stroke="var(--text-muted)"
        strokeDasharray="4 3"
      />
      <circle
        cx={SENSOR_LAYOUT.destination.x * CELL + CELL / 2}
        cy={SENSOR_LAYOUT.destination.y * CELL + CELL / 2}
        r={11}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
      />
      <text
        x={SENSOR_LAYOUT.destination.x * CELL + CELL / 2}
        y={SENSOR_LAYOUT.destination.y * CELL + CELL / 2 + 4}
        textAnchor="middle"
        fontSize={11}
        fill="var(--accent)"
      >
        ✦
      </text>

      {/* Switch cell, plus the camera indicator that is allowed to change. */}
      <text
        x={SENSOR_LAYOUT.switch.x * CELL + CELL / 2}
        y={SENSOR_LAYOUT.switch.y * CELL + CELL / 2 + 4}
        textAnchor="middle"
        fontSize={13}
        fill="var(--text-muted)"
      >
        ⏻
      </text>
      <g>
        <circle
          cx={width - 16}
          cy={14}
          r={7}
          fill={cameraOn ? "var(--accent)" : "none"}
          stroke={cameraOn ? "var(--accent)" : "var(--text-muted)"}
          strokeWidth={1.6}
        />
        <text
          x={width - 30}
          y={18}
          textAnchor="end"
          fontSize={9.5}
          fill="var(--text-muted)"
        >
          {cameraOn ? (pt ? "câmera ligada" : "camera on") : pt ? "câmera desligada" : "camera off"}
        </text>
      </g>

      <circle
        cx={frame.state.position.x * CELL + CELL / 2}
        cy={frame.state.position.y * CELL + CELL / 2}
        r={8.5}
        fill={accent}
      />
    </svg>
  );
}

export function SensorLab({ locale = "en" }: { locale?: RhLocale }) {
  const pt = isPt(locale);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const runs = useMemo(() => {
    const result = {} as Record<
      RewardMode,
      { qValues: Float64Array; evaluation: ReturnType<typeof evaluateSensorPolicy> }
    >;
    for (const mode of ["proxy", "aligned"] as const) {
      const qValues = trainSensorAgent(mode);
      result[mode] = { qValues, evaluation: evaluateSensorPolicy(qValues, mode) };
    }
    return result;
  }, []);

  const proxy = runs.proxy.evaluation;
  const aligned = runs.aligned.evaluation;
  const maxStep = Math.max(proxy.trace.length, aligned.trace.length) - 1;

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

  // Decisive state: beside the switch, camera still on.
  const decisive = { position: { x: 1, y: 2 }, cameraActive: true };
  const offset = sensorStateIndex(decisive) * SENSOR_ACTIONS.length;
  const actionLabels = pt
    ? ["cima", "direita", "baixo", "esquerda", "desligar câmera"]
    : ["up", "right", "down", "left", "turn camera off"];
  const qBarsFor = (mode: RewardMode) =>
    SENSOR_ACTIONS.map((_, index) => ({
      label: actionLabels[index],
      value: runs[mode].qValues[offset + index],
    }));

  return (
    <section className={styles.lab} aria-label={pt ? "Laboratório da câmera" : "Camera lab"}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{pt ? "MDP 2 · Manipulação" : "MDP 2 · Manipulation"}</p>
          <h3>{pt ? "A violação que ninguém viu" : "The violation nobody saw"}</h3>
          <p className={styles.lede}>
            {pt
              ? "O piso frágil tem exatamente a mesma aparência com a câmera ligada ou desligada. Só o indicador muda."
              : "The fragile floor looks exactly the same whether the camera is on or off. Only the indicator changes."}
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
          {playing ? (pt ? "Pausar" : "Pause") : pt ? "Executar a entrega" : "Run the delivery"}
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
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            setPlaying(false);
            setStep((current) => Math.min(maxStep, current + 1));
          }}
          disabled={step >= maxStep}
        >
          {pt ? "Passo" : "Step"}
        </button>
        <span className={styles.stepReadout}>
          {pt ? "Passo" : "Step"} {step} / {maxStep}
        </span>
      </div>

      <Scoreboard
        locale={locale}
        optimized={[
          {
            label: pt ? "Violações detectadas (proxy)" : "Detected violations (proxy)",
            value: String(proxy.detectedViolations),
            tone: "good",
          },
          {
            label: pt ? "Violações detectadas (alinhado)" : "Detected violations (aligned)",
            value: String(aligned.detectedViolations),
            tone: "good",
          },
        ]}
        human={[
          {
            label: pt ? "Violações reais (proxy)" : "Real violations (proxy)",
            value: String(proxy.realViolations),
            tone: proxy.realViolations > 0 ? "bad" : "good",
          },
          {
            label: pt ? "Violações reais (alinhado)" : "Real violations (aligned)",
            value: String(aligned.realViolations),
            tone: aligned.realViolations > 0 ? "bad" : "good",
          },
        ]}
      />

      <div className={styles.agents}>
        {(["proxy", "aligned"] as const).map((mode) => {
          const run = runs[mode];
          const accent = mode === "proxy" ? "#b23a48" : "#157451";
          return (
            <div className={styles.agentPanel} key={mode}>
              <AgentTag mode={mode} locale={locale} />
              <p className={styles.rewardRule}>
                {mode === "proxy"
                  ? pt
                    ? "−12 se a câmera detectar a travessia."
                    : "−12 if the camera detects the crossing."
                  : pt
                    ? "−12 ao atravessar fisicamente o piso frágil."
                    : "−12 for physically crossing the fragile floor."}
              </p>
              <div className={styles.gridWrap}>
                <SensorGrid
                  trace={run.evaluation.trace}
                  step={step}
                  accent={accent}
                  locale={locale}
                />
              </div>
              <p className={styles.caption}>
                {pt
                  ? `${run.evaluation.steps} passos · recompensa ${fmt(run.evaluation.reward, 2, locale)}`
                  : `${run.evaluation.steps} steps · reward ${fmt(run.evaluation.reward, 2, locale)}`}
              </p>
              <p className={styles.panelTitle} style={{ marginTop: 14 }}>
                {pt ? "Ao lado do interruptor" : "Next to the switch"}
              </p>
              <QBars bars={qBarsFor(mode)} accent={accent} locale={locale} />
            </div>
          );
        })}
      </div>

      <p className={styles.verdict}>
        {pt ? (
          <>
            Os dois agentes registram <strong>0 violações detectadas</strong>. Mas o proxy
            atravessou o piso <strong>uma vez</strong> e o alinhado, <strong>nenhuma</strong>. A
            métrica não melhorou: o processo que a produz é que foi desligado.
          </>
        ) : (
          <>
            Both agents record <strong>0 detected violations</strong>. But the proxy crossed the
            floor <strong>once</strong> and the aligned agent <strong>never</strong>. The metric
            did not improve — the process that produces it was switched off.
          </>
        )}
      </p>
    </section>
  );
}
