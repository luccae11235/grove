import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./RewardHacking.module.css";
import {
  CHECKPOINT_ACTIONS,
  CHECKPOINT_LAYOUT,
  CHECKPOINT_TRAINING,
  createCheckpointTrainer,
  createEnvironment,
  evaluateCheckpointPolicy,
  initialState,
  isPlaceable,
  optimalCheckpointTrajectory,
  positionKey,
  stateIndex,
  transition,
  type CheckpointEnvironment,
  type CheckpointEvaluation,
  type CheckpointEvent,
  type CheckpointState,
  type CheckpointTrainingStep,
  type Position,
} from "./checkpointMdp";
import type { RewardMode, Trainer } from "./engine";
import { isPt, type RhLocale } from "./shared";

const MAX_TRAINING_EPISODES = 5_000;
const TRAINING_TICK_MS = 80;
const REQUIRED_STABLE_CHECKS = 2;
const HISTORY_INTERVAL = 25;

type PlaybackMode =
  | "idle"
  | "training"
  | "paused"
  | "complete"
  | "replaying"
  | "limit";

interface LearningSample {
  episode: number;
  evaluation: CheckpointEvaluation;
}

interface PolicyFrame {
  previousState: CheckpointState;
  state: CheckpointState;
  action: number;
  cumulativeReward: number;
  completedLap: boolean;
  event: CheckpointEvent;
}

