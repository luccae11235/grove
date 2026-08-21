import { useEffect, useId, useReducer, useRef, useState } from "react";
import styles from "./MdpTrajectoryMachine.module.css";

type Phase = "state" | "policy" | "transition" | "reward";
type TokenKind = "state" | "action" | "reward";
type Locale = "en" | "pt-BR";

type TrajectoryToken = {
  id: number;
  kind: TokenKind;
  index: number;
};

const PHASE_ORDER: Phase[] = ["state", "policy", "reward", "transition"];

type MachineState = {
  phase: Phase;
  step: number;
  nextTokenId: number;
  tokens: TrajectoryToken[];
};

const INITIAL_MACHINE_STATE: MachineState = {
  phase: "state",
  step: 0,
  nextTokenId: 1,
  tokens: [{ id: 0, kind: "state", index: 0 }],
};

function advanceMachine(state: MachineState): MachineState {
  const currentIndex = PHASE_ORDER.indexOf(state.phase);
  const phase = PHASE_ORDER[(currentIndex + 1) % PHASE_ORDER.length];
  let step = state.step;
  let nextTokenId = state.nextTokenId;
  let tokens = state.tokens;

  if (phase === "policy") {
    tokens = [...tokens, { id: nextTokenId++, kind: "action", index: step }];
  } else if (phase === "reward") {
    tokens = [...tokens, { id: nextTokenId++, kind: "reward", index: step + 1 }];
  } else if (phase === "transition") {
    step += 1;
    tokens = [...tokens, { id: nextTokenId++, kind: "state", index: step }];
  }

  return { phase, step, nextTokenId, tokens };
}

const PHASE_COPY: Record<Phase, string> = {
  state: "The agent observes the current state.",
  policy: "The policy chooses an action.",
  reward: "The environment returns the reward.",
  transition: "The transition dynamics produce the next state.",
};

const PT_PHASE_COPY: Record<Phase, string> = {
  state: "O agente observa o estado atual.",
  policy: "A política escolhe uma ação.",
  reward: "O ambiente devolve a recompensa.",
  transition: "A dinâmica de transição produz o próximo estado.",
};

const copy = {
  en: {
    kicker: "One interaction at a time",
    title: "Watch the MDP produce a trajectory",
    lede: "Policy and environment take turns. The observations become a sample.",
    pause: "Pause loop",
    continue: "Continue loop",
    run: "Run the loop",
    reset: "Reset",
    paused: "Paused.",
    ready: "Ready.",
    policyAction: "Policy chooses an action",
    agent: "Agent",
    environment: "Environment",
    transition: "Transition",
    reward: "Reward",
    trajectory: "Sampled trajectory",
    observations: "observations",
  },
  "pt-BR": {
    kicker: "Uma interação por vez",
    title: "Observe o MDP produzir uma trajetória",
    lede: "Política e ambiente se alternam. As observações tornam-se uma amostra.",
    pause: "Pausar ciclo",
    continue: "Continuar ciclo",
    run: "Executar o ciclo",
    reset: "Reiniciar",
    paused: "Pausado.",
    ready: "Pronto.",
    policyAction: "A política escolhe uma ação",
    agent: "Agente",
    environment: "Ambiente",
    transition: "Transição",
    reward: "Recompensa",
    trajectory: "Trajetória amostrada",
    observations: "observações",
  },
} as const;

function Token({ token }: { token: TrajectoryToken }) {
  const symbol =
    token.kind === "state" ? "s" : token.kind === "action" ? "a" : "r";

  return (
    <span className={`${styles.token} ${styles[token.kind]}`} data-token-kind={token.kind}>
      <i>{symbol}</i>
      <sub>{token.index}</sub>
    </span>
  );
}

