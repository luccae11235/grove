import { useEffect, useMemo, useState } from "react";
import styles from "./RewardHacking.module.css";
import { isPt, type RhLocale } from "./shared";
import {
  CHECKPOINT_LAYOUT,
  createEnvironment,
  optimalCheckpointTrajectory,
  positionKey,
} from "./checkpointMdp";

const PLAYBACK_MS = 240;

export function OptimalCheckpointTrajectory({
  locale = "en",
}: {
  locale?: RhLocale;
}) {
  const pt = isPt(locale);
  const environment = useMemo(
    () => createEnvironment({ ...CHECKPOINT_LAYOUT }),
    [],
  );
  const trajectory = useMemo(
    () => optimalCheckpointTrajectory(environment),
    [environment],
  );
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setTimeout(() => {
      setStep((current) => {
        if (current >= trajectory.length - 1) {
          setRunning(false);
          return current;
        }
        return current + 1;
      });
    }, PLAYBACK_MS);
    return () => window.clearTimeout(timer);
  }, [running, step, trajectory.length]);

  const currentPosition = trajectory[step];
  const visited = new Set(
    trajectory.slice(0, step + 1).map((position) => positionKey(position)),
  );
  const completed = step === trajectory.length - 1;
  const nextCheckpoint =
    environment.checkpoints.findIndex((checkpoint) => {
      const firstVisit = trajectory.findIndex(
        (position) => positionKey(position) === positionKey(checkpoint),
      );
      return firstVisit > step;
    }) + 1;

  const status = completed
    ? pt
      ? `Volta completa · C1 → C2 → C3 → C4 → S em ${trajectory.length - 1} passos.`
      : `Lap complete · C1 → C2 → C3 → C4 → S in ${trajectory.length - 1} steps.`
    : running
      ? pt
        ? `Passo ${step} de ${trajectory.length - 1} · ${
            nextCheckpoint > 0 ? `a caminho de C${nextCheckpoint}` : "voltando para S"
          }.`
        : `Step ${step} of ${trajectory.length - 1} · ${
            nextCheckpoint > 0 ? `heading to C${nextCheckpoint}` : "returning to S"
          }.`
      : pt
        ? "Execute a rota de referência para ver a volta na ordem pretendida."
        : "Run the reference route to see the intended ordered lap.";

  function runTrajectory() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setStep(reducedMotion ? trajectory.length - 1 : 0);
    setRunning(!reducedMotion);
  }

  return (
    <section
      className={`${styles.lab} ${styles.optimalLab}`}
      aria-label={pt ? "Trajetória ótima pelos checkpoints" : "Optimal checkpoint trajectory"}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>GridWorld · MDP 1</p>
          <h3>{pt ? "Qual rota o agente deve seguir?" : "What route should the agent follow?"}</h3>
        </div>
        <p className={styles.optimalObjective}>
          {pt ? "Volta pretendida" : "Intended lap"}
          <strong>S → C1 → C2 → C3 → C4 → S</strong>
        </p>
      </header>

      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={runTrajectory}
          disabled={running}
        >
          {running
            ? pt
              ? "Mostrando a trajetória ótima…"
              : "Showing optimal trajectory…"
            : completed
              ? pt
                ? "Executar a trajetória ótima novamente"
                : "Run optimal trajectory again"
              : pt
                ? "Executar a trajetória ótima"
                : "Run optimal trajectory"}
        </button>
        <span className={styles.stepReadout} aria-live="polite">
          {status}
        </span>
      </div>

      <div className={styles.optimalStage}>
        <div
          className={styles.optimalBoard}
          role="grid"
          aria-label={
            pt
              ? "Pista de sete por sete com início, quatro checkpoints ordenados e três células de parede"
              : "Seven by seven track with a start, four ordered checkpoints, and three wall cells"
          }
        >
          {Array.from({ length: environment.height }, (_, y) =>
            Array.from({ length: environment.width }, (_, x) => {
              const position = { x, y };
              const key = positionKey(position);
              const checkpointIndex = environment.checkpoints.findIndex(
                (checkpoint) => positionKey(checkpoint) === key,
              );
              const isStart = key === positionKey(environment.start);
              const isWall = environment.walls.has(key);
              const isCurrent = key === positionKey(currentPosition);
              const isTrail = visited.has(key) && !isCurrent;
              const label = isStart
                ? "S"
                : checkpointIndex >= 0
                  ? `C${checkpointIndex + 1}`
                  : "";
              const accessibleLabel = isWall
                ? pt
                  ? `Parede na coluna ${x + 1}, linha ${y + 1}`
                  : `Wall at column ${x + 1}, row ${y + 1}`
                : label
                  ? pt
                    ? `${label} na coluna ${x + 1}, linha ${y + 1}`
                    : `${label} at column ${x + 1}, row ${y + 1}`
                  : pt
                    ? `Célula livre na coluna ${x + 1}, linha ${y + 1}`
                    : `Open cell at column ${x + 1}, row ${y + 1}`;

              return (
                <div
                  className={[
                    styles.optimalCell,
                    isWall ? styles.optimalWall : "",
                    isStart ? styles.optimalStart : "",
                    checkpointIndex >= 0 ? styles.optimalCheckpoint : "",
                    isTrail ? styles.optimalTrail : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="gridcell"
                  aria-label={accessibleLabel}
                  key={key}
                >
                  {label ? (
                    <span className={styles.optimalCellLabel}>{label}</span>
                  ) : null}
                  {isCurrent ? (
                    <span className={styles.optimalAgent} aria-hidden="true">
                      A
                    </span>
                  ) : null}
                </div>
              );
            }),
          )}
        </div>
        <p className={styles.optimalSummary}>
          {pt ? "A rota de referência passa por cada checkpoint na ordem e volta ao início em " : "The reference route visits each checkpoint in order and returns to the start in "}
          <strong>{trajectory.length - 1} {pt ? "passos" : "steps"}</strong>.
        </p>
      </div>
    </section>
  );
}