function compactReward(value: number, locale: RhLocale = "en") {
  return value.toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function tracePolicy(
  environment: CheckpointEnvironment,
  evaluation: CheckpointEvaluation,
  rewardMode: RewardMode,
): PolicyFrame[] {
  const frames: PolicyFrame[] = [];
  let state = initialState(environment);
  let cumulativeReward = 0;
  let completedLap = false;

  for (const action of evaluation.actions) {
    const result = transition(environment, state, action, rewardMode);
    cumulativeReward += result.reward;
    completedLap ||= result.done;
    frames.push({
      previousState: state,
      state: result.state,
      action,
      cumulativeReward,
      completedLap,
      event: result.event,
    });
    state = result.state;
    if (result.done) break;
  }
  return frames;
}

function compactDeterministicRoute(frames: PolicyFrame[]) {
  const seenStates = new Set<string>();
  for (let index = 0; index < frames.length; index += 1) {
    const state = frames[index].previousState;
    const key = `${positionKey(state.position)}|${state.nextCheckpoint}`;
    if (seenStates.has(key)) return frames.slice(0, index);
    seenStates.add(key);
  }
  return frames;
}

function actionIsAvailable(
  environment: CheckpointEnvironment,
  position: Position,
  actionIndex: number,
) {
  const action = CHECKPOINT_ACTIONS[actionIndex];
  const candidate = {
    x: position.x + action.dx,
    y: position.y + action.dy,
  };
  return (
    candidate.x >= 0 &&
    candidate.x < environment.width &&
    candidate.y >= 0 &&
    candidate.y < environment.height &&
    !environment.walls.has(positionKey(candidate))
  );
}

function routeValueMap(
  environment: CheckpointEnvironment,
  frames: PolicyFrame[],
  qValues: Float64Array,
) {
  const route = new Map<string, number>();
  for (const frame of compactDeterministicRoute(frames)) {
    const offset =
      stateIndex(environment, frame.previousState) * CHECKPOINT_ACTIONS.length;
    const key = `${positionKey(frame.previousState.position)}|${frame.action}`;
    const value = qValues[offset + frame.action];
    route.set(key, Math.max(route.get(key) ?? -Infinity, value));
  }
  const positiveValues = [...route.values()].filter((value) => value > 0);
  return {
    route,
    floor: positiveValues.length ? Math.min(...positiveValues) : 0,
    ceiling: positiveValues.length ? Math.max(...positiveValues) : 0,
  };
}

function RewardHistory({
  samples,
  rewardMode,
  locale,
}: {
  samples: LearningSample[];
  rewardMode: RewardMode;
  locale: RhLocale;
}) {
  const pt = isPt(locale);
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
        <strong>{pt ? "Recompensa durante o treino" : "Reward over training"}</strong>
        <span
          className={
            rewardMode === "aligned" ? styles.learningChartValueAligned : ""
          }
        >
          {latest ? compactReward(latest.evaluation.reward, locale) : "—"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          latest
            ? pt
              ? `A recompensa da política gulosa é ${compactReward(latest.evaluation.reward, locale)} após ${latest.episode.toLocaleString("pt-BR")} episódios.`
              : `Greedy policy reward is ${compactReward(latest.evaluation.reward)} after ${latest.episode.toLocaleString("en-US")} episodes.`
            : pt
              ? "Ainda não há histórico de recompensa."
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
          <polyline
            className={`${styles.chartLine} ${
              rewardMode === "aligned" ? styles.chartLineAligned : ""
            }`}
            points={points}
          />
        ) : null}
        {latest ? (
          <circle
            className={`${styles.chartPoint} ${
              rewardMode === "aligned" ? styles.chartPointAligned : ""
            }`}
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
          {domainMaximum.toLocaleString(pt ? "pt-BR" : "en-US")} {pt ? "episódios" : "episodes"}
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
      <figcaption>
        {pt
          ? "Recompensa atual da política gulosa, amostrada a cada 25 episódios."
          : "Current greedy-policy reward, sampled every 25 episodes."}
      </figcaption>
    </figure>
  );
}

function policyIsOptimal(
  evaluation: CheckpointEvaluation,
  rewardMode: RewardMode,
  optimalSteps: number,
) {
  if (rewardMode === "aligned") {
    return evaluation.completedLap && evaluation.steps === optimalSteps;
  }
  return (
    !evaluation.completedLap &&
    evaluation.repeatedEntries >= 40 &&
    evaluation.reward >= 40
  );
}

function CheckpointLearningPlayground({
  rewardMode,
  locale,
}: {
  rewardMode: RewardMode;
  locale: RhLocale;
}) {
  const aligned = rewardMode === "aligned";
  const pt = isPt(locale);
  const numberLocale = pt ? "pt-BR" : "en-US";
  const [checkpoints, setCheckpoints] = useState<Position[]>(() =>
    CHECKPOINT_LAYOUT.checkpoints.map((checkpoint) => ({ ...checkpoint })),
  );
  const environment = useMemo(
    () => createEnvironment({ ...CHECKPOINT_LAYOUT, checkpoints }),
    [checkpoints],
  );
  const optimalSteps = useMemo(
    () => optimalCheckpointTrajectory(environment).length - 1,
    [environment],
  );
  const trainerRef = useRef<Trainer<CheckpointState> | null>(null);
  if (!trainerRef.current) {
    trainerRef.current = createCheckpointTrainer(environment, rewardMode, {
      episodes: MAX_TRAINING_EPISODES,
      epsilonDecayEpisodes: CHECKPOINT_TRAINING.episodes,
    });
  }

  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [episodes, setEpisodes] = useState(0);
  const [evaluation, setEvaluation] =
    useState<CheckpointEvaluation | null>(null);
  const [trainingStep, setTrainingStep] =
    useState<CheckpointTrainingStep | null>(null);
  const [trainingTrail, setTrainingTrail] = useState<Position[]>([]);
  const [samples, setSamples] = useState<LearningSample[]>([]);
  const [speed, setSpeed] = useState(75);
  const [valuesVisible, setValuesVisible] = useState(false);
  const [playbackStep, setPlaybackStep] = useState(0);
  const [draggingCheckpoint, setDraggingCheckpoint] = useState<number | null>(
    null,
  );
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number | null>(
    null,
  );
  const [dropTarget, setDropTarget] = useState("");
  const draggingCheckpointRef = useRef<number | null>(null);
  const movedByDragRef = useRef(false);
  const stableChecksRef = useRef(0);
  const previousSignatureRef = useRef("");
  const episodeBudgetRef = useRef(0);
  const previousTickRef = useRef(0);
  const visualTickRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const policyFrames = useMemo(
    () =>
      evaluation
        ? tracePolicy(environment, evaluation, rewardMode)
        : [],
    [environment, evaluation, rewardMode],
  );
  const compactFrames = useMemo(
    () => compactDeterministicRoute(policyFrames),
    [policyFrames],
  );
  const qValueView = useMemo(
    () =>
      routeValueMap(
        environment,
        policyFrames,
        trainerRef.current?.qValues ?? new Float64Array(),
      ),
    // episodes makes the memo follow mutations in the trainer's Q-table.
    [environment, episodes, policyFrames],
  );

  function resetExperience(nextMode: PlaybackMode = "idle") {
    trainerRef.current = createCheckpointTrainer(environment, rewardMode, {
      episodes: MAX_TRAINING_EPISODES,
      epsilonDecayEpisodes: CHECKPOINT_TRAINING.episodes,
    });
    stableChecksRef.current = 0;
    previousSignatureRef.current = "";
    episodeBudgetRef.current = 0;
    previousTickRef.current = 0;
    visualTickRef.current = 0;
    setEpisodes(0);
    setEvaluation(null);
    setTrainingStep(null);
    setTrainingTrail([]);
    setSamples([]);
    setPlaybackStep(0);
    setMode(nextMode);
  }

  function clearLearningForLayoutChange() {
    trainerRef.current = null;
    stableChecksRef.current = 0;
    previousSignatureRef.current = "";
    episodeBudgetRef.current = 0;
    previousTickRef.current = 0;
    visualTickRef.current = 0;
    setEpisodes(0);
    setEvaluation(null);
    setTrainingStep(null);
    setTrainingTrail([]);
    setSamples([]);
    setPlaybackStep(0);
    setSelectedCheckpoint(null);
    setMode("idle");
  }

  function moveCheckpoint(checkpointIndex: number, position: Position) {
    if (!isPlaceable(environment, position, checkpointIndex)) return;
    if (
      positionKey(environment.checkpoints[checkpointIndex]) ===
      positionKey(position)
    ) {
      return;
    }
    setCheckpoints((current) =>
      current.map((checkpoint, index) =>
        index === checkpointIndex ? { ...position } : checkpoint,
      ),
    );
    setSelectedCheckpoint(null);
    clearLearningForLayoutChange();
  }

  function selectCheckpoint(
    event: React.MouseEvent<HTMLButtonElement>,
    checkpointIndex: number,
  ) {
    event.stopPropagation();
    if (movedByDragRef.current) {
      movedByDragRef.current = false;
      return;
    }
    if (mode === "replaying") return;
    setSelectedCheckpoint((selected) =>
      selected === checkpointIndex ? null : checkpointIndex,
    );
  }

  function placeSelectedCheckpoint(position: Position) {
    if (selectedCheckpoint === null || mode === "replaying") return;
    moveCheckpoint(selectedCheckpoint, position);
  }

  function pointerPosition(clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY);
    const cell = element?.closest<HTMLElement>("[data-grid-position]");
    const value = cell?.dataset.gridPosition;
    if (!value) return null;
    const [x, y] = value.split(",").map(Number);
    return Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null;
  }

  function beginCheckpointDrag(
    event: React.PointerEvent<HTMLButtonElement>,
    checkpointIndex: number,
  ) {
    if (mode === "replaying") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    movedByDragRef.current = false;
    draggingCheckpointRef.current = checkpointIndex;
    setDraggingCheckpoint(checkpointIndex);
    setDropTarget(positionKey(environment.checkpoints[checkpointIndex]));
  }

  function updateCheckpointDrag(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const checkpointIndex = draggingCheckpointRef.current;
    if (checkpointIndex === null) return;
    const position = pointerPosition(event.clientX, event.clientY);
    setDropTarget(
      position && isPlaceable(environment, position, checkpointIndex)
        ? positionKey(position)
        : "",
    );
  }

  function finishCheckpointDrag(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const checkpointIndex = draggingCheckpointRef.current;
    if (checkpointIndex === null) return;
    const position = pointerPosition(event.clientX, event.clientY);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingCheckpointRef.current = null;
    setDraggingCheckpoint(null);
    setDropTarget("");
    if (
      position &&
      positionKey(position) !==
        positionKey(environment.checkpoints[checkpointIndex])
    ) {
      movedByDragRef.current = true;
      moveCheckpoint(checkpointIndex, position);
    }
  }

  function cancelCheckpointDrag(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingCheckpointRef.current = null;
    setDraggingCheckpoint(null);
    setDropTarget("");
  }

  function moveCheckpointWithKeyboard(
    event: React.KeyboardEvent<HTMLButtonElement>,
    checkpointIndex: number,
  ) {
    const directions: Record<string, Position> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowRight: { x: 1, y: 0 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
    };
    const direction = directions[event.key];
    if (!direction || mode === "replaying") return;
    event.preventDefault();
    const checkpoint = environment.checkpoints[checkpointIndex];
    moveCheckpoint(checkpointIndex, {
      x: checkpoint.x + direction.x,
      y: checkpoint.y + direction.y,
    });
  }

  useEffect(() => {
    if (mode !== "training") return undefined;
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

      const frames: CheckpointTrainingStep[] = [];
      const batchEnd = Math.min(
        MAX_TRAINING_EPISODES,
        trainer.episodesCompleted + episodesThisTick,
      );
      while (trainer.episodesCompleted < batchEnd) {
        trainer.trainEpisode((step) => frames.push(step));
      }

      const nextEvaluation = evaluateCheckpointPolicy(
        environment,
        trainer.qValues,
        rewardMode,
      );
      const nextEpisodes = trainer.episodesCompleted;
      visualTickRef.current += 1;
      const visibleFrame =
        frames.length > 0
          ? frames[visualTickRef.current % frames.length]
          : null;
      setTrainingStep(visibleFrame);
      setTrainingTrail(
        visibleFrame
          ? frames
              .filter(
                (frame) =>
                  frame.episode === visibleFrame.episode &&
                  frame.step <= visibleFrame.step,
              )
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
          !policyIsOptimal(nextEvaluation, rewardMode, optimalSteps) &&
          !trainer.finished
        ) {
          return current;
        }
        return [...current, { episode: nextEpisodes, evaluation: nextEvaluation }];
      });

      if (policyIsOptimal(nextEvaluation, rewardMode, optimalSteps)) {
        const signature = nextEvaluation.actions.join(",");
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
  }, [environment, mode, optimalSteps, rewardMode]);

  useEffect(() => {
    if (mode !== "replaying") return undefined;
    if (playbackStep >= policyFrames.length) {
      setMode("complete");
      return undefined;
    }
    const timer = window.setTimeout(
      () => setPlaybackStep((step) => step + 1),
      72,
    );
    return () => window.clearTimeout(timer);
  }, [mode, playbackStep, policyFrames.length]);

  function toggleTraining() {
    setSelectedCheckpoint(null);
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
    setSelectedCheckpoint(null);
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
  const currentPosition =
    mode === "training" && trainingStep
      ? trainingStep.nextState.position
      : replayFrame?.state.position ??
        (mode === "complete" && compactFrames.length > 0
          ? (compactFrames.at(-1)?.state.position ?? environment.start)
          : environment.start);
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
        : compactFrames.flatMap((frame, index) =>
            index === 0
              ? [frame.previousState.position, frame.state.position]
              : [frame.state.position],
          );
  const visited = new Set(trailPositions.map(positionKey));
  const rewardedPosition =
    mode === "training" &&
    trainingStep &&
    positionKey(trainingStep.state.position) !==
      positionKey(trainingStep.nextState.position) &&
    environment.checkpoints.some(
      (checkpoint) =>
        positionKey(checkpoint) ===
        positionKey(trainingStep.nextState.position),
    )
      ? positionKey(trainingStep.nextState.position)
      : replayFrame && replayFrame.event.enteredCheckpoint >= 0
        ? positionKey(replayFrame.state.position)
        : "";
  const currentEpsilon =
    trainingStep?.epsilon ??
    (episodes === 0
      ? CHECKPOINT_TRAINING.epsilonStart
      : CHECKPOINT_TRAINING.epsilonStart *
          (1 -
            Math.min(1, episodes / (CHECKPOINT_TRAINING.episodes - 1))) +
        CHECKPOINT_TRAINING.epsilonEnd *
          Math.min(1, episodes / (CHECKPOINT_TRAINING.episodes - 1)));

  const status =
    mode === "idle"
      ? pt
        ? "Pronto para aprender"
        : "Ready to learn"
      : mode === "training"
        ? pt
          ? "Explorando e atualizando os valores Q…"
          : "Exploring and updating Q-values…"
        : mode === "paused"
          ? pt
            ? `Pausado após ${episodes.toLocaleString(numberLocale)} episódios`
            : `Paused after ${episodes.toLocaleString(numberLocale)} episodes`
          : mode === "replaying"
            ? pt
              ? `Executando a política aprendida · passo ${playbackStep} de ${policyFrames.length}`
              : `Running learned policy · step ${playbackStep} of ${policyFrames.length}`
            : mode === "limit"
              ? pt
                ? "Limite de treino atingido"
                : "Training limit reached"
              : aligned
                ? pt
                  ? "Rota ótima encontrada"
                  : "Optimal route found"
                : pt
                  ? "Política de recompensa ótima encontrada"
                  : "Optimal reward policy found";

  const eventText =
    mode === "training" && trainingStep
      ? pt
        ? `Episódio ${trainingStep.episode.toLocaleString(numberLocale)}, passo ${trainingStep.step}: ${
            trainingStep.exploring ? "explorou" : "seguiu os valores atuais"
          } na direção ${CHECKPOINT_ACTIONS[trainingStep.action].label}. Q mudou de ${trainingStep.qBefore.toFixed(2).replace(".", ",")} para ${trainingStep.qAfter.toFixed(2).replace(".", ",")}.`
        : `Episode ${trainingStep.episode.toLocaleString(numberLocale)}, step ${trainingStep.step}: ${
            trainingStep.exploring ? "explored" : "followed current values"
          } ${CHECKPOINT_ACTIONS[trainingStep.action].label}. Q changed from ${trainingStep.qBefore.toFixed(2)} to ${trainingStep.qAfter.toFixed(2)}.`
      : mode === "replaying" && replayFrame
        ? pt
          ? `Passo ${playbackStep} de ${policyFrames.length}: escolheu ${CHECKPOINT_ACTIONS[replayFrame.action].label}.`
          : `Step ${playbackStep} of ${policyFrames.length}: chose ${CHECKPOINT_ACTIONS[replayFrame.action].label}.`
        : mode === "complete" && evaluation
          ? aligned
            ? pt
              ? `Volta ordenada mais curta: ${evaluation.steps} passos.`
              : `Shortest ordered lap: ${evaluation.steps} steps.`
            : pt
              ? `Reentrou em um checkpoint já visitado ${evaluation.repeatedEntries} vezes e completou 0 voltas.`
              : `Repeated a visited checkpoint ${evaluation.repeatedEntries} times and completed 0 laps.`
          : mode === "limit"
            ? pt
              ? `O treino parou após ${MAX_TRAINING_EPISODES.toLocaleString(numberLocale)} episódios sem encontrar um ótimo estável.`
              : `Stopped after ${MAX_TRAINING_EPISODES.toLocaleString(numberLocale)} episodes without a stable optimum.`
            : pt
              ? "Inicie o aprendizado para observar a exploração, os valores Q e as mudanças na rota gulosa."
              : "Start learning to watch exploration, Q-values, and the greedy route change.";

  return (
    <section
      className={`${styles.lab} ${styles.learningLab}`}
      aria-label={
        pt
          ? `Playground de aprendizado com recompensa ${aligned ? "alinhada" : "proxy"} nos checkpoints`
          : `Checkpoint ${aligned ? "aligned" : "proxy"}-reward learning playground`
      }
      data-training-model="live-q-learning"
    >
      <header className={styles.learningHeader}>
        <div>
          <p className={styles.kicker}>GridWorld · MDP 1</p>
          <h3>{pt ? "Qual rota esta recompensa vai ensinar?" : "What route will this reward teach?"}</h3>
        </div>
        <p className={styles.learningReward}>
          {pt ? "Recompensa vista pelo agente" : "Reward seen by the agent"}
          <strong>
            {aligned
              ? pt
                ? "+1 próximo checkpoint · +10 volta completa"
                : "+1 next checkpoint · +10 completed lap"
              : pt
                ? "+1 ao entrar em qualquer checkpoint"
                : "+1 when entering any checkpoint"}
          </strong>
        </p>
      </header>

      <div className={styles.learningStage}>
        <div className={styles.learningBoardColumn}>
          <div className={styles.learningValueToolbar}>
            <p>
              {valuesVisible
                ? qValueView.route.size > 0
                  ? pt
                    ? `Valores Q mín.–máx. · ${qValueView.route.size} ações da rota`
                    : `Min–max Q-values · ${qValueView.route.size} route actions`
                  : pt
                    ? "Ainda não há valores aprendidos para a rota."
                    : "No learned route values yet."
                : pt
                  ? "Os valores Q aprendidos para a rota estão ocultos."
                  : "Learned route Q-values are hidden."}
            </p>
            <button
              type="button"
              className={styles.learningValueButton}
              aria-pressed={valuesVisible}
              onClick={() => setValuesVisible((visible) => !visible)}
              disabled={mode === "replaying"}
            >
              {valuesVisible
                ? pt
                  ? "Ocultar valores da rota"
                  : "Hide route values"
                : pt
                  ? "Mostrar valores da rota"
                  : "Show route values"}
            </button>
          </div>
          <div
            className={`${styles.learningBoard} ${
              valuesVisible ? styles.learningBoardValues : ""
            }`}
            role="grid"
            aria-label={
              pt
                ? `Pista de checkpoints sete por sete com checkpoints móveis durante o aprendizado com recompensa ${aligned ? "alinhada" : "proxy"}`
                : `Seven by seven checkpoint track with movable checkpoints during ${aligned ? "aligned" : "proxy"}-reward learning`
            }
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
                      rewardedPosition === key
                        ? styles.learningRewarded
                        : "",
                      dropTarget === key && draggingCheckpoint !== null
                        ? styles.learningDropTarget
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="gridcell"
                    aria-label={
                      isWall
                        ? pt
                          ? `Parede na coluna ${x + 1}, linha ${y + 1}`
                          : `Wall at column ${x + 1}, row ${y + 1}`
                        : label
                          ? pt
                            ? `${label} na coluna ${x + 1}, linha ${y + 1}`
                            : `${label} at column ${x + 1}, row ${y + 1}`
                          : pt
                            ? `Célula livre na coluna ${x + 1}, linha ${y + 1}`
                            : `Open cell at column ${x + 1}, row ${y + 1}`
                    }
                    data-grid-position={key}
                    onClick={() => placeSelectedCheckpoint(position)}
                    key={key}
                  >
                    {label ? (
                      checkpointIndex >= 0 ? (
                        <button
                          type="button"
                          className={`${styles.optimalCellLabel} ${styles.learningCheckpointHandle}`}
                          aria-label={
                            pt
                              ? `Mover o checkpoint ${label}. Arraste-o, toque nele e depois em uma célula livre, ou use as setas do teclado.`
                              : `Move checkpoint ${label}. Drag it, tap it then an open cell, or use the arrow keys.`
                          }
                          aria-keyshortcuts="ArrowUp ArrowRight ArrowDown ArrowLeft"
                          aria-pressed={selectedCheckpoint === checkpointIndex}
                          onClick={(event) =>
                            selectCheckpoint(event, checkpointIndex)
                          }
                          onPointerDown={(event) =>
                            beginCheckpointDrag(event, checkpointIndex)
                          }
                          onPointerMove={updateCheckpointDrag}
                          onPointerUp={finishCheckpointDrag}
                          onPointerCancel={cancelCheckpointDrag}
                          onKeyDown={(event) =>
                            moveCheckpointWithKeyboard(event, checkpointIndex)
                          }
                          disabled={mode === "replaying"}
                        >
                          {label}
                        </button>
                      ) : (
                        <span className={styles.optimalCellLabel}>{label}</span>
                      )
                    ) : null}
                    {!isWall ? (
                      <span
                        className={styles.learningActionValues}
                        aria-hidden="true"
                      >
                        {CHECKPOINT_ACTIONS.map((action, actionIndex) => {
                          if (
                            !actionIsAvailable(
                              environment,
                              position,
                              actionIndex,
                            )
                          ) {
                            return null;
                          }
                          const value = qValueView.route.get(
                            `${key}|${actionIndex}`,
                          );
                          const normalized =
                            value !== undefined &&
                            qValueView.ceiling > qValueView.floor
                              ? (value - qValueView.floor) /
                                (qValueView.ceiling - qValueView.floor)
                              : 0.72;
                          return (
                            <span
                              className={`${styles.learningValueArrow} ${
                                value !== undefined
                                  ? styles.learningValueArrowChosen
                                  : ""
                              }`}
                              data-action={actionIndex}
                              style={{
                                opacity:
                                  valuesVisible &&
                                  value !== undefined &&
                                  value > 0
                                    ? 0.28 + normalized * 0.68
                                    : 0,
                              }}
                              key={action.name}
                            >
                              {action.label}
                            </span>
                          );
                        })}
                      </span>
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
                        A
                      </span>
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>
          <p className={styles.learningBoardCaption}>
            {pt ? "Ordem pretendida" : "Intended"}: S → C1 → C2 → C3 → C4 → S
          </p>
          <aside className={styles.learningCheckpointGuide}>
            <strong>{pt ? "Experimente mudar a rota" : "Try changing the route"}</strong>
            <span>
              {pt
                ? "Arraste qualquer checkpoint — ou toque nele e depois em uma célula livre. O aprendizado reinicia automaticamente para você observar como o modelo se adapta às novas posições."
                : "Drag any checkpoint—or tap it, then an open cell. Learning resets automatically so you can watch the model adapt to the new positions."}
            </span>
          </aside>
        </div>

        <aside
          className={styles.learningPanel}
          aria-label={pt ? "Controles e progresso do aprendizado" : "Learning controls and progress"}
        >
          <div className={styles.learningStatus} aria-live="polite">
            <span>{status}</span>
            <strong>{episodes.toLocaleString(numberLocale)} {pt ? "episódios" : "episodes"}</strong>
          </div>

          <div className={styles.learningMetrics}>
            <div>
              <span>{pt ? "Exploração ε" : "Exploration ε"}</span>
              <strong>{pt ? currentEpsilon.toFixed(2).replace(".", ",") : currentEpsilon.toFixed(2)}</strong>
            </div>
            <div>
              <span>{pt ? "Recompensa gulosa" : "Greedy reward"}</span>
              <strong>
                {evaluation ? compactReward(evaluation.reward, locale) : "—"}
              </strong>
            </div>
            <div>
              <span>{pt ? "Completou a volta?" : "Lap completed?"}</span>
              <strong>
                {evaluation
                  ? evaluation.completedLap
                    ? pt ? "Sim" : "Yes"
                    : pt ? "Não" : "No"
                  : "—"}
              </strong>
            </div>
            <div>
              <span>{pt ? "Reentradas" : "Repeated entries"}</span>
              <strong>{evaluation?.repeatedEntries ?? "—"}</strong>
            </div>
          </div>

          <p className={styles.learningEvent} aria-live="polite">
            {eventText}
          </p>

          <RewardHistory samples={samples} rewardMode={rewardMode} locale={locale} />

          <div className={styles.learningControls}>
            <label className={styles.learningSpeedSlider}>
              <span>
                {pt ? "Velocidade do treino" : "Training speed"}
                <output>{speed} {pt ? "episódios/s" : "episodes/s"}</output>
              </span>
              <input
                type="range"
                min="5"
                max="150"
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
                ? pt ? "Pausar treino" : "Pause training"
                : mode === "paused"
                  ? pt ? "Continuar treino" : "Continue training"
                  : mode === "complete" || mode === "limit"
                    ? pt ? "Treinar novamente" : "Train again"
                    : pt ? "Treinar até o ótimo" : "Train until optimal"}
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
              {pt ? "Executar agente treinado" : "Run learned agent"}
            </button>
            <button
              type="button"
              className={styles.learningReset}
              onClick={() => resetExperience()}
              disabled={mode === "replaying"}
            >
              {pt ? "Reiniciar aprendizado" : "Reset learning"}
            </button>
          </div>
        </aside>
      </div>

      <p className={styles.learningTakeaway}>
        {mode === "complete" && evaluation ? (
          aligned ? (
            pt ? (
              <>
                O agente explorou antes de convergir. Sua política gulosa agora
                obtém <strong>{compactReward(evaluation.reward, locale)}</strong> e
                completa a volta ordenada mais curta em{" "}
                <strong>{evaluation.steps} passos</strong>.
              </>
            ) : (
              <>
                The agent explored before converging. Its greedy policy now earns{" "}
                <strong>{compactReward(evaluation.reward, locale)}</strong> and completes
                the shortest ordered lap in{" "}
                <strong>{evaluation.steps} steps</strong>.
              </>
            )
          ) : (
            pt ? (
              <>
                O agente explorou antes de convergir. A recompensa subiu para{" "}
                <strong>{compactReward(evaluation.reward, locale)}</strong>, mas a
                política gulosa completou <strong>0 voltas</strong> e aprendeu a
                reentrar em C1.
              </>
            ) : (
              <>
                The agent explored before converging. Reward rose to{" "}
                <strong>{compactReward(evaluation.reward, locale)}</strong>, but the
                greedy policy completed <strong>0 laps</strong> and learned to
                re-enter C1.
              </>
            )
          )
        ) : (
          pt
            ? "Observe as ações exploratórias atualizarem os valores Q e depois compare o aumento da recompensa com a conclusão da volta."
            : "Watch exploratory actions update the Q-values, then compare rising reward with lap completion."
        )}
      </p>
    </section>
  );
}

export function CheckpointProxyPlayground({ locale = "en" }: { locale?: RhLocale }) {
  return <CheckpointLearningPlayground rewardMode="proxy" locale={locale} />;
}

export function CheckpointAlignedPlayground({ locale = "en" }: { locale?: RhLocale }) {
  return <CheckpointLearningPlayground rewardMode="aligned" locale={locale} />;
}
