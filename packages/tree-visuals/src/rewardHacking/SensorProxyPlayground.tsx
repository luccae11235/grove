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
import { isPt, type RhLocale } from "./shared";

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

function compactReward(value: number, locale: RhLocale = "en") {
  return value.toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US", {
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
            rewardMode === "aligned"
              ? styles.learningChartValueAligned
              : undefined
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
              ? `A recompensa da política gulosa chegou a ${compactReward(latest.evaluation.reward, locale)} após ${latest.episode} episódios.`
              : `Greedy-policy reward reached ${compactReward(latest.evaluation.reward)} after ${latest.episode} episodes.`
            : pt
              ? "O histórico de recompensa está vazio antes do início do treino."
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
          {domainMaximum} {pt ? "episódios" : "episodes"}
        </text>
      </svg>
      <figcaption>{pt ? "Avaliação da política gulosa atual." : "Evaluation of the current greedy policy."}</figcaption>
    </figure>
  );
}

function SensorLearningPlayground({
  rewardMode,
  locale,
}: {
  rewardMode: RewardMode;
  locale: RhLocale;
}) {
  const aligned = rewardMode === "aligned";
  const pt = isPt(locale);
  const numberLocale = pt ? "pt-BR" : "en-US";
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
      ? pt ? "Pronto para aprender" : "Ready to learn"
      : mode === "training"
        ? pt ? "Explorando e atualizando os valores Q…" : "Exploring and updating Q-values…"
        : mode === "paused"
          ? pt ? `Pausado após ${episodes.toLocaleString(numberLocale)} episódios` : `Paused after ${episodes.toLocaleString(numberLocale)} episodes`
          : mode === "replaying"
            ? pt ? `Executando a política aprendida · passo ${playbackStep} de ${policyFrames.length}` : `Running learned policy · step ${playbackStep} of ${policyFrames.length}`
            : mode === "limit"
              ? pt ? "Limite de treino atingido" : "Training limit reached"
              : aligned
                ? pt ? "Rota segura ótima encontrada" : "Optimal safe route found"
                : pt ? "Política ótima para a recompensa medida encontrada" : "Optimal measured-reward policy found";

  const eventText =
    mode === "training" && trainingStep
      ? pt
        ? `Episódio ${trainingStep.episode.toLocaleString(numberLocale)}, passo ${trainingStep.step}: ${trainingStep.exploring ? "explorou" : "seguiu os valores atuais"} ${SENSOR_ACTIONS[trainingStep.action].name === "toggle" ? "alternar câmera" : SENSOR_ACTIONS[trainingStep.action].label}.`
        : `Episode ${trainingStep.episode.toLocaleString(numberLocale)}, step ${trainingStep.step}: ${trainingStep.exploring ? "explored" : "followed current values"} ${SENSOR_ACTIONS[trainingStep.action].name === "toggle" ? "camera toggle" : SENSOR_ACTIONS[trainingStep.action].label}.`
      : mode === "replaying" && replayFrame
        ? replayFrame.event.cameraToggled
          ? pt ? `Passo ${playbackStep} de ${policyFrames.length}: ${replayFrame.state.cameraActive ? "ligou" : "desligou"} a câmera.` : `Step ${playbackStep} of ${policyFrames.length}: turned the camera ${replayFrame.state.cameraActive ? "on" : "off"}.`
          : replayFrame.event.fragileCrossed
            ? pt ? `Passo ${playbackStep} de ${policyFrames.length}: atravessou o piso frágil${replayFrame.event.detectedViolation ? "; a câmera detectou" : " sem ser visto"}.` : `Step ${playbackStep} of ${policyFrames.length}: crossed the fragile floor${replayFrame.event.detectedViolation ? "; the camera detected it" : " unseen"}.`
            : replayFrame.event.delivered
              ? pt ? `Passo ${playbackStep} de ${policyFrames.length}: pacote entregue.` : `Step ${playbackStep} of ${policyFrames.length}: package delivered.`
              : pt ? `Passo ${playbackStep} de ${policyFrames.length}: moveu-se ${SENSOR_ACTIONS[replayFrame.action].label}.` : `Step ${playbackStep} of ${policyFrames.length}: moved ${SENSOR_ACTIONS[replayFrame.action].label}.`
        : mode === "complete" && evaluation
          ? aligned
            ? pt ? "Câmera ligada · 0 violações físicas · pacote entregue com segurança." : "Camera on · 0 physical violations · package delivered safely."
            : pt ? "Câmera desligada · 1 violação física · 0 violações detectadas." : "Camera off · 1 physical violation · 0 detected violations."
          : mode === "limit"
            ? pt ? `O treino parou após ${MAX_TRAINING_EPISODES.toLocaleString(numberLocale)} episódios sem encontrar um ótimo estável.` : `Stopped after ${MAX_TRAINING_EPISODES.toLocaleString(numberLocale)} episodes without a stable optimum.`
            : aligned
              ? pt ? "Inicie o aprendizado e depois reproduza a rota gulosa que contorna o piso frágil." : "Start learning, then replay the greedy route around the fragile floor."
              : pt ? "Inicie o aprendizado e depois reproduza a rota gulosa que passa pelo interruptor da câmera e atravessa o piso frágil." : "Start learning, then replay the greedy route from the camera switch across the fragile floor.";

  return (
    <section
      className={`${styles.lab} ${styles.learningLab}`}
      aria-label={pt ? `Playground de aprendizado com ${aligned ? "penalidade por violação física" : "recompensa proxy da câmera"}` : `${aligned ? "Physical-violation" : "Camera proxy-reward"} learning playground`}
      data-training-model="live-q-learning"
    >
      <header className={styles.learningHeader}>
        <div>
          <p className={styles.kicker}>GridWorld · MDP 2</p>
          <h3>{pt ? "Qual rota esta recompensa vai ensinar?" : "What route will this reward teach?"}</h3>
        </div>
        <p className={styles.learningReward}>
          {pt ? "Recompensa vista pelo agente" : "Reward seen by the agent"}
          <strong>
            {aligned
              ? pt ? "+10 entrega · −12 dano físico" : "+10 delivery · −12 physical damage"
              : pt ? "+10 entrega · −12 dano detectado" : "+10 delivery · −12 detected damage"}
          </strong>
        </p>
      </header>

      <div className={styles.learningStage}>
        <div className={styles.learningBoardColumn}>
          <div className={styles.sensorStatusBar}>
            <span>{pt ? "Sala de entrega de pacotes" : "Package-delivery room"}</span>
            <strong data-camera-active={currentState.cameraActive}>
              <span aria-hidden="true">
                {currentState.cameraActive ? "●" : "○"}
              </span>{" "}
              {pt ? "Câmera" : "Camera"} {currentState.cameraActive ? (pt ? "ligada" : "on") : (pt ? "desligada" : "off")}
            </strong>
          </div>
          <div
            className={styles.sensorLearningBoard}
            role="grid"
            aria-label={pt ? "Sala de entrega de pacotes de sete por quatro com rota segura superior, atalho frágil, interruptor da câmera, início e destino" : "Seven by four package-delivery room with a safe upper route, fragile short route, camera switch, start, and destination"}
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
                      ? pt ? "FRÁGIL" : "FRAGILE"
                      : isSwitch
                        ? "CAM"
                        : isSafeLabel
                          ? pt ? "SEGURA" : "SAFE"
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
                        ? pt ? `Espaço bloqueado na coluna ${x + 1}, linha ${y + 1}` : `Blocked space at column ${x + 1}, row ${y + 1}`
                        : pt ? `${label || "Piso livre"} na coluna ${x + 1}, linha ${y + 1}` : `${label || "Open floor"} at column ${x + 1}, row ${y + 1}`
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
            {pt ? "Rota segura: 10 passos · atalho frágil: 6 passos de movimento" : "Safe route: 10 steps · fragile shortcut: 6 movement steps"}
            <span className={pt ? styles.localizedCaptionDetail : undefined}>{pt ? "O interruptor da câmera pode ser acionado a partir da célula acima dele." : "The camera switch is available from the cell above it."}</span>
          </p>
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
              <span>{pt ? "Violações físicas" : "Physical violations"}</span>
              <strong>{evaluation?.realViolations ?? "—"}</strong>
            </div>
            <div>
              <span>{pt ? "Violações detectadas" : "Detected violations"}</span>
              <strong>{evaluation?.detectedViolations ?? "—"}</strong>
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
            pt ? <>
              O agente manteve a câmera ligada e seguiu a rota segura mais longa.
              Entregou em <strong>{evaluation.steps} passos</strong>, com{" "}
              <strong>0 violações físicas</strong>. Desligar a câmera não trouxe
              nenhuma vantagem na recompensa.
            </> : <>
              The agent kept the camera on and followed the longer safe route.
              It delivered in <strong>{evaluation.steps} steps</strong> with{" "}
              <strong>0 physical violations</strong>. Disabling the camera
              offered no reward advantage.
            </>
          ) : (
            pt ? <>
              O agente aprendeu a desligar a câmera, atravessar o mesmo piso
              frágil e entregar em <strong>{evaluation.steps} passos</strong>.
              Causou <strong>1 violação física</strong>, mas a recompensa registrou{" "}
              <strong>0 violações detectadas</strong>.
            </> : <>
              The agent learned to switch the camera off, cross the unchanged
              fragile floor, and deliver in{" "}
              <strong>{evaluation.steps} steps</strong>. It caused{" "}
              <strong>1 physical violation</strong>, but the reward recorded{" "}
              <strong>0 detected violations</strong>.
            </>
          )
        ) : (
          aligned
            ? pt ? "Observe se o robô ainda se beneficia ao mudar a câmera quando o dano físico é penalizado diretamente." : "Watch whether the robot still benefits from changing the camera when physical damage is penalized directly."
            : pt ? "Observe o estado da câmera mudar enquanto o piso frágil — e a violação física — permanecem iguais." : "Watch the camera status change while the fragile floor—and the physical violation—stay the same."
        )}
      </p>
    </section>
  );
}

export function SensorProxyPlayground({ locale = "en" }: { locale?: RhLocale }) {
  return <SensorLearningPlayground rewardMode="proxy" locale={locale} />;
}

export function SensorAlignedPlayground({ locale = "en" }: { locale?: RhLocale }) {
  return <SensorLearningPlayground rewardMode="aligned" locale={locale} />;
}
