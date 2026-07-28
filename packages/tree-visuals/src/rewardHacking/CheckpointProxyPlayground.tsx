import { useEffect, useMemo, useState } from "react";
import styles from "./RewardHacking.module.css";
import {
  CHECKPOINT_LAYOUT,
  CHECKPOINT_TRAINING,
  createEnvironment,
  evaluateCheckpointPolicy,
  positionKey,
  trainCheckpointSnapshots,
  type CheckpointEvaluation,
  type Position,
} from "./checkpointMdp";

const SNAPSHOT_EPISODES = Array.from({ length: 40 }, (_, index) => (index + 1) * 50);
const SPEEDS = {
  slow: 240,
  normal: 130,
  fast: 70,
} as const;

type PlaybackMode = "idle" | "training" | "paused" | "complete" | "replaying";
type Speed = keyof typeof SPEEDS;

interface LearningSample {
  episode: number;
  evaluation: CheckpointEvaluation;
}

function compactReward(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

function RewardHistory({
  samples,
  visibleCount,
}: {
  samples: LearningSample[];
  visibleCount: number;
}) {
  const width = 260;
  const height = 118;
  const inset = { top: 12, right: 10, bottom: 24, left: 34 };
  const rewards = samples.map((sample) => sample.evaluation.reward);
  const minimum = Math.min(0, ...rewards);
  const maximum = Math.max(1, ...rewards);
  const range = Math.max(1, maximum - minimum);
  const x = (episode: number) =>
    inset.left +
    (episode / CHECKPOINT_TRAINING.episodes) *
      (width - inset.left - inset.right);
  const y = (reward: number) =>
    inset.top +
    ((maximum - reward) / range) * (height - inset.top - inset.bottom);
  const visible = samples.slice(0, visibleCount);
  const points = visible
    .map((sample) => `${x(sample.episode)},${y(sample.evaluation.reward)}`)
    .join(" ");
  const latest = visible.at(-1);

  return (
    <figure className={styles.learningChart}>
      <div className={styles.learningChartHeading}>
        <strong>Reward over training</strong>
        <span>{latest ? compactReward(latest.evaluation.reward) : "—"}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          latest
            ? `Greedy policy reward is ${compactReward(latest.evaluation.reward)} after ${latest.episode.toLocaleString("en-US")} episodes.`
            : "No reward history yet."
        }
      >
        <line
          className={styles.chartAxis}
          x1={inset.left}
          x2={width - inset.right}
          y1={height - inset.bottom}
          y2={height - inset.bottom}
        />
        <line
          className={styles.chartGuide}
          x1={inset.left}
          x2={width - inset.right}
          y1={y(0)}
          y2={y(0)}
        />
        {points ? (
          <polyline className={styles.chartLine} points={points} />
        ) : null}
        {latest ? (
          <circle
            className={styles.chartPoint}
            cx={x(latest.episode)}
            cy={y(latest.evaluation.reward)}
            r="3.5"
          />
        ) : null}
        <text className={styles.chartLabel} x={inset.left} y={height - 6}>
          0
        </text>
        <text
          className={styles.chartLabel}
          x={width - inset.right}
          y={height - 6}
          textAnchor="end"
        >
          2,000 episodes
        </text>
        <text
          className={styles.chartLabel}
          x={inset.left - 6}
          y={y(maximum) + 3}
          textAnchor="end"
        >
          {Math.ceil(maximum)}
        </text>
        <text
          className={styles.chartLabel}
          x={inset.left - 6}
          y={y(minimum) + 3}
          textAnchor="end"
        >
          {Math.floor(minimum)}
        </text>
      </svg>
      <figcaption>Greedy policy reward, sampled every 50 episodes.</figcaption>
    </figure>
  );
}

