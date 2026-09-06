export type PongObservationMode = "position" | "velocity";
export type PongAction = 0 | 1 | 2;
export type PongDirection = -1 | 1;
export type PongOutcome = "hit" | "miss" | null;

export interface PongTrueState {
  ballX: number;
  ballY: number;
  ballVx: PongDirection;
  ballVy: PongDirection;
  paddleX: number;
  rolloutStep: number;
  done: boolean;
  outcome: PongOutcome;
}

export interface PongStep {
  state: PongTrueState;
  reward: number;
  done: boolean;
  outcome: PongOutcome;
}

export interface PongCurvePoint {
  episode: number;
  hitRate: number;
}

export interface PongTrainingResult {
  mode: PongObservationMode;
  curve: PongCurvePoint[];
  qSnapshots: Float64Array[];
  qValues: Float64Array;
  finalHitRate: number;
  episodes: number;
}

export interface PongPairResult {
  position: PongTrainingResult;
  velocity: PongTrainingResult;
}

export interface PongTrainingOptions {
  episodes: number;
  evaluationInterval: number;
  successfulReturnsPerEpisode: number;
  learningRate: number;
  discount: number;
  epsilonStart: number;
  epsilonEnd: number;
  epsilonDecayEpisodes: number;
  seed: number;
}

export const MARKOV_PONG = Object.freeze({
  columns: 11,
  rows: 9,
  paddleStart: 5,
  actionCount: 3,
});

export const DEFAULT_PONG_TRAINING: Readonly<PongTrainingOptions> = Object.freeze({
  episodes: 5_000,
  evaluationInterval: 250,
  successfulReturnsPerEpisode: 3,
  learningRate: 0.2,
  discount: 0.98,
  epsilonStart: 1,
  epsilonEnd: 0.03,
  epsilonDecayEpisodes: 2_500,
  seed: 34,
});

/** Deterministic PRNG so every reader sees the same real experiment. */
export function pongRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function createPongEpisode(
  ballX: number,
  ballY: number,
  ballVx: PongDirection,
  ballVy: PongDirection,
): PongTrueState {
  return {
    ballX,
    ballY,
    ballVx,
    ballVy,
    paddleX: MARKOV_PONG.paddleStart,
    rolloutStep: 0,
    done: false,
    outcome: null,
  };
}

export function samplePongEpisode(random: () => number): PongTrueState {
  return createPongEpisode(
    Math.floor(random() * MARKOV_PONG.columns),
    Math.floor(random() * 4),
    random() < 0.5 ? -1 : 1,
    random() < 0.5 ? -1 : 1,
  );
}

/** All starts used by evaluation: 11 x positions × 4 y positions × 4 velocities. */
export function enumeratePongStarts(): PongTrueState[] {
  const starts: PongTrueState[] = [];
  for (let ballX = 0; ballX < MARKOV_PONG.columns; ballX += 1) {
    for (let ballY = 0; ballY < 4; ballY += 1) {
      for (const ballVx of [-1, 1] as const) {
        for (const ballVy of [-1, 1] as const) {
          starts.push(createPongEpisode(ballX, ballY, ballVx, ballVy));
        }
      }
    }
  }
  return starts;
}

export function stepMarkovPong(
  state: PongTrueState,
  action: PongAction,
): PongStep {
  if (state.done) {
    return { state, reward: 0, done: true, outcome: state.outcome };
  }

  const paddleX = Math.min(
    MARKOV_PONG.columns - 1,
    Math.max(0, state.paddleX + action - 1),
  );
  let ballX = state.ballX + state.ballVx;
  let ballY = state.ballY + state.ballVy;
  let ballVx = state.ballVx;
  let ballVy = state.ballVy;

  if (ballX < 0 || ballX >= MARKOV_PONG.columns) {
    ballVx = -ballVx as PongDirection;
    ballX = ballX < 0 ? 1 : MARKOV_PONG.columns - 2;
  }
  if (ballY < 0) {
    ballVy = 1;
    ballY = 1;
  }

  const rolloutStep = state.rolloutStep + 1;
  const reachedPaddle = ballY >= MARKOV_PONG.rows - 1;
  if (reachedPaddle) {
    const hit = ballX === paddleX;
    const outcome: PongOutcome = hit ? "hit" : "miss";
    if (hit) ballVy = -1;
    const next: PongTrueState = {
      ballX,
      ballY: Math.min(MARKOV_PONG.rows - 1, ballY),
      ballVx,
      ballVy,
      paddleX,
      rolloutStep,
      done: true,
      outcome,
    };
    return { state: next, reward: hit ? 1 : -1, done: true, outcome };
  }

  const next: PongTrueState = {
    ballX,
    ballY,
    ballVx,
    ballVy,
    paddleX,
    rolloutStep,
    done: false,
    outcome: null,
  };
  return { state: next, reward: 0, done: false, outcome: null };
}

/** Continue the same physical rally after a successful paddle contact. */
export function continuePongRally(state: PongTrueState): PongTrueState {
  if (!state.done || state.outcome !== "hit") return state;
  return {
    ...state,
    ballVy: -1,
    rolloutStep: 0,
    done: false,
    outcome: null,
  };
}

export function pongObservationCount(mode: PongObservationMode) {
  const base = MARKOV_PONG.columns * MARKOV_PONG.rows * MARKOV_PONG.columns;
  return mode === "position" ? base : base * 4;
}

