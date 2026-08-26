import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import styles from "./RewardHacking.module.css";
import {
  TRAFFIC_ACTIONS,
  TRAFFIC_CONFIG,
  TRAFFIC_TRAINING,
  createTrafficTrainer,
  evaluateTrafficPolicy,
  highwaySpeed,
  trafficInitialState,
  trafficStateIndex,
  type TrafficEvaluation,
  type TrafficEvent,
  type TrafficState,
  type TrafficTrainingStep,
} from "./trafficMdp";
import type { RewardMode } from "./engine";
import { isPt, type RhLocale } from "./shared";

const MAX_TRAINING_EPISODES = TRAFFIC_TRAINING.episodes;
const TRAINING_TICK_MS = 60;
const REPLAY_STEPS = 120;
const REPLAY_STEP_MS = 320;
const RELEASE_REPLAY_STEP_MS = 1_250;
const EMPTY_Q_VALUES = new Float64Array(
  (TRAFFIC_CONFIG.maxQueue + 1) *
    (TRAFFIC_CONFIG.maxCongestion + 1) *
    TRAFFIC_ACTIONS.length,
);

type PlaybackMode =
  | "idle"
  | "training"
  | "paused"
  | "complete"
  | "replaying";

interface TrafficFrame {
  previousState: TrafficState;
  state: TrafficState;
  action: number;
  reward: number;
  event: TrafficEvent;
  cumulativeOverflow: number;
}

