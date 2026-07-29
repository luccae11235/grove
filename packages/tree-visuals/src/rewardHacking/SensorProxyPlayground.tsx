import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./RewardHacking.module.css";
import {
  SENSOR_ACTIONS,
  SENSOR_LAYOUT,
  SENSOR_TRAINING,
  createSensorTrainer,
  evaluateSensorPolicy,
  sensorInitialState,
  sensorTransition,
  type SensorEvaluation,
  type SensorState,
  type SensorTrainingStep,
} from "./sensorMdp";
import type { RewardMode } from "./engine";

const MAX_TRAINING_EPISODES = 7_000;
const TRAINING_TICK_MS = 55;
const MIN_TRAINING_EPISODES = 400;
const REQUIRED_STABLE_CHECKS = 2;
const HISTORY_INTERVAL = 50;
const REPLAY_STEP_MS = 220;

type PlaybackMode =
  | "idle"
  | "training"
  | "paused"
  | "complete"
  | "replaying"
  | "limit";

interface LearningSample {
  episode: number;
  evaluation: SensorEvaluation;
}

interface SensorFrame {
  previousState: SensorState;
  state: SensorState;
  action: number;
  cumulativeReward: number;
  realViolations: number;
  detectedViolations: number;
  event: NonNullable<SensorEvaluation["trace"][number]["event"]>;
}

const positionKey = (position: { x: number; y: number }) =>
  `${position.x},${position.y}`;
const walkable = new Set(SENSOR_LAYOUT.walkable.map(positionKey));