export function pongObservationIndex(
  state: PongTrueState,
  mode: PongObservationMode,
) {
  let index =
    (state.ballY * MARKOV_PONG.columns + state.ballX) * MARKOV_PONG.columns +
    state.paddleX;
  if (mode === "velocity") {
    const vx = state.ballVx < 0 ? 0 : 1;
    const vy = state.ballVy < 0 ? 0 : 1;
    index = index * 4 + vy * 2 + vx;
  }
  return index;
}

function greedyAction(
  qValues: Float64Array,
  stateIndex: number,
  random?: () => number,
): PongAction {
  const offset = stateIndex * MARKOV_PONG.actionCount;
  const values = [qValues[offset], qValues[offset + 1], qValues[offset + 2]];
  const bestValue = Math.max(...values);
  const ties = ([1, 0, 2] as const).filter(
    (action) => Math.abs(values[action] - bestValue) <= 1e-12,
  );
  return random ? ties[Math.floor(random() * ties.length)] : ties[0];
}

function trainEpisode(
  qValues: Float64Array,
  mode: PongObservationMode,
  initialState: PongTrueState,
  epsilon: number,
  random: () => number,
  learningRate: number,
  discount: number,
  successfulReturnsPerEpisode: number,
) {
  let state = initialState;
  let successfulReturns = 0;
  while (true) {
    const stateIndex = pongObservationIndex(state, mode);
    const action =
      random() < epsilon
        ? (Math.floor(random() * MARKOV_PONG.actionCount) as PongAction)
        : greedyAction(qValues, stateIndex, random);
    const result = stepMarkovPong(state, action);
    if (result.outcome === "hit") successfulReturns += 1;
    const episodeDone =
      result.outcome === "miss" ||
      successfulReturns >= successfulReturnsPerEpisode;
    const nextState = result.outcome === "hit"
      ? continuePongRally(result.state)
      : result.state;
    const offset = stateIndex * MARKOV_PONG.actionCount + action;
    const nextIndex = pongObservationIndex(nextState, mode);
    const nextOffset = nextIndex * MARKOV_PONG.actionCount;
    const bestNext = episodeDone
      ? 0
      : Math.max(
          qValues[nextOffset],
          qValues[nextOffset + 1],
          qValues[nextOffset + 2],
        );
    const target = result.reward + discount * bestNext;
    qValues[offset] += learningRate * (target - qValues[offset]);
    if (episodeDone) break;
    state = nextState;
  }
}

export function pongPolicyAction(
  qValues: Float64Array,
  mode: PongObservationMode,
  state: PongTrueState,
) {
  return greedyAction(qValues, pongObservationIndex(state, mode));
}

export function runPongPolicy(
  qValues: Float64Array,
  mode: PongObservationMode,
  initialState: PongTrueState,
) {
  let state = { ...initialState };
  while (!state.done) {
    state = stepMarkovPong(state, pongPolicyAction(qValues, mode, state)).state;
  }
  return state.outcome === "hit";
}

export function evaluatePongPolicy(
  qValues: Float64Array,
  mode: PongObservationMode,
  starts: readonly PongTrueState[] = enumeratePongStarts(),
) {
  let hits = 0;
  for (const start of starts) {
    if (runPongPolicy(qValues, mode, start)) hits += 1;
  }
  return hits / starts.length;
}

export function trainMarkovPong(
  mode: PongObservationMode,
  overrides: Partial<PongTrainingOptions> = {},
): PongTrainingResult {
  const options = { ...DEFAULT_PONG_TRAINING, ...overrides };
  const launchRandom = pongRandom(options.seed);
  const exploreRandom = pongRandom(options.seed + 10_007);
  const starts = Array.from({ length: options.episodes }, () =>
    samplePongEpisode(launchRandom),
  );
  const evaluationStarts = enumeratePongStarts();
  const qValues = new Float64Array(
    pongObservationCount(mode) * MARKOV_PONG.actionCount,
  );
  const curve: PongCurvePoint[] = [
    { episode: 0, hitRate: evaluatePongPolicy(qValues, mode, evaluationStarts) },
  ];
  const qSnapshots: Float64Array[] = [new Float64Array(qValues)];

  for (let episode = 1; episode <= options.episodes; episode += 1) {
    const decayProgress = Math.min(
      1,
      (episode - 1) / Math.max(1, options.epsilonDecayEpisodes - 1),
    );
    const epsilon =
      options.epsilonStart * (1 - decayProgress) +
      options.epsilonEnd * decayProgress;
    trainEpisode(
      qValues,
      mode,
      starts[episode - 1],
      epsilon,
      exploreRandom,
      options.learningRate,
      options.discount,
      options.successfulReturnsPerEpisode,
    );
    if (episode % options.evaluationInterval === 0 || episode === options.episodes) {
      curve.push({
        episode,
        hitRate: evaluatePongPolicy(qValues, mode, evaluationStarts),
      });
      qSnapshots.push(new Float64Array(qValues));
    }
  }

  return {
    mode,
    curve,
    qSnapshots,
    qValues,
    finalHitRate: curve[curve.length - 1].hitRate,
    episodes: options.episodes,
  };
}

export function trainPongPair(
  overrides: Partial<PongTrainingOptions> = {},
): PongPairResult {
  return {
    position: trainMarkovPong("position", overrides),
    velocity: trainMarkovPong("velocity", overrides),
  };
}