function compactNumber(value: number, digits = 1, locale: RhLocale = "en") {
  return value.toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function formatQ(value: number, locale: RhLocale = "en") {
  const formatted = Math.abs(value) < 0.005 ? "0.00" : value.toFixed(2);
  return locale === "pt-BR" ? formatted.replace(".", ",") : formatted;
}

function evaluationFrames(evaluation: TrafficEvaluation): TrafficFrame[] {
  let cumulativeOverflow = 0;
  return evaluation.trace.slice(1).map((entry, index) => {
    cumulativeOverflow += entry.event?.overflow ?? 0;
    return {
      previousState: evaluation.trace[index].state,
      state: entry.state,
      action: entry.action!,
      reward: entry.reward,
      event: entry.event!,
      cumulativeOverflow,
    };
  });
}

function qValue(
  qValues: Float64Array,
  state: TrafficState,
  action: number,
) {
  return (
    qValues[
      trafficStateIndex(state) * TRAFFIC_ACTIONS.length + action
    ] ?? 0
  );
}

function bestActionAt(qValues: Float64Array, state: TrafficState) {
  const hold = qValue(qValues, state, 0);
  const release = qValue(qValues, state, 1);
  if (Math.abs(hold - release) <= 1e-12) return null;
  return release > hold ? 1 : 0;
}

function TrafficQTables({
  qValues,
  activeState,
  chosenAction,
  updatedAction,
  locale,
}: {
  qValues: Float64Array;
  activeState: TrafficState;
  chosenAction: number | null;
  updatedAction: number | null;
  locale: RhLocale;
}) {
  const pt = isPt(locale);
  const values = Array.from(qValues);
  const floor = Math.min(...values);
  const ceiling = Math.max(...values);
  const range = Math.max(1e-12, ceiling - floor);
  const hold = qValue(qValues, activeState, 0);
  const release = qValue(qValues, activeState, 1);
  const preference = bestActionAt(qValues, activeState);
  const preferenceLabel =
    preference === null
      ? pt ? "empate" : "tie"
      : preference === 0
        ? pt ? "reter" : "hold"
        : pt ? "liberar" : "release";

  return (
    <section
      className={styles.trafficValues}
      aria-label={pt ? "Tabelas de valores de ação do controlador" : "Controller action-value tables"}
    >
      <div className={styles.trafficValueHeading}>
        <h4>{pt ? "O que o controlador espera" : "What the controller expects"}</h4>
        <p>
          {pt ? "Estado atual" : "Current state"} c {activeState.congestion}, q {activeState.queue} · {pt ? "reter" : "hold"}{" "}
          {formatQ(hold, locale)} · {pt ? "liberar" : "release"} {formatQ(release, locale)} · {preferenceLabel}
        </p>
      </div>
      <p className={styles.trafficValueLegend}>
        <span>
          <b className={styles.trafficLegendWinner}>{pt ? "MELHOR" : "WIN"}</b> {pt ? "Q mais alto nesse estado" : "higher Q for that state"}
        </span>
        <span>
          <b className={styles.trafficLegendCurrent} aria-hidden="true" />{" "}
          {pt ? "estado atual nas duas tabelas" : "current state in both tables"}
        </span>
        <span>
          <b className={styles.trafficLegendAction} aria-hidden="true" /> {pt ? "ação atualizada ou escolhida agora" : "action updated or chosen now"}
        </span>
      </p>
      <div
        className={styles.trafficHeatmapScroll}
        tabIndex={0}
        aria-label={pt ? "Tabelas roláveis dos valores das ações reter e liberar" : "Scrollable hold and release action-value tables"}
      >
        <div className={styles.trafficHeatmaps}>
          {TRAFFIC_ACTIONS.map((action, actionIndex) => (
            <section
              className={styles.trafficHeatmapPanel}
              key={action.name}
            >
              <h5>
                {action.name === "hold" ? (pt ? "Reter" : "Hold") : (pt ? "Liberar" : "Release")}
                <span>Q({pt ? "estado" : "state"}, {pt ? (action.name === "hold" ? "reter" : "liberar") : action.name})</span>
              </h5>
              <table
                className={styles.trafficQTable}
                aria-label={pt ? `Valores da ação ${action.name === "hold" ? "reter" : "liberar"}` : `${action.name} action values`}
              >
                <thead>
                  <tr>
                    <th scope="col">c \ q</th>
                    {Array.from(
                      { length: TRAFFIC_CONFIG.maxQueue + 1 },
                      (_, queue) => (
                        <th scope="col" key={queue}>
                          {queue}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    { length: TRAFFIC_CONFIG.maxCongestion + 1 },
                    (_, congestion) => (
                      <tr key={congestion}>
                        <th scope="row">{congestion}</th>
                        {Array.from(
                          { length: TRAFFIC_CONFIG.maxQueue + 1 },
                          (_, queue) => {
                            const state = { queue, congestion };
                            const value = qValue(
                              qValues,
                              state,
                              actionIndex,
                            );
                            const winner =
                              bestActionAt(qValues, state) === actionIndex;
                            const current =
                              queue === activeState.queue &&
                              congestion === activeState.congestion;
                            const actionMarked =
                              current &&
                              (actionIndex === chosenAction ||
                                actionIndex === updatedAction);
                            const heat =
                              0.05 +
                              ((value - floor) / range) * 0.88;
                            const className = [
                              current
                                ? styles.trafficQCellCurrent
                                : "",
                              winner
                                ? styles.trafficQCellWinner
                                : styles.trafficQCellLoser,
                              actionMarked
                                ? styles.trafficQCellAction
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ");
                            return (
                              <td
                                className={className}
                                style={
                                  {
                                    "--traffic-heat": heat,
                                  } as CSSProperties
                                }
                                aria-label={pt ? `${action.name === "hold" ? "reter" : "liberar"}, congestionamento ${congestion}, fila ${queue}, Q ${formatQ(value, locale)}${winner ? ", ação de maior valor neste estado" : ""}${current ? ", estado atual" : ""}${actionMarked ? ", ação atualizada ou escolhida agora" : ""}` : `${action.name}, congestion ${congestion}, queue ${queue}, Q ${formatQ(value)}${winner ? ", higher-valued action for this state" : ""}${current ? ", current state" : ""}${actionMarked ? ", action updated or chosen now" : ""}`}
                                title={`${pt ? (action.name === "hold" ? "reter" : "liberar") : action.name} · c ${congestion}, q ${queue} · Q ${formatQ(value, locale)}`}
                                key={queue}
                              >
                                {winner ? (
                                  <b aria-hidden="true">{pt ? "MELHOR" : "WIN"}</b>
                                ) : null}
                                <span>{formatQ(value, locale)}</span>
                              </td>
                            );
                          },
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              <p>{pt ? "Linhas: congestionamento c · colunas: carros na fila q" : "Rows: congestion c · columns: queued cars q"}</p>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrafficLearningScene({
  previousState,
  state,
  action,
  event,
  exploring,
  locale,
}: {
  previousState: TrafficState;
  state: TrafficState;
  action: number | null;
  event: TrafficEvent | null;
  exploring: boolean;
  locale: RhLocale;
}) {
  const pt = isPt(locale);
  const [releaseAnimations, setReleaseAnimations] = useState<
    { id: number; position: number }[]
  >([]);
  const nextReleaseId = useRef(0);
  const lastAnimatedEvent = useRef<TrafficEvent | null>(null);
  const releaseAnimationActive = useRef(false);
  const releaseTimers = useRef<number[]>([]);
  const speed = event?.speed ?? highwaySpeed(state.congestion);
  const actionName =
    action === null ? "hold" : TRAFFIC_ACTIONS[action].name;
  const queueCarX = [256, 222, 188, 154, 120, 86, 52, 18];

  useEffect(() => {
    if (!event || event === lastAnimatedEvent.current) return;
    lastAnimatedEvent.current = event;
    const released = Math.min(2, event.released);
    if (
      released === 0 ||
      releaseAnimationActive.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const cars = Array.from({ length: released }, (_, position) => ({
      id: nextReleaseId.current++,
      position,
    }));
    releaseAnimationActive.current = true;
    setReleaseAnimations((current) => [...current, ...cars]);
    const timer = window.setTimeout(() => {
      const releasedIds = new Set(cars.map((car) => car.id));
      setReleaseAnimations((current) =>
        current.filter((car) => !releasedIds.has(car.id)),
      );
      releaseAnimationActive.current = false;
      releaseTimers.current = releaseTimers.current.filter(
        (timerId) => timerId !== timer,
      );
    }, RELEASE_REPLAY_STEP_MS);
    releaseTimers.current.push(timer);
  }, [event]);

  useEffect(
    () => () => {
      releaseTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  return (
    <div
      className={styles.trafficOriginalScene}
      role="img"
      aria-label={pt ? `O tráfego passou de congestionamento ${previousState.congestion}, fila ${previousState.queue} para congestionamento ${state.congestion}, fila ${state.queue}. Sinal ${actionName === "release" ? "liberar" : "reter"}. A velocidade da rodovia é ${Math.round(speed * 100)} por cento.${event?.released ? ` ${event.released} ${event.released === 1 ? "carro da fila foi liberado" : "carros da fila foram liberados"} pela confluência.` : ""}${event?.overflow ? ` ${event.overflow} carro excedeu a capacidade da fila da rampa.` : ""}` : `Traffic changed from congestion ${previousState.congestion}, queue ${previousState.queue} to congestion ${state.congestion}, queue ${state.queue}. Signal ${actionName}. Highway speed is ${Math.round(speed * 100)} percent.${event?.released ? ` ${event.released} queued ${event.released === 1 ? "car was" : "cars were"} released through the merge.` : ""}${event?.overflow ? ` ${event.overflow} car overflowed the full ramp queue.` : ""}`}
    >
      <svg
        className={styles.trafficOriginalMap}
        viewBox="0 0 640 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <text className={styles.trafficMapLabel} x="18" y="25">
          {pt ? "RODOVIA · FLUXO DO TRÁFEGO →" : "HIGHWAY · TRAFFIC FLOWS →"}
        </text>
        <text
          className={styles.trafficFlowLabel}
          x="622"
          y="25"
          textAnchor="end"
        >
          {Math.round(speed * 100)}% {pt ? "da velocidade" : "speed"}
        </text>

        <path
          className={styles.trafficRoad}
          d="M -24 244 H 255 C 350 244 360 110 476 110 H 664"
        />
        <rect
          className={styles.trafficHighwayRoad}
          x="0"
          y="44"
          width="640"
          height="88"
        />
        <line
          className={styles.trafficLaneLine}
          x1="0"
          y1="88"
          x2="640"
          y2="88"
        />

        {[200, 1_300, 2_400, 3_500].map((phase, index) => (
          <g
            className={styles.trafficFlowCar}
            style={{ animationDelay: `-${phase}ms` }}
            key={phase}
          >
            <rect
              className={styles.trafficCarMark}
              x="0"
              y={index % 2 === 0 ? 58 : 99}
              width="34"
              height="18"
              rx="5"
            />
          </g>
        ))}

        <path
          className={styles.trafficLaneLine}
          d="M -8 244 H 255 C 350 244 360 110 476 110"
        />
        <text className={styles.trafficMapLabel} x="18" y="286">
          {pt ? "RAMPA DE ACESSO · CARROS NA FILA →" : "ON-RAMP · QUEUED CARS MOVE →"}
        </text>
        <text
          className={styles.trafficMapLabel}
          x="468"
          y="154"
          textAnchor="middle"
        >
          {pt ? "CONFLUÊNCIA" : "MERGE"}
        </text>

        {queueCarX.map((x, index) =>
          index < state.queue ? (
            <rect
              className={styles.trafficCarMark}
              x={x}
              y="235"
              width="28"
              height="18"
              rx="5"
              key={x}
            />
          ) : null,
        )}

        {releaseAnimations.map(({ id, position }) => (
          <g key={id}>
            <rect
              className={styles.trafficCarMark}
              x="-14"
              y="-9"
              width="28"
              height="18"
              rx="5"
            />
            <animateMotion
              begin={`${position * 0.1}s`}
              dur="1.05s"
              fill="freeze"
              rotate="auto"
              path={
                position === 0
                  ? "M 270 244 C 365 244 370 119 490 119 H 680"
                  : "M 236 244 H 270 C 365 244 370 119 490 119 H 680"
              }
            />
          </g>
        ))}

        <g
          className={[
            styles.trafficOriginalSignal,
            actionName === "release"
              ? styles.trafficOriginalSignalRelease
              : "",
            exploring ? styles.trafficOriginalSignalExploring : "",
          ]
            .filter(Boolean)
            .join(" ")}
          transform="translate(272 179)"
        >
          <line
            x1="42"
            y1="38"
            x2="42"
            y2="58"
            stroke="#40534b"
            strokeWidth="4"
          />
          <rect width="84" height="38" rx="9" />
          <text x="42" y="24">
            {actionName === "release" ? (pt ? "LIBERAR" : "RELEASE") : (pt ? "RETER" : "HOLD")}
          </text>
        </g>
      </svg>
      <div className={styles.trafficOriginalCongestion} aria-hidden="true">
        <div>
          <span>{pt ? "Congestionamento na rodovia" : "Highway congestion"}</span>
          <span>
            {state.congestion} / {TRAFFIC_CONFIG.maxCongestion} ·{" "}
            {Math.round(speed * 100)}% {pt ? "da velocidade" : "speed"}
          </span>
        </div>
        <div>
          <span
            style={{
              width: `${(state.congestion / TRAFFIC_CONFIG.maxCongestion) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TrafficLearningPlayground({
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
  const [evaluation, setEvaluation] =
    useState<TrafficEvaluation | null>(null);
  const [trainingStep, setTrainingStep] =
    useState<TrafficTrainingStep | null>(null);
  const [speed, setSpeed] = useState(150);
  const [playbackStep, setPlaybackStep] = useState(0);
  const trainerRef =
    useRef<ReturnType<typeof createTrafficTrainer> | null>(null);
  const episodeBudgetRef = useRef(0);
  const previousTickRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const policyFrames = useMemo(
    () => (evaluation ? evaluationFrames(evaluation) : []),
    [evaluation],
  );

  function resetExperience(nextMode: PlaybackMode = "idle") {
    trainerRef.current = createTrafficTrainer(rewardMode);
    episodeBudgetRef.current = 0;
    previousTickRef.current = 0;
    setEpisodes(0);
    setEvaluation(null);
    setTrainingStep(null);
    setPlaybackStep(0);
    setMode(nextMode);
  }

  useEffect(() => {
    if (mode !== "training") return undefined;
    if (!trainerRef.current) {
      trainerRef.current = createTrafficTrainer(rewardMode);
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

      const frames: TrafficTrainingStep[] = [];
      const batchEnd = Math.min(
        MAX_TRAINING_EPISODES,
        trainer.episodesCompleted + episodesThisTick,
      );
      while (trainer.episodesCompleted < batchEnd) {
        trainer.trainEpisode((step) => frames.push(step));
      }

      const nextEvaluation = evaluateTrafficPolicy(
        trainer.qValues,
        rewardMode,
        { maxSteps: REPLAY_STEPS },
      );
      setEpisodes(trainer.episodesCompleted);
      setEvaluation(nextEvaluation);
      setTrainingStep(frames.at(-1) ?? null);

      if (trainer.finished) {
        setTrainingStep(null);
        setMode("complete");
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
      frame?.event.released ? RELEASE_REPLAY_STEP_MS : REPLAY_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [mode, playbackStep, policyFrames]);

  function toggleTraining() {
    if (mode === "training") {
      setMode("paused");
      return;
    }
    if (mode === "complete") {
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
  const completeFrame =
    mode === "complete" && policyFrames.length
      ? policyFrames.at(-1)!
      : null;
  const visibleFrame = replayFrame ?? completeFrame;
  const showTrainingFrame =
    (mode === "training" || mode === "paused") && trainingStep;
  const sceneState =
    showTrainingFrame
      ? trainingStep.nextState
      : visibleFrame?.state ?? trafficInitialState();
  const scenePreviousState =
    showTrainingFrame
      ? trainingStep.state
      : visibleFrame?.previousState ?? trafficInitialState();
  const sceneEvent =
    showTrainingFrame
      ? (
          trainingStep.result as typeof trainingStep.result & {
            event: TrafficEvent;
          }
        ).event
      : visibleFrame?.event ?? null;
  const sceneAction =
    showTrainingFrame
      ? trainingStep.action
      : visibleFrame?.action ?? null;
  const qActiveState =
    showTrainingFrame
      ? trainingStep.state
      : visibleFrame?.previousState ?? trafficInitialState();
  const currentQValues = trainerRef.current?.qValues ?? EMPTY_Q_VALUES;
  const chosenAction =
    mode === "training"
      ? bestActionAt(currentQValues, qActiveState)
      : visibleFrame?.action ??
        bestActionAt(currentQValues, qActiveState);
  const updatedAction =
    showTrainingFrame ? trainingStep.action : null;
  const currentEpsilon =
    trainingStep?.epsilon ??
    (episodes === 0
      ? TRAFFIC_TRAINING.epsilonStart
      : TRAFFIC_TRAINING.epsilonStart *
          (1 -
            Math.min(
              1,
              episodes / (TRAFFIC_TRAINING.episodes - 1),
            )) +
        TRAFFIC_TRAINING.epsilonEnd *
          Math.min(1, episodes / (TRAFFIC_TRAINING.episodes - 1)));

  const status =
    mode === "idle"
      ? pt ? "Pronto para aprender" : "Ready to learn"
      : mode === "training"
        ? pt ? "Explorando e atualizando os valores Q…" : "Exploring and updating Q-values…"
        : mode === "paused"
          ? pt ? `Pausado após ${episodes.toLocaleString(numberLocale)} episódios` : `Paused after ${episodes.toLocaleString(numberLocale)} episodes`
          : mode === "replaying"
            ? pt ? `Executando a política aprendida · passo ${playbackStep} de ${REPLAY_STEPS}` : `Running learned policy · step ${playbackStep} of ${REPLAY_STEPS}`
            : pt ? "Treino concluído" : "Training complete";

  const eventText =
    showTrainingFrame
      ? pt ? `Episódio ${trainingStep.episode.toLocaleString(numberLocale)}, passo ${trainingStep.step}: ${trainingStep.exploring ? "explorou" : "seguiu os valores atuais"} ${TRAFFIC_ACTIONS[trainingStep.action].name === "hold" ? "reter" : "liberar"}; ${sceneEvent?.arrival ? "chegou 1 carro" : "nenhum carro chegou"}, ${sceneEvent?.released ?? 0} liberados, recompensa ${compactNumber(trainingStep.reward, 2, locale)}.` : `Episode ${trainingStep.episode.toLocaleString(numberLocale)}, step ${trainingStep.step}: ${trainingStep.exploring ? "explored" : "followed current values"} ${TRAFFIC_ACTIONS[trainingStep.action].name}; ${sceneEvent?.arrival ? "1 car arrived" : "no car arrived"}, ${sceneEvent?.released ?? 0} released, reward ${compactNumber(trainingStep.reward, 2)}.`
      : mode === "replaying" && replayFrame
        ? pt ? `Passo ${playbackStep} de ${REPLAY_STEPS}: escolheu ${TRAFFIC_ACTIONS[replayFrame.action].name === "hold" ? "reter" : "liberar"} em c ${replayFrame.previousState.congestion}, q ${replayFrame.previousState.queue}; ${replayFrame.event.arrival ? "chegou 1 carro" : "nenhum carro chegou"}, ${replayFrame.event.released} liberados${replayFrame.event.overflow ? ", 1 excedeu a capacidade da fila" : ""}.` : `Step ${playbackStep} of ${REPLAY_STEPS}: chose ${TRAFFIC_ACTIONS[replayFrame.action].name} from c ${replayFrame.previousState.congestion}, q ${replayFrame.previousState.queue}; ${replayFrame.event.arrival ? "1 car arrived" : "no car arrived"}, ${replayFrame.event.released} released${replayFrame.event.overflow ? ", 1 overflowed the full queue" : ""}.`
        : mode === "complete" && evaluation
          ? pt ? `Política aprendida pronta · fila média ${compactNumber(evaluation.averageQueue, 2, locale)} · velocidade da rodovia ${Math.round(evaluation.averageHighwaySpeed * 100)}% · ${evaluation.releasedCars} carros liberados.` : `Learned policy ready · mean queue ${compactNumber(evaluation.averageQueue, 2)} · highway speed ${Math.round(evaluation.averageHighwaySpeed * 100)}% · ${evaluation.releasedCars} cars released.`
          : pt ? "Inicie o aprendizado para observar as duas tabelas de valores de ação mudarem." : "Start learning to watch both action-value tables change.";

  return (
    <section
      className={`${styles.lab} ${styles.learningLab} ${styles.trafficLearningLab}`}
      data-locale={locale}
      aria-label={pt ? `Playground de aprendizado com ${aligned ? "atraso combinado" : "proxy de velocidade da rodovia"}` : `${aligned ? "Combined-delay" : "Highway-speed proxy"} learning playground`}
      data-training-model="live-q-learning"
    >
      <header className={styles.learningHeader}>
        <div>
          <p className={styles.kicker}>{pt ? "Controle de tráfego" : "Traffic control"} · MDP 3</p>
          <h3>{pt ? "Quem pode avançar?" : "Who gets to move?"}</h3>
        </div>
        <p className={styles.learningReward}>
          {pt ? "Recompensa vista pelo controlador" : "Reward seen by the controller"}
          <strong>
            {aligned
              ? pt ? "−(fila da rampa + 0,5 × atraso da rodovia)" : "−(ramp queue + 0.5 × highway delay)"
              : pt ? "velocidade normalizada da rodovia" : "normalized highway speed"}
          </strong>
        </p>
      </header>

      <div className={styles.learningStage}>
        <div className={styles.learningBoardColumn}>
          <TrafficLearningScene
            previousState={scenePreviousState}
            state={sceneState}
            action={sceneAction}
            event={sceneEvent}
            exploring={
              mode === "training" && Boolean(trainingStep?.exploring)
            }
            locale={locale}
          />
        </div>

        <aside
          className={styles.learningPanel}
          aria-label={pt ? "Controles e progresso do aprendizado" : "Learning controls and progress"}
        >
          <div className={styles.learningStatus} aria-live="polite">
            <span>{status}</span>
            <strong>{episodes.toLocaleString(numberLocale)} {pt ? "episódios" : "episodes"}</strong>
          </div>

          <div className={styles.trafficLearningMetrics}>
            <div>
              <span>{pt ? "Fila" : "Queue"}</span>
              <strong>
                {sceneState.queue}/{TRAFFIC_CONFIG.maxQueue}
              </strong>
            </div>
            <div>
              <span>{pt ? "Congestionamento" : "Congestion"}</span>
              <strong>{sceneState.congestion}</strong>
            </div>
            <div>
              <span>{pt ? "Ação" : "Action"}</span>
              <strong>
                {sceneAction === null
                  ? "—"
                  : pt
                    ? TRAFFIC_ACTIONS[sceneAction].name === "hold" ? "reter" : "liberar"
                    : TRAFFIC_ACTIONS[sceneAction].name}
              </strong>
            </div>
          </div>

          <p className={styles.srOnly} aria-live="polite">
            {eventText}
          </p>

          <p className={styles.trafficEpsilon}>
            {pt ? "Exploração" : "Exploration"} ε <strong>{pt ? currentEpsilon.toFixed(2).replace(".", ",") : currentEpsilon.toFixed(2)}</strong>
          </p>

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
                  : mode === "complete"
                    ? pt ? "Treinar novamente" : "Train again"
                    : pt ? "Treinar por 5.000 episódios" : "Train 5,000 episodes"}
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
              {pt ? "Executar episódio de 120 passos" : "Run 120-step episode"}
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

      <TrafficQTables
        qValues={currentQValues}
        activeState={qActiveState}
        chosenAction={chosenAction}
        updatedAction={updatedAction}
        locale={locale}
      />

      <p className={styles.learningTakeaway}>
        {mode === "complete" && evaluation ? (
          aligned ? (
            pt ? <>
              O controlador liberou <strong>{evaluation.releasedCars} carros</strong>,
              mantendo a fila média da rampa em{" "}
              <strong>{compactNumber(evaluation.averageQueue, 2, locale)}</strong>,
              enquanto aceitava uma velocidade média de{" "}
              <strong>{Math.round(evaluation.averageHighwaySpeed * 100)}%</strong>
              na rodovia. Agora, as duas fontes de atraso afetam qual ação vence.
            </> : <>
              The controller released{" "}
              <strong>{evaluation.releasedCars} cars</strong>, keeping the mean
              ramp queue at{" "}
              <strong>
                {compactNumber(evaluation.averageQueue, 2)}
              </strong>{" "}
              while accepting a mean highway speed of{" "}
              <strong>
                {Math.round(evaluation.averageHighwaySpeed * 100)}%
              </strong>
              . Both sources of delay now affect which action wins.
            </>
          ) : (
            pt ? <>
              O controlador manteve a velocidade da rodovia em{" "}
              <strong>{Math.round(evaluation.averageHighwaySpeed * 100)}%</strong>
              liberando <strong>{evaluation.releasedCars} carros</strong>. A rampa
              encheu, e <strong>{evaluation.overflows} chegadas posteriores excederam
              sua capacidade</strong> — resultados que essa recompensa nunca considera.
            </> : <>
              The controller kept highway speed at{" "}
              <strong>
                {Math.round(evaluation.averageHighwaySpeed * 100)}%
              </strong>{" "}
              by releasing <strong>{evaluation.releasedCars} cars</strong>.
              The ramp filled and{" "}
              <strong>{evaluation.overflows} later arrivals overflowed</strong>
              —outcomes this reward never counts.
            </>
          )
        ) : (
          pt ? "As chegadas, a dinâmica do tráfego e a regra de aprendizado permanecem iguais. Apenas a recompensa muda." : "The arrivals, traffic dynamics, and learning rule stay fixed. Only the reward changes."
        )}
      </p>
    </section>
  );
}

export function TrafficProxyPlayground({ locale = "en" }: { locale?: RhLocale }) {
  return <TrafficLearningPlayground rewardMode="proxy" locale={locale} />;
}

export function TrafficAlignedPlayground({ locale = "en" }: { locale?: RhLocale }) {
  return <TrafficLearningPlayground rewardMode="aligned" locale={locale} />;
}
