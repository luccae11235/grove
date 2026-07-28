/**
 * MDP 1 — checkpoint repetition.
 *
 * Human objective: complete a lap S -> C1 -> C2 -> C3 -> C4 -> S.
 * Aligned reward credits only the *next expected* checkpoint.
 * Proxy reward credits *any* checkpoint entry, which makes a two-cell loop
 * around C1 more valuable than finishing the lap.
 */

import {
  createTabularTrainer,
  finishTraining,
  greedyAction,
  seededRandom,
  trainWithSnapshots,
  type RewardMode,
  type TrainingOptions,
} from "./engine";

export interface Position {
  x: number;
  y: number;
}

export interface CheckpointState {
  position: Position;
  nextCheckpoint: number;
}

export const CHECKPOINT_ACTIONS = [
  { name: "up", label: "↑", dx: 0, dy: -1 },
  { name: "right", label: "→", dx: 1, dy: 0 },
  { name: "down", label: "↓", dx: 0, dy: 1 },
  { name: "left", label: "←", dx: -1, dy: 0 },
] as const;

export const CHECKPOINT_TRAINING: TrainingOptions = {
  episodes: 2_000,
  maxSteps: 90,
  learningRate: 0.18,
  discount: 0.97,
  epsilonStart: 1,
  epsilonEnd: 0.04,
  seed: 7,
};

export const CHECKPOINT_LAYOUT = {
  width: 7,
  height: 7,
  start: { x: 1, y: 1 } as Position,
  checkpoints: [
    { x: 2, y: 1 },
    { x: 5, y: 1 },
    { x: 5, y: 5 },
    { x: 1, y: 5 },
  ] as Position[],
  walls: [
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
  ] as Position[],
};

const STEP_COST = -0.01;
const CHECKPOINT_REWARD = 1;
const FINISH_REWARD = 10;

export const positionKey = (position: Position) => `${position.x},${position.y}`;

export interface CheckpointEnvironment {
  width: number;
  height: number;
  start: Position;
  checkpoints: Position[];
  walls: Set<string>;
}

export function createEnvironment(layout: {
  width: number;
  height: number;
  start: Position;
  checkpoints: Position[];
  walls?: Position[];
}): CheckpointEnvironment {
  return {
    width: layout.width,
    height: layout.height,
    start: { ...layout.start },
    checkpoints: layout.checkpoints.map((checkpoint) => ({ ...checkpoint })),
    walls: new Set((layout.walls ?? []).map(positionKey)),
  };
}

/** True when a cell is free for a checkpoint to occupy. */
export function isPlaceable(
  environment: CheckpointEnvironment,
  position: Position,
  checkpointIndex: number,
): boolean {
  if (
    position.x < 0 ||
    position.x >= environment.width ||
    position.y < 0 ||
    position.y >= environment.height
  ) {
    return false;
  }
  const key = positionKey(position);
  if (environment.walls.has(key)) return false;
  if (key === positionKey(environment.start)) return false;
  return !environment.checkpoints.some(
    (checkpoint, index) =>
      index !== checkpointIndex && positionKey(checkpoint) === key,
  );
}

export function initialState(environment: CheckpointEnvironment): CheckpointState {
  return { position: { ...environment.start }, nextCheckpoint: 0 };
}

function shortestPath(
  environment: CheckpointEnvironment,
  start: Position,
  target: Position,
): Position[] {
  const startKey = positionKey(start);
  const targetKey = positionKey(target);
  const queue: Position[] = [{ ...start }];
  const previous = new Map<string, Position | null>([[startKey, null]]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const position = queue[cursor];
    if (positionKey(position) === targetKey) break;

    for (const action of CHECKPOINT_ACTIONS) {
      const candidate = {
        x: position.x + action.dx,
        y: position.y + action.dy,
      };
      const key = positionKey(candidate);
      if (
        candidate.x < 0 ||
        candidate.x >= environment.width ||
        candidate.y < 0 ||
        candidate.y >= environment.height ||
        environment.walls.has(key) ||
        previous.has(key)
      ) {
        continue;
      }
      previous.set(key, position);
      queue.push(candidate);
    }
  }

  if (!previous.has(targetKey)) {
    throw new Error(`Checkpoint target ${targetKey} is unreachable.`);
  }

  const path: Position[] = [];
  let current: Position | null = target;
  while (current) {
    path.push({ ...current });
    current = previous.get(positionKey(current)) ?? null;
  }
  return path.reverse();
}

/**
 * Returns the shortest reference lap through the ordered checkpoints and back
 * to the start. This is a route-planning baseline, not a learned policy.
 */
export function optimalCheckpointTrajectory(
  environment: CheckpointEnvironment,
): Position[] {
  const trajectory: Position[] = [{ ...environment.start }];
  let current = environment.start;

  for (const target of [...environment.checkpoints, environment.start]) {
    const segment = shortestPath(environment, current, target);
    trajectory.push(...segment.slice(1));
    current = target;
  }

  return trajectory;
}

export function stateIndex(
  environment: CheckpointEnvironment,
  state: CheckpointState,
): number {
  const positionIndex = state.position.y * environment.width + state.position.x;
  return (
    positionIndex * (environment.checkpoints.length + 1) + state.nextCheckpoint
  );
}