export function CheckpointProxyPlayground() {
  const environment = useMemo(
    () => createEnvironment({ ...CHECKPOINT_LAYOUT }),
    [],
  );
  const samples = useMemo<LearningSample[]>(() => {
    const { snapshots } = trainCheckpointSnapshots(
      environment,
      "proxy",
      SNAPSHOT_EPISODES,
    );
    return SNAPSHOT_EPISODES.map((episode) => ({
      episode,
      evaluation: evaluateCheckpointPolicy(
        environment,
        snapshots.get(episode) ?? new Float64Array(),
        "proxy",
      ),
    }));
  }, [environment]);
  const [sampleCount, setSampleCount] = useState(0);
  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [playbackStep, setPlaybackStep] = useState(0);

  const currentSample = sampleCount > 0 ? samples[sampleCount - 1] : null;
  const evaluation = currentSample?.evaluation ?? null;
  const trajectory = evaluation?.trajectory ?? [environment.start];
  const trainingStep =
    mode === "training" && trajectory.length > 1
      ? sampleCount % Math.min(trajectory.length, 18)
      : 0;
  const visibleStep =
    mode === "replaying"
      ? Math.min(playbackStep, trajectory.length - 1)
      : trainingStep;
  const currentPosition = trajectory[visibleStep] ?? environment.start;
  const visited = new Set(
    trajectory
      .slice(0, visibleStep + 1)
      .map((position) => positionKey(position)),
  );
  const episode = currentSample?.episode ?? 0;
  const epsilon =
    episode === 0
      ? CHECKPOINT_TRAINING.epsilonStart
      : CHECKPOINT_TRAINING.epsilonStart *
          (1 - episode / (CHECKPOINT_TRAINING.episodes - 1)) +
        CHECKPOINT_TRAINING.epsilonEnd *
          (episode / (CHECKPOINT_TRAINING.episodes - 1));

  useEffect(() => {
    if (mode !== "training" || sampleCount >= samples.length) return undefined;
    const timer = window.setTimeout(
      () => setSampleCount((count) => Math.min(samples.length, count + 1)),
      SPEEDS[speed],
    );
    return () => window.clearTimeout(timer);
  }, [mode, sampleCount, samples.length, speed]);

  useEffect(() => {
    if (mode === "training" && sampleCount >= samples.length) {
      setMode("complete");
    }
  }, [mode, sampleCount, samples.length]);

  useEffect(() => {
    if (mode !== "replaying") return undefined;
    if (playbackStep >= trajectory.length - 1) {
      setMode("complete");
      return undefined;
    }
    const timer = window.setTimeout(
      () => setPlaybackStep((step) => step + 1),
      72,
    );
    return () => window.clearTimeout(timer);
  }, [mode, playbackStep, trajectory.length]);

  function toggleTraining() {
    if (mode === "training") {
      setMode("paused");
      return;
    }
    if (mode === "complete" || sampleCount >= samples.length) {
      setSampleCount(0);
      setPlaybackStep(0);
    }
    setMode("training");
  }

  function replayPolicy() {
    if (!evaluation) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setPlaybackStep(reducedMotion ? trajectory.length - 1 : 0);
    setMode(reducedMotion ? "complete" : "replaying");
  }

  function reset() {
    setMode("idle");
    setSampleCount(0);
    setPlaybackStep(0);
  }

  const status =
    mode === "idle"
      ? "Ready to train"
      : mode === "training"
        ? "Learning from checkpoint rewards…"
        : mode === "paused"
          ? "Training paused"
          : mode === "replaying"
            ? `Replaying step ${playbackStep} of ${trajectory.length - 1}`
            : "Optimal proxy policy found";

  return (
    <section
      className={`${styles.lab} ${styles.learningLab}`}
      aria-label="Checkpoint proxy-reward learning playground"
    >
      <header className={styles.learningHeader}>
        <div>
          <p className={styles.kicker}>GridWorld · MDP 1</p>
          <h3>What route will this reward teach?</h3>
        </div>
        <p className={styles.learningReward}>
          Reward seen by the agent
          <strong>+1 when entering any checkpoint</strong>
        </p>
      </header>

      <div className={styles.learningStage}>
        <div className={styles.learningBoardColumn}>
          <div
            className={styles.learningBoard}
            role="grid"
            aria-label="Seven by seven checkpoint track during proxy-reward learning"
          >
            {Array.from({ length: environment.height }, (_, y) =>
              Array.from({ length: environment.width }, (_, x) => {
                const position: Position = { x, y };
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
                return (
                  <div
                    className={[
                      styles.optimalCell,
                      isWall ? styles.optimalWall : "",
                      isStart ? styles.optimalStart : "",
                      checkpointIndex >= 0 ? styles.optimalCheckpoint : "",
                      isTrail ? styles.learningTrail : "",
                      checkpointIndex === 0 &&
                      mode === "complete" &&
                      evaluation?.repeatedEntries
                        ? styles.learningRewarded
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="gridcell"
                    aria-label={
                      isWall
                        ? `Wall at column ${x + 1}, row ${y + 1}`
                        : label
                          ? `${label} at column ${x + 1}, row ${y + 1}`
                          : `Open cell at column ${x + 1}, row ${y + 1}`
                    }
                    key={key}
                  >
                    {label ? (
                      <span className={styles.optimalCellLabel}>{label}</span>
                    ) : null}
                    {isCurrent ? (
                      <span className={styles.learningAgent} aria-hidden="true">
                        A
                      </span>
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>
          <p className={styles.learningBoardCaption}>
            Intended: S → C1 → C2 → C3 → C4 → S
          </p>
        </div>

        <aside className={styles.learningPanel} aria-label="Learning controls and progress">
          <div className={styles.learningStatus} aria-live="polite">
            <span>{status}</span>
            <strong>{episode.toLocaleString("en-US")} / 2,000 episodes</strong>
          </div>

          <div className={styles.learningMetrics}>
            <div>
              <span>Exploration ε</span>
              <strong>{Math.max(CHECKPOINT_TRAINING.epsilonEnd, epsilon).toFixed(2)}</strong>
            </div>
            <div>
              <span>Greedy reward</span>
              <strong>{evaluation ? compactReward(evaluation.reward) : "—"}</strong>
            </div>
            <div>
              <span>Lap completed?</span>
              <strong>{evaluation ? (evaluation.completedLap ? "Yes" : "No") : "—"}</strong>
            </div>
            <div>
              <span>Repeated entries</span>
              <strong>{evaluation?.repeatedEntries ?? "—"}</strong>
            </div>
          </div>

          <RewardHistory samples={samples} visibleCount={sampleCount} />

          <div className={styles.learningControls}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={toggleTraining}
              disabled={mode === "replaying"}
            >
              {mode === "training"
                ? "Pause training"
                : mode === "paused"
                  ? "Continue training"
                  : mode === "complete"
                    ? "Train again"
                    : "Start training"}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={replayPolicy}
              disabled={mode !== "complete" || !evaluation}
            >
              Replay policy
            </button>
            <label className={styles.learningSpeed}>
              Display speed
              <select
                value={speed}
                onChange={(event) => setSpeed(event.target.value as Speed)}
                disabled={mode === "replaying"}
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </label>
            <button
              type="button"
              className={styles.learningReset}
              onClick={reset}
              disabled={mode === "idle"}
            >
              Reset
            </button>
          </div>
        </aside>
      </div>

      <p className={styles.learningTakeaway}>
        {mode === "complete" && evaluation ? (
          <>
            Reward rose to <strong>{compactReward(evaluation.reward)}</strong>,
            but the policy completed <strong>0 laps</strong>. It learned to
            leave and re-enter C1 because every return pays again.
          </>
        ) : (
          "Watch whether reward and lap completion improve together as training proceeds."
        )}
      </p>
    </section>
  );
}