function compactReward(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function traceFrames(evaluation: SensorEvaluation): SensorFrame[] {
  let previousState = sensorInitialState();
  let cumulativeReward = 0;
  let realViolations = 0;
  let detectedViolations = 0;
  return evaluation.trace.slice(1).map((entry) => {
    cumulativeReward += entry.reward;
    realViolations += Number(entry.event?.fragileCrossed);
    detectedViolations += Number(entry.event?.detectedViolation);
    const frame = {
      previousState,
      state: entry.state,
      action: entry.action!,
      cumulativeReward,
      realViolations,
      detectedViolations,
      event: entry.event!,
    };
    previousState = entry.state;
    return frame;
  });
}

function policyIsOptimal(
  evaluation: SensorEvaluation,
  rewardMode: RewardMode,
) {
  return rewardMode === "proxy"
    ? evaluation.delivered &&
        evaluation.steps === 7 &&
        evaluation.cameraDisabled &&
        evaluation.realViolations === 1 &&
        evaluation.detectedViolations === 0
    : evaluation.delivered &&
        evaluation.steps === 10 &&
        !evaluation.cameraDisabled &&
        evaluation.realViolations === 0 &&
        evaluation.detectedViolations === 0;
}

function RewardHistory({
  samples,
  rewardMode,
}: {
  samples: LearningSample[];
  rewardMode: RewardMode;
}) {
  const width = 260;
  const height = 112;
  const inset = { top: 12, right: 10, bottom: 24, left: 34 };
  const rewards = samples.map((sample) => sample.evaluation.reward);
  const minimum = Math.min(0, ...rewards);
  const maximum = Math.max(1, ...rewards);
  const range = Math.max(1, maximum - minimum);
  const latest = samples.at(-1);
  const domainMaximum = Math.max(
    100,
    Math.ceil((latest?.episode ?? 0) / 100) * 100,
  );
  const x = (episode: number) =>
    inset.left +
    (episode / domainMaximum) * (width - inset.left - inset.right);
  const y = (reward: number) =>
    inset.top +
    ((maximum - reward) / range) * (height - inset.top - inset.bottom);
  const points = samples
    .map((sample) => `${x(sample.episode)},${y(sample.evaluation.reward)}`)
    .join(" ");

  return (
    <figure className={styles.learningChart}>
      <div className={styles.learningChartHeading}>
        <strong>Reward over training</strong>
        <span
          className={
            rewardMode === "aligned"
              ? styles.learningChartValueAligned
              : undefined
          }
        >
          {latest ? compactReward(latest.evaluation.reward) : "—"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          latest
            ? `Greedy-policy reward reached ${compactReward(latest.evaluation.reward)} after ${latest.episode} episodes.`
            : "Reward history is empty before training begins."
        }
      >
        <line
          className={styles.chartAxis}
          x1={inset.left}
          x2={inset.left}
          y1={inset.top}
          y2={height - inset.bottom}
        />
        <line
          className={styles.chartAxis}
          x1={inset.left}
          x2={width - inset.right}
          y1={height - inset.bottom}
          y2={height - inset.bottom}
        />
        {points ? (
          <polyline
            className={`${styles.chartLine} ${
              rewardMode === "aligned" ? styles.chartLineAligned : ""
            }`}
            points={points}
          />
        ) : null}
        <text className={styles.chartLabel} x={inset.left} y={height - 7}>
          0
        </text>
        <text
          className={styles.chartLabel}
          x={width - inset.right}
          y={height - 7}
          textAnchor="end"
        >
          {domainMaximum} episodes
        </text>
      </svg>
      <figcaption>Evaluation of the current greedy policy.</figcaption>
    </figure>
  );
}

function SensorLearningPlayground({
  rewardMode,
}: {
  rewardMode: RewardMode;
}) {
  const aligned = rewardMode === "aligned";
  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [episodes, setEpisodes] = useState(0);
  const [evaluation, setEvaluation] = useState<SensorEvaluation | null>(null);
  const [trainingStep, setTrainingStep] =
    useState<SensorTrainingStep | null>(null);
  const [trainingTrail, setTrainingTrail] = useState<SensorState["position"][]>(
    [],
  );
  const [samples, setSamples] = useState<LearningSample[]>([]);
  const [speed, setSpeed] = useState(75);
  const [playbackStep, setPlaybackStep] = useState(0);
  const trainerRef = useRef<ReturnType<typeof createSensorTrainer> | null>(null);
  const stableChecksRef = useRef(0);
  const previousSignatureRef = useRef("");
  const episodeBudgetRef = useRef(0);
  const previousTickRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const policyFrames = useMemo(
    () => (evaluation ? traceFrames(evaluation) : []),
    [evaluation],
  );

  function resetExperience(nextMode: PlaybackMode = "idle") {
    trainerRef.current = createSensorTrainer(rewardMode, {
      episodes: MAX_TRAINING_EPISODES,
      epsilonDecayEpisodes: SENSOR_TRAINING.episodes,
    });
    stableChecksRef.current = 0;
    previousSignatureRef.current = "";
    episodeBudgetRef.current = 0;
    previousTickRef.current = 0;
    setEpisodes(0);
    setEvaluation(null);
    setTrainingStep(null);
    setTrainingTrail([]);
    setSamples([]);
    setPlaybackStep(0);
    setMode(nextMode);
  }

  useEffect(() => {
    if (mode !== "training") return undefined;
    if (!trainerRef.current) {
      trainerRef.current = createSensorTrainer(rewardMode, {
        episodes: MAX_TRAINING_EPISODES,
        epsilonDecayEpisodes: SENSOR_TRAINING.episodes,
      });
    }
    previousTickRef.current = performance.now();

    const interval = window.setInterval(() => {
      const trainer = trainerRef.current;
      if (!trainer) return;
      const now = performance.now();
      episodeBudgetRef.current +=
        (speedRef.current * (now - previousTickRef.current)) / 1_000;
      previousTickRef.current = now;
      const episodesThisTick = Math.floor(episodeBudgetRef.current);
      episodeBudgetRef.current -= episodesThisTick;
      if (episodesThisTick === 0) return;

      const frames: SensorTrainingStep[] = [];
      const batchEnd = Math.min(
        MAX_TRAINING_EPISODES,
        trainer.episodesCompleted + episodesThisTick,
      );
      while (trainer.episodesCompleted < batchEnd) {
        trainer.trainEpisode((step) => frames.push(step));
      }

      const nextEvaluation = evaluateSensorPolicy(
        trainer.qValues,
        rewardMode,
      );
      const nextEpisodes = trainer.episodesCompleted;
      const visibleFrame = frames.at(-1) ?? null;
      setTrainingStep(visibleFrame);
      setTrainingTrail(
        visibleFrame
          ? frames
              .filter((frame) => frame.episode === visibleFrame.episode)
              .flatMap((frame, index) =>
                index === 0
                  ? [frame.state.position, frame.nextState.position]
                  : [frame.nextState.position],
              )
          : [],
      );
      setEpisodes(nextEpisodes);
      setEvaluation(nextEvaluation);
      setSamples((current) => {
        const lastEpisode = current.at(-1)?.episode ?? 0;
        if (
          nextEpisodes - lastEpisode < HISTORY_INTERVAL &&
          !policyIsOptimal(nextEvaluation, rewardMode) &&
          !trainer.finished
        ) {
          return current;
        }
        return [...current, { episode: nextEpisodes, evaluation: nextEvaluation }];
      });

      if (
        nextEpisodes >= MIN_TRAINING_EPISODES &&
        policyIsOptimal(nextEvaluation, rewardMode)
      ) {
        const signature = nextEvaluation.trace
          .slice(1)
          .map((entry) => entry.action)
          .join(",");
        stableChecksRef.current =
          signature === previousSignatureRef.current
            ? stableChecksRef.current + 1
            : 1;
        previousSignatureRef.current = signature;
      } else {
        stableChecksRef.current = 0;
        previousSignatureRef.current = "";
      }

      if (stableChecksRef.current >= REQUIRED_STABLE_CHECKS) {
        setTrainingStep(null);
        setTrainingTrail([]);
        setMode("complete");
      } else if (trainer.finished) {
        setTrainingStep(null);
        setTrainingTrail([]);
        setMode("limit");
      }
    }, TRAINING_TICK_MS);

    return () => window.clearInterval(interval);
  }, [mode, rewardMode]);

  useEffect(() => {
    if (mode !== "replaying") return undefined;
    if (playbackStep >= policyFrames.length) {
      setMode("complete");
      return undefined;
    }
    const frame = policyFrames[playbackStep];
    const timer = window.setTimeout(
      () => setPlaybackStep((step) => step + 1),
      frame?.event.cameraToggled ? 650 : REPLAY_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [mode, playbackStep, policyFrames]);

  function toggleTraining() {
    if (mode === "training") {
      setMode("paused");
      return;
    }
    if (mode === "complete" || mode === "limit") {
      resetExperience("training");
      return;
    }
    setMode("training");
  }

  function replayPolicy() {
    if (!evaluation) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setPlaybackStep(reducedMotion ? policyFrames.length : 0);
    setMode(reducedMotion ? "complete" : "replaying");
  }

  const replayFrame =
    mode === "replaying" && playbackStep > 0
      ? policyFrames[Math.min(playbackStep - 1, policyFrames.length - 1)]
      : null;
  const currentState =
    mode === "training" && trainingStep
      ? trainingStep.nextState
      : replayFrame?.state ??
        (mode === "complete" && policyFrames.length > 0
          ? policyFrames.at(-1)!.state
          : sensorInitialState());
  const trailPositions =
    mode === "training"
      ? trainingTrail
      : mode === "replaying"
        ? policyFrames
            .slice(0, playbackStep)
            .flatMap((frame, index) =>
              index === 0
                ? [frame.previousState.position, frame.state.position]
                : [frame.state.position],
            )
        : policyFrames.flatMap((frame, index) =>
            index === 0
              ? [frame.previousState.position, frame.state.position]
              : [frame.state.position],
          );
  const visited = new Set(trailPositions.map(positionKey));
  const activeFrame =
    mode === "training" && trainingStep
      ? sensorTransition(
          trainingStep.state,
          trainingStep.action,
          rewardMode,
        ).event
      : replayFrame?.event;
  const currentEpsilon =
    trainingStep?.epsilon ??
    (episodes === 0
      ? SENSOR_TRAINING.epsilonStart
      : SENSOR_TRAINING.epsilonStart *
          (1 - Math.min(1, episodes / (SENSOR_TRAINING.episodes - 1))) +
        SENSOR_TRAINING.epsilonEnd *
          Math.min(1, episodes / (SENSOR_TRAINING.episodes - 1)));

  const status =
    mode === "idle"
      ? "Ready to learn"
      : mode === "training"
        ? "Exploring and updating Q-values…"
        : mode === "paused"
          ? `Paused after ${episodes.toLocaleString("en-US")} episodes`
          : mode === "replaying"
            ? `Running learned policy · step ${playbackStep} of ${policyFrames.length}`
            : mode === "limit"
              ? "Training limit reached"
              : aligned
                ? "Optimal safe route found"
                : "Optimal measured-reward policy found";

  const eventText =
    mode === "training" && trainingStep
      ? `Episode ${trainingStep.episode.toLocaleString("en-US")}, step ${trainingStep.step}: ${
          trainingStep.exploring ? "explored" : "followed current values"
        } ${SENSOR_ACTIONS[trainingStep.action].name === "toggle" ? "camera toggle" : SENSOR_ACTIONS[trainingStep.action].label}.`
      : mode === "replaying" && replayFrame
        ? replayFrame.event.cameraToggled
          ? `Step ${playbackStep} of ${policyFrames.length}: turned the camera ${replayFrame.state.cameraActive ? "on" : "off"}.`
          : replayFrame.event.fragileCrossed
            ? `Step ${playbackStep} of ${policyFrames.length}: crossed the fragile floor${replayFrame.event.detectedViolation ? "; the camera detected it" : " unseen"}.`
            : replayFrame.event.delivered
              ? `Step ${playbackStep} of ${policyFrames.length}: package delivered.`
              : `Step ${playbackStep} of ${policyFrames.length}: moved ${SENSOR_ACTIONS[replayFrame.action].label}.`
        : mode === "complete" && evaluation
          ? aligned
            ? "Camera on · 0 physical violations · package delivered safely."
            : "Camera off · 1 physical violation · 0 detected violations."
          : mode === "limit"
            ? `Stopped after ${MAX_TRAINING_EPISODES.toLocaleString("en-US")} episodes without a stable optimum.`
            : aligned
              ? "Start learning, then replay the greedy route around the fragile floor."
              : "Start learning, then replay the greedy route from the camera switch across the fragile floor.";

  return (
    <section
      className={`${styles.lab} ${styles.learningLab}`}
      aria-label={`${aligned ? "Physical-violation" : "Camera proxy-reward"} learning playground`}
      data-training-model="live-q-learning"
    >
      <header className={styles.learningHeader}>
        <div>
          <p className={styles.kicker}>GridWorld · MDP 2</p>
          <h3>What route will this reward teach?</h3>
        </div>
        <p className={styles.learningReward}>
          Reward seen by the agent
          <strong>
            {aligned
              ? "+10 delivery · −12 physical damage"
              : "+10 delivery · −12 detected damage"}
          </strong>
        </p>
      </header>

      <div className={styles.learningStage}>
        <div className={styles.learningBoardColumn}>
          <div className={styles.sensorStatusBar}>
            <span>Package-delivery room</span>
            <strong data-camera-active={currentState.cameraActive}>
              <span aria-hidden="true">
                {currentState.cameraActive ? "●" : "○"}
              </span>{" "}
              Camera {currentState.cameraActive ? "on" : "off"}
            </strong>
          </div>
          <div
            className={styles.sensorLearningBoard}
            role="grid"
            aria-label="Seven by four package-delivery room with a safe upper route, fragile short route, camera switch, start, and destination"
          >
            {Array.from({ length: SENSOR_LAYOUT.height }, (_, y) =>
              Array.from({ length: SENSOR_LAYOUT.width }, (_, x) => {
                const position = { x, y };
                const key = positionKey(position);
                const isWalkable = walkable.has(key);
                const isSwitch = key === positionKey(SENSOR_LAYOUT.switch);
                const isStart = key === positionKey(SENSOR_LAYOUT.start);
                const isDestination =
                  key === positionKey(SENSOR_LAYOUT.destination);
                const isFragile = key === positionKey(SENSOR_LAYOUT.fragile);
                const isSafeLabel = y === 0 && x === 3;
                const isCurrent =
                  key === positionKey(currentState.position);
                const isTrail = visited.has(key) && !isCurrent;
                const isEvent =
                  (isSwitch && activeFrame?.cameraToggled) ||
                  (isFragile && activeFrame?.fragileCrossed);
                const label = isStart
                  ? "S"
                  : isDestination
                    ? "D"
                    : isFragile
                      ? "FRAGILE"
                      : isSwitch
                        ? "CAM"
                        : isSafeLabel
                          ? "SAFE"
                          : "";
                return (
                  <div
                    className={[
                      styles.sensorCell,
                      !isWalkable && !isSwitch ? styles.sensorVoid : "",
                      isStart ? styles.sensorStart : "",
                      isDestination ? styles.sensorDestination : "",
                      isFragile ? styles.sensorFragile : "",
                      isSwitch ? styles.sensorSwitch : "",
                      isSafeLabel ? styles.sensorSafe : "",
                      isTrail ? styles.sensorTrail : "",
                      isEvent ? styles.sensorEvent : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="gridcell"
                    aria-label={
                      !isWalkable && !isSwitch
                        ? `Blocked space at column ${x + 1}, row ${y + 1}`
                        : `${label || "Open floor"} at column ${x + 1}, row ${y + 1}`
                    }
                    key={key}
                  >
                    {label ? (
                      <span className={styles.sensorCellLabel}>{label}</span>
                    ) : null}
                    {isCurrent ? (
                      <span
                        className={`${styles.learningAgent} ${
                          mode === "training" && trainingStep?.exploring
                            ? styles.learningAgentExploring
                            : ""
                        }`}
                        aria-hidden="true"
                      >
                        R
                      </span>
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>
          <p className={styles.learningBoardCaption}>
            Safe route: 10 steps · fragile shortcut: 6 movement steps
            <span>The camera switch is available from the cell above it.</span>
          </p>
        </div>

        <aside
          className={styles.learningPanel}
          aria-label="Learning controls and progress"
        >
          <div className={styles.learningStatus} aria-live="polite">
            <span>{status}</span>
            <strong>{episodes.toLocaleString("en-US")} episodes</strong>
          </div>

          <div className={styles.learningMetrics}>
            <div>
              <span>Exploration ε</span>
              <strong>{currentEpsilon.toFixed(2)}</strong>
            </div>
            <div>
              <span>Greedy reward</span>
              <strong>
                {evaluation ? compactReward(evaluation.reward) : "—"}
              </strong>
            </div>
            <div>
              <span>Physical violations</span>
              <strong>{evaluation?.realViolations ?? "—"}</strong>
            </div>
            <div>
              <span>Detected violations</span>
              <strong>{evaluation?.detectedViolations ?? "—"}</strong>
            </div>
          </div>

          <p className={styles.learningEvent} aria-live="polite">
            {eventText}
          </p>

          <RewardHistory samples={samples} rewardMode={rewardMode} />

          <div className={styles.learningControls}>
            <label className={styles.learningSpeedSlider}>
              <span>
                Training speed
                <output>{speed} episodes/s</output>
              </span>
              <input
                type="range"
                min="5"
                max="90"
                step="5"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                disabled={mode === "replaying"}
              />
            </label>
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
                  : mode === "complete" || mode === "limit"
                    ? "Train again"
                    : "Train until optimal"}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={replayPolicy}
              disabled={
                !evaluation ||
                mode === "training" ||
                mode === "replaying" ||
                mode === "idle"
              }
            >
              Run learned agent
            </button>
            <button
              type="button"
              className={styles.learningReset}
              onClick={() => resetExperience()}
              disabled={mode === "replaying"}
            >
              Reset learning
            </button>
          </div>
        </aside>
      </div>

      <p className={styles.learningTakeaway}>
        {mode === "complete" && evaluation ? (
          aligned ? (
            <>
              The agent kept the camera on and followed the longer safe route.
              It delivered in <strong>{evaluation.steps} steps</strong> with{" "}
              <strong>0 physical violations</strong>. Disabling the camera
              offered no reward advantage.
            </>
          ) : (
            <>
              The agent learned to switch the camera off, cross the unchanged
              fragile floor, and deliver in{" "}
              <strong>{evaluation.steps} steps</strong>. It caused{" "}
              <strong>1 physical violation</strong>, but the reward recorded{" "}
              <strong>0 detected violations</strong>.
            </>
          )
        ) : (
          aligned
            ? "Watch whether the robot still benefits from changing the camera when physical damage is penalized directly."
            : "Watch the camera status change while the fragile floor—and the physical violation—stay the same."
        )}
      </p>
    </section>
  );
}

export function SensorProxyPlayground() {
  return <SensorLearningPlayground rewardMode="proxy" />;
}

export function SensorAlignedPlayground() {
  return <SensorLearningPlayground rewardMode="aligned" />;
}
