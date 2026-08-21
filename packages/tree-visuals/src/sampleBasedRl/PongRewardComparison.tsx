import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import styles from "./PongRewardComparison.module.css";
import {
  advanceToNextOutcome,
  createPongState,
  PONG_GEOMETRY,
  stepPongState,
  type PongPolicy,
  type PongState,
} from "./pongModel";

const FIXED_STEP = 1 / 120;
const RENDER_INTERVAL = 1 / 30;
type Locale = "en" | "pt-BR";

const copy = {
  en: {
    useful: "Useful",
    weak: "Weak",
    policy: "policy",
    reward: "Reward",
    hits: "hits",
    misses: "misses",
    usefulTitle: "Useful policy",
    weakTitle: "Weak policy",
    predicts: "Predicts landing",
    misleading: "Misleading target",
    action: "Action",
    hit: "+1 · hit",
    miss: "−1 · miss",
    kicker: "Same game · different policies",
    title: "Which policy gathers more reward?",
    lede: "Both agents observe the same state. Their actions create different outcomes.",
    pause: "Pause agents",
    continue: "Continue agents",
    run: "Run both agents",
    reset: "Reset",
    running: "Running in parallel",
    paused: "Paused",
    ready: "Ready",
  },
  "pt-BR": {
    useful: "Útil",
    weak: "Fraca",
    policy: "política",
    reward: "Recompensa",
    hits: "acertos",
    misses: "erros",
    usefulTitle: "Política útil",
    weakTitle: "Política fraca",
    predicts: "Prevê onde a bola chegará",
    misleading: "Segue um alvo enganoso",
    action: "Ação",
    hit: "+1 · acerto",
    miss: "−1 · erro",
    kicker: "Mesmo jogo · políticas diferentes",
    title: "Qual política acumula mais recompensa?",
    lede: "Os dois agentes observam o mesmo estado. Suas ações produzem resultados diferentes.",
    pause: "Pausar agentes",
    continue: "Continuar agentes",
    run: "Executar os dois agentes",
    reset: "Reiniciar",
    running: "Execução em paralelo",
    paused: "Pausado",
    ready: "Pronto",
  },
} as const;

function actionLabel(action: PongState["action"], locale: Locale) {
  if (locale === "en") return action;
  return action === "LEFT" ? "ESQUERDA" : action === "RIGHT" ? "DIREITA" : "PARADA";
}

