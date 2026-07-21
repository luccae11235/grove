/**
 * Lab 1 — checkpoint repetition.
 *
 * Trains both agents on the same grid and plays their greedy policies side by
 * side. The reader can move C1 to test whether the loop still pays when the
 * exploit is made more expensive.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./RewardHacking.module.css";
import { AgentTag, QBars, Scoreboard, fmt, isPt, type RhLocale } from "./shared";
import {
  CHECKPOINT_ACTIONS,
  CHECKPOINT_LAYOUT,
  createEnvironment,
  evaluateCheckpointPolicy,
  isPlaceable,
  positionKey,
  stateIndex,
  trainCheckpointAgent,
  type CheckpointEnvironment,
  type Position,
} from "./checkpointMdp";
import type { RewardMode } from "./engine";

const CELL = 44;
const PLAYBACK_MS = 260;

interface AgentRun {
  qValues: Float64Array;
  evaluation: ReturnType<typeof evaluateCheckpointPolicy>;
}

function useTrainedAgents(environment: CheckpointEnvironment) {
  return useMemo(() => {
    const runs = {} as Record<RewardMode, AgentRun>;
    for (const mode of ["proxy", "aligned"] as const) {
      const qValues = trainCheckpointAgent(environment, mode);
      runs[mode] = {
        qValues,
        evaluation: evaluateCheckpointPolicy(environment, qValues, mode),
      };
    }
    return runs;
  }, [environment]);
}

function GridView({
  environment,
  trajectory,
  step,
  accent,
  editable,
  onMoveCheckpoint,
  locale,
}: {
  environment: CheckpointEnvironment;
  trajectory: Position[];
  step: number;
  accent: string;
  editable?: boolean;
  onMoveCheckpoint?: (position: Position) => void;
  locale: RhLocale;
}) {
  const width = environment.width * CELL;
  const height = environment.height * CELL;
  const position = trajectory[Math.min(step, trajectory.length - 1)];
  const visited = trajectory.slice(0, step + 1);

  return (
    <svg
      className={styles.grid}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        isPt(locale)
          ? "Grade da pista com checkpoints e a posição atual do agente"
          : "Track grid with checkpoints and the agent's current position"
      }
    >
      {Array.from({ length: environment.height }, (_, y) =>
        Array.from({ length: environment.width }, (_, x) => {
          const key = positionKey({ x, y });
          const isWall = environment.walls.has(key);
          return (
            <rect
              key={`${x}-${y}`}
              x={x * CELL}
              y={y * CELL}
              width={CELL}
              height={CELL}
              fill={isWall ? "#c8cec9" : "#fff"}
              stroke="var(--grid-line, #d8ded9)"
              strokeWidth={1}
            />
          );
        }),
      )}

      {/* Trail of cells already visited in this playback. */}
      {visited.map((cell, index) => (
        <rect
          key={`trail-${index}-${cell.x}-${cell.y}`}
          x={cell.x * CELL + 6}
          y={cell.y * CELL + 6}
          width={CELL - 12}
          height={CELL - 12}
          rx={5}
          fill={accent}
          opacity={0.1 + 0.16 * (index / Math.max(1, visited.length - 1))}
        />
      ))}

      <rect
        x={environment.start.x * CELL + 3}
        y={environment.start.y * CELL + 3}
        width={CELL - 6}
        height={CELL - 6}
        rx={6}
        fill="none"
        stroke="var(--text-muted)"
        strokeDasharray="4 3"
        strokeWidth={1.5}
      />
      <text
        x={environment.start.x * CELL + CELL / 2}
        y={environment.start.y * CELL + CELL - 7}
        textAnchor="middle"
        fontSize={9}
        fill="var(--text-muted)"
      >
        S
      </text>

      {environment.checkpoints.map((checkpoint, index) => (
        <g key={`cp-${index}`}>
          <circle
            cx={checkpoint.x * CELL + CELL / 2}
            cy={checkpoint.y * CELL + CELL / 2}
            r={CELL / 2 - 7}
            fill="none"
            stroke={index === 0 ? accent : "var(--text-muted)"}
            strokeWidth={index === 0 ? 2.4 : 1.4}
          />
          <text
            x={checkpoint.x * CELL + CELL / 2}
            y={checkpoint.y * CELL + CELL / 2 + 4}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={index === 0 ? accent : "var(--text-muted)"}
          >
            C{index + 1}
          </text>
        </g>
      ))}

      <circle
        cx={position.x * CELL + CELL / 2}
        cy={position.y * CELL + CELL / 2}
        r={9}
        fill={accent}
      />

      {/* Click targets for repositioning C1. */}
      {editable && onMoveCheckpoint
        ? Array.from({ length: environment.height }, (_, y) =>
            Array.from({ length: environment.width }, (_, x) => {
              const candidate = { x, y };
              if (!isPlaceable(environment, candidate, 0)) return null;
              return (
                <rect
                  key={`hit-${x}-${y}`}
                  className={styles.cellButton}
                  x={x * CELL}
                  y={y * CELL}
                  width={CELL}
                  height={CELL}
                  tabIndex={0}
                  role="button"
                  aria-label={
                    isPt(locale)
                      ? `Mover C1 para coluna ${x + 1}, linha ${y + 1}`
                      : `Move C1 to column ${x + 1}, row ${y + 1}`
                  }
                  onClick={() => onMoveCheckpoint(candidate)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onMoveCheckpoint(candidate);
                    }
                  }}
                />
              );
            }),
          )
        : null}
    </svg>
  );
}

