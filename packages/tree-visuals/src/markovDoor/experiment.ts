export type DoorObservationMode = "position" | "memory";
export type DoorAction = 0 | 1 | 2 | 3;
export type DoorOutcome = "goal" | "timeout" | null;

export interface DoorTrueState {
  x: number;
  hasKey: boolean;
  rolloutStep: number;
  done: boolean;
  outcome: DoorOutcome;
}

export interface DoorStep {
  state: DoorTrueState;
  reward: number;
  done: boolean;
  outcome: DoorOutcome;
}

export interface DoorCurvePoint {
  episode: number;
  successRate: number;
}

export interface DoorTrainingResult {
  mode: DoorObservationMode;
  curve: DoorCurvePoint[];
  qSnapshots: Float64Array[];
  qValues: Float64Array;
  finalSuccessRate: number;
  episodes: number;
}

export interface DoorTrainingOptions {
  episodes: number;
  evaluationInterval: number;
  learningRate: number;
  discount: number;
  epsilonStart: number;
  epsilonEnd: number;
  epsilonDecayEpisodes: number;
  seed: number;
}

export const MARKOV_DOOR = Object.freeze({
  columns: 9,
  rows: 5,
  corridorY: 2,
  firstX: 1,
  lastX: 7,
  startX: 4,
  keyX: 1,
  doorX: 6,
  goalX: 7,
  actionCount: 4,
  maxSteps: 24,
});

export const DEFAULT_DOOR_TRAINING: Readonly<DoorTrainingOptions> = Object.freeze({
  episodes: 3_000,
  evaluationInterval: 150,
  learningRate: 0.22,
  discount: 0.98,
  epsilonStart: 1,
  epsilonEnd: 0.04,
  epsilonDecayEpisodes: 1_800,
  seed: 19,
});

/** Deterministic PRNG so every reader sees the same computed experiment. */
export function doorRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function createDoorEpisode(): DoorTrueState {
  return {
    x: MARKOV_DOOR.startX,
    hasKey: false,
    rolloutStep: 0,
    done: false,
    outcome: null,
  };
}

export function stepMarkovDoor(
  state: DoorTrueState,
  action: DoorAction,
): DoorStep {
  if (state.done) {
    return { state, reward: 0, done: true, outcome: state.outcome };
  }

  const horizontalMove = action === 1 ? 1 : action === 3 ? -1 : 0;
  const candidateX = Math.min(
    MARKOV_DOOR.lastX,
    Math.max(MARKOV_DOOR.firstX, state.x + horizontalMove),
  );
  const blockedByDoor =
    !state.hasKey && state.x < MARKOV_DOOR.doorX && candidateX >= MARKOV_DOOR.doorX;
  const x = blockedByDoor ? state.x : candidateX;
  const hasKey = state.hasKey || x === MARKOV_DOOR.keyX;
  const rolloutStep = state.rolloutStep + 1;
  const reachedGoal = x === MARKOV_DOOR.goalX;
  const done = reachedGoal;
  const outcome: DoorOutcome = reachedGoal ? "goal" : null;
  const reward = reachedGoal ? 1 : -0.01;

  return {
    state: { x, hasKey, rolloutStep, done, outcome },
    reward,
    done,
    outcome,
  };
}

/** Mark an unsuccessful visualization rollout without changing the MDP dynamics. */
export function applyDoorRolloutLimit(state: DoorTrueState): DoorTrueState {
  if (state.done || state.rolloutStep < MARKOV_DOOR.maxSteps) return state;
  return { ...state, done: true, outcome: "timeout" };
}

export function doorObservationCount(mode: DoorObservationMode) {
  const positions = MARKOV_DOOR.lastX - MARKOV_DOOR.firstX + 1;
  return mode === "position" ? positions : positions * 2;
}

export function doorObservationIndex(
  state: Pick<DoorTrueState, "x" | "hasKey">,
  mode: DoorObservationMode,
) {
  const position = state.x - MARKOV_DOOR.firstX;
  return mode === "position" ? position : position * 2 + Number(state.hasKey);
}

function greedyAction(
  qValues: Float64Array,
  stateIndex: number,
  random?: () => number,
): DoorAction {
  const offset = stateIndex * MARKOV_DOOR.actionCount;
  const values = Array.from(
    qValues.slice(offset, offset + MARKOV_DOOR.actionCount),
  );
  const bestValue = Math.max(...values);
  const ties = ([3, 1, 0, 2] as const).filter(
    (action) => Math.abs(values[action] - bestValue) <= 1e-12,
  );
  return random ? ties[Math.floor(random() * ties.length)] : ties[0];
}

function trainEpisode(
  qValues: Float64Array,
  mode: DoorObservationMode,
  epsilon: number,
  random: () => number,
  learningRate: number,
  discount: number,
) {
  let state = createDoorEpisode();
  for (let interaction = 0; interaction < MARKOV_DOOR.maxSteps && !state.done; interaction += 1) {
    const stateIndex = doorObservationIndex(state, mode);
    const action = random() < epsilon
      ? (Math.floor(random() * MARKOV_DOOR.actionCount) as DoorAction)
      : greedyAction(qValues, stateIndex, random);
    const result = stepMarkovDoor(state, action);
    const offset = stateIndex * MARKOV_DOOR.actionCount + action;
    const nextIndex = doorObservationIndex(result.state, mode);
    const nextOffset = nextIndex * MARKOV_DOOR.actionCount;
    const bestNext = result.done
      ? 0
      : Math.max(...qValues.slice(nextOffset, nextOffset + MARKOV_DOOR.actionCount));
    const target = result.reward + discount * bestNext;
    qValues[offset] += learningRate * (target - qValues[offset]);
    state = result.state;
  }
}

export function doorPolicyAction(
  qValues: Float64Array,
  mode: DoorObservationMode,
  state: DoorTrueState,
) {
  return greedyAction(qValues, doorObservationIndex(state, mode));
}

export function runDoorPolicy(
  qValues: Float64Array,
  mode: DoorObservationMode,
) {
  let state = createDoorEpisode();
  for (let interaction = 0; interaction < MARKOV_DOOR.maxSteps && !state.done; interaction += 1) {
    state = stepMarkovDoor(state, doorPolicyAction(qValues, mode, state)).state;
  }
  return state.outcome === "goal";
}

export function evaluateDoorPolicy(
  qValues: Float64Array,
  mode: DoorObservationMode,
) {
  return runDoorPolicy(qValues, mode) ? 1 : 0;
}

export function trainMarkovDoor(
  mode: DoorObservationMode,
  overrides: Partial<DoorTrainingOptions> = {},
): DoorTrainingResult {
  const options = { ...DEFAULT_DOOR_TRAINING, ...overrides };
  const random = doorRandom(options.seed);
  const qValues = new Float64Array(
    doorObservationCount(mode) * MARKOV_DOOR.actionCount,
  );
  const curve: DoorCurvePoint[] = [
    { episode: 0, successRate: evaluateDoorPolicy(qValues, mode) },
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
    if (episode % options.evaluationInterval === 0 || episode === options.episodes) {
      curve.push({
        episode,
        successRate: evaluateDoorPolicy(qValues, mode),
      });
      qSnapshots.push(new Float64Array(qValues));
    }
  }

  return {
    mode,
    curve,
    qSnapshots,
    qValues,
    finalSuccessRate: curve[curve.length - 1].successRate,
    episodes: options.episodes,
  };
}

export function trainDoorPair(
  overrides: Partial<DoorTrainingOptions> = {},
) {
  return {
    position: trainMarkovDoor("position", overrides),
    memory: trainMarkovDoor("memory", overrides),
  };
}
