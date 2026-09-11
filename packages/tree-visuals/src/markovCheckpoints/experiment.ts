export type CheckpointObservationMode = "position" | "progress";
export type CheckpointAction = 0 | 1 | 2 | 3;
export type CheckpointOutcome = "complete" | "timeout" | null;

export interface CheckpointTrueState {
  x: number;
  y: number;
  nextCheckpoint: number;
  rolloutStep: number;
  done: boolean;
  outcome: CheckpointOutcome;
  reward: number;
}

export interface CheckpointStep {
  state: CheckpointTrueState;
  reward: number;
  done: boolean;
  outcome: CheckpointOutcome;
  enteredCheckpoint: number | null;
  correctCheckpoint: boolean;
}

export interface CheckpointCurvePoint {
  episode: number;
  completionRate: number;
}

export interface CheckpointTrainingResult {
  mode: CheckpointObservationMode;
  curve: CheckpointCurvePoint[];
  qSnapshots: Float64Array[];
  qValues: Float64Array;
  finalCompletionRate: number;
  episodes: number;
}

export interface CheckpointTrainingOptions {
  episodes: number;
  evaluationInterval: number;
  learningRate: number;
  discount: number;
  epsilonStart: number;
  epsilonEnd: number;
  epsilonDecayEpisodes: number;
  seed: number;
}

export const MARKOV_CHECKPOINTS = Object.freeze({
  columns: 7,
  rows: 5,
  hubX: 3,
  hubY: 2,
  actionCount: 4,
  maxSteps: 42,
  checkpoints: Object.freeze([
    Object.freeze({ label: "A", x: 0, y: 2 }),
    Object.freeze({ label: "B", x: 3, y: 0 }),
    Object.freeze({ label: "C", x: 6, y: 2 }),
  ]),
});

export const DEFAULT_CHECKPOINT_TRAINING: Readonly<CheckpointTrainingOptions> = Object.freeze({
  episodes: 4_000,
  evaluationInterval: 200,
  learningRate: 0.24,
  discount: 0.98,
  epsilonStart: 1,
  epsilonEnd: 0.05,
  epsilonDecayEpisodes: 2_800,
  seed: 27,
});

/** Deterministic PRNG so every reader sees the same computed experiment. */
export function checkpointRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function isCheckpointPath(x: number, y: number) {
  const horizontal = y === MARKOV_CHECKPOINTS.hubY;
  const upperArm = x === MARKOV_CHECKPOINTS.hubX && y <= MARKOV_CHECKPOINTS.hubY;
  return horizontal || upperArm;
}

export function createCheckpointEpisode(): CheckpointTrueState {
  return {
    x: MARKOV_CHECKPOINTS.hubX,
    y: MARKOV_CHECKPOINTS.hubY,
    nextCheckpoint: 0,
    rolloutStep: 0,
    done: false,
    outcome: null,
    reward: 0,
  };
}

function checkpointAt(x: number, y: number) {
  const index = MARKOV_CHECKPOINTS.checkpoints.findIndex(
    (checkpoint) => checkpoint.x === x && checkpoint.y === y,
  );
  return index < 0 ? null : index;
}

export function stepMarkovCheckpoint(
  state: CheckpointTrueState,
  action: CheckpointAction,
): CheckpointStep {
  if (state.done) {
    return {
      state,
      reward: 0,
      done: true,
      outcome: state.outcome,
      enteredCheckpoint: null,
      correctCheckpoint: false,
    };
  }

  const dx = action === 1 ? 1 : action === 3 ? -1 : 0;
  const dy = action === 0 ? -1 : action === 2 ? 1 : 0;
  const candidateX = state.x + dx;
  const candidateY = state.y + dy;
  const moved = isCheckpointPath(candidateX, candidateY);
  const x = moved ? candidateX : state.x;
  const y = moved ? candidateY : state.y;
  const enteredCheckpoint = moved ? checkpointAt(x, y) : null;
  const correctCheckpoint = enteredCheckpoint === state.nextCheckpoint;
  const nextCheckpoint = correctCheckpoint
    ? state.nextCheckpoint + 1
    : state.nextCheckpoint;
  const rolloutStep = state.rolloutStep + 1;
  const completed = nextCheckpoint === MARKOV_CHECKPOINTS.checkpoints.length;
  const done = completed;
  const outcome: CheckpointOutcome = completed ? "complete" : null;
  const reward = correctCheckpoint
    ? 1
    : enteredCheckpoint !== null
      ? 0
      : -0.01;

  const nextState: CheckpointTrueState = {
    x,
    y,
    nextCheckpoint,
    rolloutStep,
    done,
    outcome,
    reward,
  };

  return {
    state: nextState,
    reward,
    done,
    outcome,
    enteredCheckpoint,
    correctCheckpoint,
  };
}

/** Mark an unsuccessful visualization rollout without changing the MDP dynamics. */
export function applyCheckpointRolloutLimit(
  state: CheckpointTrueState,
): CheckpointTrueState {
  if (state.done || state.rolloutStep < MARKOV_CHECKPOINTS.maxSteps) return state;
  return { ...state, done: true, outcome: "timeout" };
}