export function CheckpointLab({
  locale = "en",
  editable = false,
}: {
  locale?: RhLocale;
  editable?: boolean;
}) {
  const pt = isPt(locale);
  const [c1, setC1] = useState<Position>(CHECKPOINT_LAYOUT.checkpoints[0]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const environment = useMemo(
    () =>
      createEnvironment({
        ...CHECKPOINT_LAYOUT,
        checkpoints: [c1, ...CHECKPOINT_LAYOUT.checkpoints.slice(1)],
      }),
    [c1],
  );

  const runs = useTrainedAgents(environment);
  const proxy = runs.proxy.evaluation;
  const aligned = runs.aligned.evaluation;
  const maxStep = Math.max(proxy.trajectory.length, aligned.trajectory.length) - 1;

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [environment]);

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

  // The decisive state: standing on C1 with it already credited.
  const decisive = { position: c1, nextCheckpoint: 1 };
  const offset = stateIndex(environment, decisive) * CHECKPOINT_ACTIONS.length;
  const directionLabels = pt
    ? ["cima", "direita", "baixo", "esquerda"]
    : ["up", "right", "down", "left"];
  const qBarsFor = (mode: RewardMode) =>
    CHECKPOINT_ACTIONS.map((action, index) => ({
      label: directionLabels[index],
      value: runs[mode].qValues[offset + index],
    }));

  const proxyQ = qBarsFor("proxy");
  const proxyTied =
    Math.max(...proxyQ.map((bar) => bar.value)) -
      Math.min(...proxyQ.map((bar) => bar.value)) <
    0.01;

  const exploitHeld = !proxy.completedLap && proxy.repeatedEntries > 0;

  return (
    <section className={styles.lab} aria-label={pt ? "Laboratório dos checkpoints" : "Checkpoint lab"}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{pt ? "MDP 1 · Repetição" : "MDP 1 · Repetition"}</p>
          <h3>{pt ? "A volta que nunca termina" : "The lap that never finishes"}</h3>
          <p className={styles.lede}>
            {pt
              ? "Os dois agentes treinam na mesma pista, com a mesma semente e os mesmos hiperparâmetros. Só a recompensa muda."
              : "Both agents train on the same track, with the same seed and the same hyperparameters. Only the reward changes."}
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
          {playing ? (pt ? "Pausar" : "Pause") : pt ? "Executar as duas políticas" : "Run both policies"}
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
        {editable ? (
          <button
            type="button"
            className={styles.button}
            onClick={() => setC1(CHECKPOINT_LAYOUT.checkpoints[0])}
            disabled={positionKey(c1) === positionKey(CHECKPOINT_LAYOUT.checkpoints[0])}
          >
            {pt ? "Devolver C1" : "Restore C1"}
          </button>
        ) : null}
        <span className={styles.stepReadout}>
          {pt ? "Passo" : "Step"} {step} / {maxStep}
        </span>
      </div>

      <Scoreboard
        locale={locale}
        optimized={[
          {
            label: pt ? "Pontos do proxy" : "Proxy points",
            value: fmt(proxy.reward, 2, locale),
            tone: "bad",
          },
          {
            label: pt ? "Pontos do alinhado" : "Aligned points",
            value: fmt(aligned.reward, 2, locale),
          },
        ]}
        human={[
          {
            label: pt ? "Voltas do proxy" : "Proxy laps",
            value: proxy.completedLap ? "1" : "0",
            tone: proxy.completedLap ? "good" : "bad",
          },
          {
            label: pt ? "Voltas do alinhado" : "Aligned laps",
            value: aligned.completedLap ? "1" : "0",
            tone: aligned.completedLap ? "good" : "bad",
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
                    ? "+1 ao entrar em qualquer checkpoint."
                    : "+1 for entering any checkpoint."
                  : pt
                    ? "+1 apenas pelo próximo checkpoint esperado, +10 ao fechar a volta."
                    : "+1 only for the next expected checkpoint, +10 for closing the lap."}
              </p>
              <div className={styles.gridWrap}>
                <GridView
                  environment={environment}
                  trajectory={run.evaluation.trajectory}
                  step={step}
                  accent={accent}
                  editable={editable && mode === "proxy"}
                  onMoveCheckpoint={editable && mode === "proxy" ? setC1 : undefined}
                  locale={locale}
                />
              </div>
              <p className={styles.panelTitle} style={{ marginTop: 16 }}>
                {pt ? "Ao pisar em C1" : "Standing on C1"}
              </p>
              <QBars
                bars={qBarsFor(mode)}
                accent={accent}
                locale={locale}
                tieNote={
                  mode === "proxy" && proxyTied
                    ? pt
                      ? "Empate: toda saída vale o mesmo, porque voltar sempre paga de novo."
                      : "A tie: every exit is worth the same, because coming back always pays again."
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>

      {editable ? (
        <p className={styles.statusNote}>
          {exploitHeld
            ? pt
              ? `Com C1 aqui o ciclo continua sendo a melhor estratégia: ${proxy.repeatedEntries} reentradas e nenhuma volta. Mover o checkpoint muda quanto o exploit rende, não se ele existe.`
              : `With C1 here the cycle is still the best strategy: ${proxy.repeatedEntries} re-entries and no completed lap. Moving the checkpoint changes how much the exploit pays, not whether it exists.`
            : pt
              ? "Nesta posição o proxy fechou a volta — vale investigar por quê."
              : "In this position the proxy completed a lap — worth investigating why."}
        </p>
      ) : null}

      <p className={styles.verdict}>
        {pt ? (
          <>
            O agente proxy termina com <strong>{fmt(proxy.reward, 2, locale)} pontos</strong> e{" "}
            <strong>nenhuma volta</strong>. O alinhado marca menos pontos e completa a corrida.{" "}
            A pontuação mais alta pertence ao agente que falhou no objetivo humano.
          </>
        ) : (
          <>
            The proxy agent ends with <strong>{fmt(proxy.reward, 2, locale)} points</strong> and{" "}
            <strong>no completed lap</strong>. The aligned agent scores fewer points and finishes
            the race. The higher score belongs to the agent that failed the human objective.
          </>
        )}
      </p>
    </section>
  );
}