export function MdpTrajectoryMachine({ locale = "en" }: { locale?: Locale }) {
  const strings = copy[locale];
  const phaseCopy = locale === "pt-BR" ? PT_PHASE_COPY : PHASE_COPY;
  const titleId = useId();
  const descriptionId = useId();
  const railRef = useRef<HTMLDivElement>(null);
  const [machine, dispatch] = useReducer(
    (state: MachineState, action: "tick" | "reset") =>
      action === "reset" ? INITIAL_MACHINE_STATE : advanceMachine(state),
    INITIAL_MACHINE_STATE,
  );
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const { phase, tokens } = machine;

  useEffect(() => {
    if (!running) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const interval = reducedMotion ? 1_500 : 1_250;

    const timer = window.setInterval(() => {
      dispatch("tick");
    }, interval);

    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    railRef.current?.scrollTo({
      left: railRef.current.scrollWidth,
      behavior: "smooth",
    });
  }, [tokens]);

  function toggle() {
    setStarted(true);
    setRunning((current) => !current);
  }

  function reset() {
    setRunning(false);
    setStarted(false);
    dispatch("reset");
  }

  const visibleTokens = tokens.slice(-12);

  return (
    <section
      className={styles.lab}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-mdp-trajectory-machine
      data-phase={phase}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{strings.kicker}</p>
          <h3 id={titleId}>{strings.title}</h3>
        </div>
        <p className={styles.lede} id={descriptionId}>
          {strings.lede}
        </p>
      </header>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.primaryButton}
          aria-pressed={running}
          data-mdp-toggle
          onClick={toggle}
        >
          {running ? strings.pause : started ? strings.continue : strings.run}
        </button>
        <button
          type="button"
          className={styles.resetButton}
          disabled={!started && tokens.length === 1}
          onClick={reset}
        >
          {strings.reset}
        </button>
        <span className={styles.status} aria-live="polite">
          {running ? phaseCopy[phase] : started ? strings.paused : strings.ready}
        </span>
      </div>

      <div className={styles.diagram} aria-hidden="true">
        <svg className={styles.flow} viewBox="0 0 720 300" preserveAspectRatio="none">
          <defs>
            <marker
              id={`${titleId}-arrow`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          <path
            className={`${styles.path} ${styles.actionPath} ${phase === "policy" ? styles.activePath : ""}`}
            data-mdp-action-path
            d="M 180 124 L 180 82 Q 180 64 198 64 L 522 64 Q 540 64 540 82 L 540 124"
            markerEnd={`url(#${titleId}-arrow)`}
          />
          <path
            className={`${styles.path} ${styles.responsePath} ${phase === "transition" || phase === "reward" ? styles.activePath : ""}`}
            data-mdp-response-path
            d="M 540 176 L 540 218 Q 540 236 522 236 L 198 236 Q 180 236 180 218 L 180 176"
            markerEnd={`url(#${titleId}-arrow)`}
          />
        </svg>

        <div
          className={`${styles.callout} ${styles.policyCallout} ${phase === "policy" ? styles.activeCallout : ""}`}
          data-mdp-policy-callout
        >
          <strong>{strings.policyAction}</strong>
          <span><i>π</i>(<i>a</i><sub>t</sub> | <i>s</i><sub>t</sub>) → <i>a</i><sub>t</sub></span>
        </div>

        <div className={`${styles.node} ${styles.agent} ${phase === "state" || phase === "policy" ? styles.activeNode : ""}`}>
          {strings.agent}
        </div>
        <div className={`${styles.node} ${styles.environment} ${phase === "transition" || phase === "reward" ? styles.activeNode : ""}`}>
          {strings.environment}
        </div>

        <div className={styles.responseCallouts} data-mdp-response-callouts>
          <div className={`${styles.callout} ${phase === "transition" ? styles.activeCallout : ""}`}>
            <strong>{strings.transition}</strong>
            <span><i>P</i>(<i>s</i><sub>t+1</sub> | <i>s</i><sub>t</sub>, <i>a</i><sub>t</sub>) → <i>s</i><sub>t+1</sub></span>
          </div>
          <div className={`${styles.callout} ${phase === "reward" ? styles.activeCallout : ""}`}>
            <strong>{strings.reward}</strong>
            <span><i>r</i>(<i>s</i><sub>t</sub>, <i>a</i><sub>t</sub>, <i>s</i><sub>t+1</sub>) → <i>r</i><sub>t+1</sub></span>
          </div>
        </div>
      </div>

      <div className={styles.trajectory}>
        <div className={styles.trajectoryLabel}>
          <strong>{strings.trajectory}</strong>
          <span>{tokens.length} {strings.observations}</span>
        </div>
        <div
          className={styles.rail}
          data-mdp-trajectory-rail
          aria-label={strings.trajectory}
          ref={railRef}
        >
          {tokens.length > visibleTokens.length ? <span className={styles.ellipsis}>…</span> : null}
          {visibleTokens.map((token, index) => (
            <span className={styles.tokenGroup} key={token.id}>
              {index > 0 ? <span className={styles.comma}>,</span> : null}
              <Token token={token} />
            </span>
          ))}
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {phaseCopy[phase]} {locale === "pt-BR" ? `A trajetória agora contém ${tokens.length} observações.` : `The trajectory now contains ${tokens.length} observations.`}
      </p>
    </section>
  );
}