function signedReward(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

function PongPanel({
  policy,
  state,
  locale,
}: {
  policy: PongPolicy;
  state: PongState;
  locale: Locale;
}) {
  const useful = policy === "useful";
  const strings = copy[locale];
  const outcomeVisible = state.outcome !== null && state.outcomeAge < 0.7;
  const ballStyle = {
    left: `${state.ball.x * 100}%`,
    top: `${(state.ball.y / PONG_GEOMETRY.height) * 100}%`,
  } satisfies CSSProperties;
  const paddleStyle = {
    left: `${state.paddleX * 100}%`,
    width: `${PONG_GEOMETRY.paddleWidth * 100}%`,
  } satisfies CSSProperties;

  return (
    <section
      className={styles.panel}
      data-pong-policy={policy}
      data-reward={state.reward}
      data-hits={state.hits}
      data-misses={state.misses}
      data-action={state.action}
      aria-label={`${useful ? strings.useful : strings.weak} ${strings.policy}: ${strings.reward.toLowerCase()} ${state.reward}, ${state.hits} ${strings.hits}, ${state.misses} ${strings.misses}`}
    >
      <header className={styles.panelHeader}>
        <div>
          <h4>{useful ? strings.usefulTitle : strings.weakTitle}</h4>
          <p>
            {useful
              ? strings.predicts
              : strings.misleading}
          </p>
        </div>
        <p className={styles.reward}>
          {strings.reward}
          <strong>{signedReward(state.reward)}</strong>
        </p>
      </header>

      <div
        className={styles.playfield}
        role="img"
        aria-label={locale === "pt-BR"
          ? `Uma bola se move em um campo de Pong com três lados. A raquete horizontal está se movendo para ${actionLabel(state.action, locale).toLowerCase()}. ${outcomeVisible ? state.outcome === "hit" ? "A raquete acertou a bola e recebeu recompensa mais um." : "A raquete errou a bola e recebeu recompensa menos um." : "A jogada está em andamento."}`
          : `A ball moves inside a three-sided Pong field. The horizontal paddle is moving ${state.action.toLowerCase()}. ${outcomeVisible ? state.outcome === "hit" ? "The paddle hit the ball and received plus one reward." : "The paddle missed the ball and received minus one reward." : "The rally is in progress."}`}
      >
        <span className={styles.ball} style={ballStyle} aria-hidden="true" />
        <span className={styles.paddle} style={paddleStyle} aria-hidden="true" />
        {outcomeVisible ? (
          <span
            className={`${styles.outcome} ${
              state.outcome === "hit" ? styles.hit : styles.miss
            }`}
            data-pong-outcome={state.outcome}
            aria-hidden="true"
          >
            {state.outcome === "hit" ? strings.hit : strings.miss}
          </span>
        ) : null}
      </div>

      <p className={styles.action}>
        <span>{strings.action}</span>
        <strong>{actionLabel(state.action, locale)}</strong>
      </p>
    </section>
  );
}

export function PongRewardComparison({ locale = "en" }: { locale?: Locale }) {
  const strings = copy[locale];
  const titleId = useId();
  const usefulRef = useRef(createPongState());
  const weakRef = useRef(createPongState(0, "weak"));
  const [useful, setUseful] = useState(usefulRef.current);
  const [weak, setWeak] = useState(weakRef.current);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!running) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      const advance = () => {
        usefulRef.current = advanceToNextOutcome(usefulRef.current, "useful");
        weakRef.current = advanceToNextOutcome(weakRef.current, "weak");
        setUseful(usefulRef.current);
        setWeak(weakRef.current);
      };
      const timer = window.setInterval(advance, 900);
      return () => window.clearInterval(timer);
    }

    let frame = 0;
    let lastTime = performance.now();
    let simulationAccumulator = 0;
    let renderAccumulator = 0;

    const animate = (time: number) => {
      const elapsed = Math.min((time - lastTime) / 1_000, 0.05);
      lastTime = time;
      simulationAccumulator += elapsed;
      renderAccumulator += elapsed;

      while (simulationAccumulator >= FIXED_STEP) {
        usefulRef.current = stepPongState(
          usefulRef.current,
          "useful",
          FIXED_STEP,
        );
        weakRef.current = stepPongState(weakRef.current, "weak", FIXED_STEP);
        simulationAccumulator -= FIXED_STEP;
      }

      if (renderAccumulator >= RENDER_INTERVAL) {
        setUseful(usefulRef.current);
        setWeak(weakRef.current);
        renderAccumulator = 0;
      }

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [running]);

  function toggleRunning() {
    setStarted(true);
    setRunning((current) => !current);
  }

  function reset() {
    setRunning(false);
    setStarted(false);
    usefulRef.current = createPongState();
    weakRef.current = createPongState(0, "weak");
    setUseful(usefulRef.current);
    setWeak(weakRef.current);
  }

  const liveSummary = locale === "pt-BR"
    ? `A política útil acumula recompensa ${useful.reward} após ${useful.hits} acertos e ${useful.misses} erros. A política fraca acumula recompensa ${weak.reward} após ${weak.hits} acertos e ${weak.misses} erros.`
    : `Useful policy reward ${useful.reward} after ${useful.hits} hits and ${useful.misses} misses. Weak policy reward ${weak.reward} after ${weak.hits} hits and ${weak.misses} misses.`;

  return (
    <section
      className={styles.lab}
      aria-labelledby={titleId}
      data-pong-reward-lab
    >
      <header className={styles.header}>
        <p className={styles.kicker}>{strings.kicker}</p>
        <h3 id={titleId} data-pong-heading>{strings.title}</h3>
        <p className={styles.lede} data-pong-lede>
          {strings.lede}
        </p>
      </header>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.primaryButton}
          data-pong-toggle
          aria-pressed={running}
          onClick={toggleRunning}
        >
          {running ? strings.pause : started ? strings.continue : strings.run}
        </button>
        <button
          type="button"
          className={styles.resetButton}
          onClick={reset}
          disabled={!started && useful.reward === 0 && weak.reward === 0}
        >
          {strings.reset}
        </button>
        <span className={styles.controlStatus}>
          {running ? strings.running : started ? strings.paused : strings.ready}
        </span>
      </div>

      <div className={styles.panels}>
        <PongPanel policy="useful" state={useful} locale={locale} />
        <PongPanel policy="weak" state={weak} locale={locale} />
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {liveSummary}
      </p>
    </section>
  );
}