function positionIndex(x: number, y: number) {
  return y * MARKOV_CHECKPOINTS.columns + x;
}

export function checkpointObservationCount(mode: CheckpointObservationMode) {
  const positions = MARKOV_CHECKPOINTS.columns * MARKOV_CHECKPOINTS.rows;
  return mode === "position"
    ? positions
    : positions * MARKOV_CHECKPOINTS.checkpoints.length;
}

export function checkpointObservationIndex(
  state: Pick<CheckpointTrueState, "x" | "y" | "nextCheckpoint">,
  mode: CheckpointObservationMode,
) {
  const position = positionIndex(state.x, state.y);
  return mode === "position"
    ? position
    : position * MARKOV_CHECKPOINTS.checkpoints.length + Math.min(
      state.nextCheckpoint,
      MARKOV_CHECKPOINTS.checkpoints.length - 1,
    );
}

function greedyAction(
  qValues: Float64Array,
  stateIndex: number,
  random?: () => number,
): CheckpointAction {
  const offset = stateIndex * MARKOV_CHECKPOINTS.actionCount;
  const values = Array.from(
    qValues.slice(offset, offset + MARKOV_CHECKPOINTS.actionCount),
  );
  const bestValue = Math.max(...values);
  const ties = ([3, 0, 1, 2] as const).filter(
    (action) => Math.abs(values[action] - bestValue) <= 1e-12,
  );
  return random ? ties[Math.floor(random() * ties.length)] : ties[0];
}

function trainEpisode(
  qValues: Float64Array,
  mode: CheckpointObservationMode,
  epsilon: number,
  random: () => number,
  learningRate: number,
  discount: number,
) {
  let state = createCheckpointEpisode();
  for (
    let interaction = 0;
    interaction < MARKOV_CHECKPOINTS.maxSteps && !state.done;
    interaction += 1
  ) {
    const stateIndex = checkpointObservationIndex(state, mode);
    const action = random() < epsilon
      ? (Math.floor(random() * MARKOV_CHECKPOINTS.actionCount) as CheckpointAction)
      : greedyAction(qValues, stateIndex, random);
    const result = stepMarkovCheckpoint(state, action);
    const offset = stateIndex * MARKOV_CHECKPOINTS.actionCount + action;
    const nextIndex = checkpointObservationIndex(result.state, mode);
    const nextOffset = nextIndex * MARKOV_CHECKPOINTS.actionCount;
    const bestNext = result.done
      ? 0
      : Math.max(...qValues.slice(nextOffset, nextOffset + MARKOV_CHECKPOINTS.actionCount));
    const target = result.reward + discount * bestNext;
    qValues[offset] += learningRate * (target - qValues[offset]);
    state = result.state;
  }
}

export function checkpointPolicyAction(
  qValues: Float64Array,
  mode: CheckpointObservationMode,
  state: CheckpointTrueState,
) {
  return greedyAction(qValues, checkpointObservationIndex(state, mode));
}

export function runCheckpointPolicy(
  qValues: Float64Array,
  mode: CheckpointObservationMode,
) {
  let state = createCheckpointEpisode();
  for (
    let interaction = 0;
    interaction < MARKOV_CHECKPOINTS.maxSteps && !state.done;
    interaction += 1
  ) {
    state = stepMarkovCheckpoint(
      state,
      checkpointPolicyAction(qValues, mode, state),
    ).state;
  }
  return state.outcome === "complete";
}

export function evaluateCheckpointPolicy(
  qValues: Float64Array,
  mode: CheckpointObservationMode,
) {
  return runCheckpointPolicy(qValues, mode) ? 1 : 0;
}

export function trainMarkovCheckpoints(
  mode: CheckpointObservationMode,
  overrides: Partial<CheckpointTrainingOptions> = {},
): CheckpointTrainingResult {
  const options = { ...DEFAULT_CHECKPOINT_TRAINING, ...overrides };
  const random = checkpointRandom(options.seed);
  const qValues = new Float64Array(
    checkpointObservationCount(mode) * MARKOV_CHECKPOINTS.actionCount,
  );
  const curve: CheckpointCurvePoint[] = [
    { episode: 0, completionRate: evaluateCheckpointPolicy(qValues, mode) },
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
      epsilon,
      random,
      options.learningRate,
      options.discount,
    );
    if (
      episode % options.evaluationInterval === 0 ||
      episode === options.episodes
    ) {
      curve.push({
        episode,
        completionRate: evaluateCheckpointPolicy(qValues, mode),
      });
      qSnapshots.push(new Float64Array(qValues));
    }
  }

  return {
    mode,
    curve,
    qSnapshots,
    qValues,
    finalCompletionRate: curve[curve.length - 1].completionRate,
    episodes: options.episodes,
  };
}

export function trainCheckpointPair(
  overrides: Partial<CheckpointTrainingOptions> = {},
) {
  return {
    position: trainMarkovCheckpoints("position", overrides),
    progress: trainMarkovCheckpoints("progress", overrides),
  };
}