export interface CheckpointEvent {
  enteredCheckpoint: number;
  madeProgress: boolean;
  completedLap: boolean;
  blocked: boolean;
}

export function transition(
  environment: CheckpointEnvironment,
  state: CheckpointState,
  actionIndex: number,
  rewardMode: RewardMode,
) {
  const action = CHECKPOINT_ACTIONS[actionIndex];
  const candidate = {
    x: state.position.x + action.dx,
    y: state.position.y + action.dy,
  };
  const canMove =
    candidate.x >= 0 &&
    candidate.x < environment.width &&
    candidate.y >= 0 &&
    candidate.y < environment.height &&
    !environment.walls.has(positionKey(candidate));
  const position = canMove ? candidate : { ...state.position };
  const enteredCell =
    canMove && positionKey(position) !== positionKey(state.position);
  const checkpointIndex = enteredCell
    ? environment.checkpoints.findIndex(
        (checkpoint) => positionKey(checkpoint) === positionKey(position),
      )
    : -1;
  const madeProgress = checkpointIndex === state.nextCheckpoint;
  const nextCheckpoint = madeProgress
    ? state.nextCheckpoint + 1
    : state.nextCheckpoint;
  const completedLap =
    enteredCell &&
    positionKey(position) === positionKey(environment.start) &&
    nextCheckpoint === environment.checkpoints.length;

  let reward = STEP_COST;
  // The proxy pays for ANY checkpoint entry; the aligned reward pays only for
  // the next expected one. This single line is the whole experiment.
  if (rewardMode === "proxy" && checkpointIndex >= 0) reward += CHECKPOINT_REWARD;
  if (rewardMode === "aligned" && madeProgress) reward += CHECKPOINT_REWARD;
  if (rewardMode === "aligned" && completedLap) reward += FINISH_REWARD;

  return {
    state: { position, nextCheckpoint },
    reward,
    done: completedLap,
    event: {
      enteredCheckpoint: checkpointIndex,
      madeProgress,
      completedLap,
      blocked: !canMove,
    } satisfies CheckpointEvent,
  };
}

function model(environment: CheckpointEnvironment) {
  return {
    stateCount:
      environment.width *
      environment.height *
      (environment.checkpoints.length + 1),
    actionCount: CHECKPOINT_ACTIONS.length,
    initialState: () => initialState(environment),
    stateIndex: (state: CheckpointState) => stateIndex(environment, state),
    transition: (
      state: CheckpointState,
      action: number,
      mode: RewardMode,
    ) => transition(environment, state, action, mode),
  };
}

export function trainCheckpointAgent(
  environment: CheckpointEnvironment,
  rewardMode: RewardMode,
  overrides: Partial<TrainingOptions> = {},
): Float64Array {
  const options = { ...CHECKPOINT_TRAINING, ...overrides };
  return finishTraining(
    createTabularTrainer(model(environment), rewardMode, options),
  );
}

export function trainCheckpointSnapshots(
  environment: CheckpointEnvironment,
  rewardMode: RewardMode,
  snapshotEpisodes: readonly number[],
  overrides: Partial<TrainingOptions> = {},
) {
  const options = { ...CHECKPOINT_TRAINING, ...overrides };
  return trainWithSnapshots(
    model(environment),
    rewardMode,
    options,
    snapshotEpisodes,
  );
}

export interface CheckpointEvaluation {
  reward: number;
  completedLap: boolean;
  checkpointEntries: number;
  repeatedEntries: number;
  steps: number;
  trajectory: Position[];
  actions: number[];
}

/**
 * Runs the greedy policy. The optimized score (reward) is reported separately
 * from the human outcome (completedLap) on purpose.
 */
export function evaluateCheckpointPolicy(
  environment: CheckpointEnvironment,
  qValues: Float64Array,
  rewardMode: RewardMode,
  options: { maxSteps?: number; seed?: number } = {},
): CheckpointEvaluation {
  const maxSteps = options.maxSteps ?? CHECKPOINT_TRAINING.maxSteps;
  const random = seededRandom(options.seed ?? 1_337);
  let state = initialState(environment);
  let reward = 0;
  let checkpointEntries = 0;
  let repeatedEntries = 0;
  let completedLap = false;
  const firstVisits = new Set<number>();
  const trajectory: Position[] = [{ ...state.position }];
  const actions: number[] = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const offset = stateIndex(environment, state) * CHECKPOINT_ACTIONS.length;
    const action = greedyAction(
      qValues,
      offset,
      CHECKPOINT_ACTIONS.length,
      random,
    );
    const result = transition(environment, state, action, rewardMode);
    actions.push(action);
    trajectory.push({ ...result.state.position });
    reward += result.reward;
    if (result.event.enteredCheckpoint >= 0) {
      checkpointEntries += 1;
      if (firstVisits.has(result.event.enteredCheckpoint)) repeatedEntries += 1;
      firstVisits.add(result.event.enteredCheckpoint);
    }
    state = result.state;
    if (result.done) {
      completedLap = true;
      break;
    }
  }

  return {
    reward,
    completedLap,
    checkpointEntries,
    repeatedEntries,
    steps: actions.length,
    trajectory,
    actions,
  };
}
