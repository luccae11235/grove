import {
  createTabularTrainer,
  finishTraining,
  greedyAction,
  seededRandom,
} from "./tabular-q-learning.js";

/**
 * The experiment deliberately keeps one environment and one learning algorithm.
 * RewardMode is the only treatment variable in a comparison.
 *
 * @typedef {"proxy" | "aligned"} RewardMode
 * @typedef {{ x: number, y: number }} Position
 * @typedef {{ position: Position, nextCheckpoint: number }} AgentState
 * @typedef {{ width: number, height: number, start: Position, checkpoints: Position[], walls: Set<string> }} Environment
 */

export const ACTIONS = Object.freeze([
  Object.freeze({ name: "up", label: "↑", dx: 0, dy: -1 }),
  Object.freeze({ name: "right", label: "→", dx: 1, dy: 0 }),
  Object.freeze({ name: "down", label: "↓", dx: 0, dy: 1 }),
  Object.freeze({ name: "left", label: "←", dx: -1, dy: 0 }),
]);

export const DEFAULT_TRAINING_OPTIONS = Object.freeze({
  episodes: 2_000,
  maxSteps: 90,
  learningRate: 0.18,
  discount: 0.97,
  epsilonStart: 1,
  epsilonEnd: 0.04,
  seed: 7,
});

export const DEFAULT_LAYOUT = Object.freeze({
  width: 7,
  height: 7,
  start: Object.freeze({ x: 1, y: 1 }),
  checkpoints: Object.freeze([
    Object.freeze({ x: 2, y: 1 }),
    Object.freeze({ x: 5, y: 1 }),
    Object.freeze({ x: 5, y: 5 }),
    Object.freeze({ x: 1, y: 5 }),
  ]),
  walls: Object.freeze([
    Object.freeze({ x: 3, y: 2 }),
    Object.freeze({ x: 3, y: 3 }),
    Object.freeze({ x: 3, y: 4 }),
  ]),
});

const STEP_COST = -0.01;
const CHECKPOINT_REWARD = 1;
const FINISH_REWARD = 10;

/** @param {Position} position */
export function positionKey(position) {
  return `${position.x},${position.y}`;
}

/**
 * @param {{ width: number, height: number, start: Position, checkpoints: Position[], walls?: Position[] }} layout
 * @returns {Environment}
 */
export function createEnvironment(layout) {
  if (!Number.isInteger(layout.width) || !Number.isInteger(layout.height) || layout.width < 2 || layout.height < 2) {
    throw new Error("The grid needs integer dimensions of at least 2 × 2.");
  }
  if (!Array.isArray(layout.checkpoints) || layout.checkpoints.length === 0) {
    throw new Error("The environment needs at least one checkpoint.");
  }

  const walls = new Set((layout.walls ?? []).map(positionKey));
  const occupied = new Set([positionKey(layout.start)]);
  assertInside(layout.start, layout, "start");
  if (walls.has(positionKey(layout.start))) throw new Error("The start cannot be a wall.");

  layout.checkpoints.forEach((checkpoint, index) => {
    assertInside(checkpoint, layout, `checkpoint C${index + 1}`);
    const key = positionKey(checkpoint);
    if (walls.has(key)) throw new Error(`Checkpoint C${index + 1} cannot be a wall.`);
    if (occupied.has(key)) throw new Error("The start and checkpoints must occupy different cells.");
    occupied.add(key);
  });

  return {
    width: layout.width,
    height: layout.height,
    start: { ...layout.start },
    checkpoints: layout.checkpoints.map((checkpoint) => ({ ...checkpoint })),
    walls,
  };
}

/** @param {Position} position @param {{ width: number, height: number }} layout @param {string} label */
function assertInside(position, layout, label) {
  if (!Number.isInteger(position.x) || !Number.isInteger(position.y)
    || position.x < 0 || position.x >= layout.width || position.y < 0 || position.y >= layout.height) {
    throw new Error(`The ${label} must be inside the grid.`);
  }
}

/** @param {Environment} environment @returns {AgentState} */
export function initialState(environment) {
  return { position: { ...environment.start }, nextCheckpoint: 0 };
}

/**
 * @param {Environment} environment
 * @param {AgentState} state
 * @param {number} actionIndex
 * @param {RewardMode} rewardMode
 */
export function transition(environment, state, actionIndex, rewardMode) {
  const action = ACTIONS[actionIndex];
  if (!action) throw new Error(`Unknown action index: ${actionIndex}`);
  if (rewardMode !== "proxy" && rewardMode !== "aligned") throw new Error(`Unknown reward mode: ${rewardMode}`);

  const candidate = {
    x: state.position.x + action.dx,
    y: state.position.y + action.dy,
  };
  const canMove = candidate.x >= 0 && candidate.x < environment.width
    && candidate.y >= 0 && candidate.y < environment.height
    && !environment.walls.has(positionKey(candidate));
  const position = canMove ? candidate : { ...state.position };
  const enteredCell = canMove && positionKey(position) !== positionKey(state.position);
  const checkpointIndex = enteredCell
    ? environment.checkpoints.findIndex((checkpoint) => positionKey(checkpoint) === positionKey(position))
    : -1;
  const madeProgress = checkpointIndex === state.nextCheckpoint;
  const nextCheckpoint = madeProgress ? state.nextCheckpoint + 1 : state.nextCheckpoint;
  const completedLap = enteredCell
    && positionKey(position) === positionKey(environment.start)
    && nextCheckpoint === environment.checkpoints.length;

  let reward = STEP_COST;
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
    },
  };
}

/** @param {Environment} environment @param {AgentState} state */
export function stateIndex(environment, state) {
  const positionIndex = state.position.y * environment.width + state.position.x;
  return positionIndex * (environment.checkpoints.length + 1) + state.nextCheckpoint;
}

export { seededRandom } from "./tabular-q-learning.js";

/**
 * @param {Environment} environment
 * @param {RewardMode} rewardMode
 * @param {Partial<typeof DEFAULT_TRAINING_OPTIONS>} [overrides]
 */
export function createTrainer(environment, rewardMode, overrides = {}) {
  const options = { ...DEFAULT_TRAINING_OPTIONS, ...overrides };
  return createTabularTrainer({
    stateCount: environment.width * environment.height * (environment.checkpoints.length + 1),
    actionCount: ACTIONS.length,
    initialState: () => initialState(environment),
    stateIndex: (state) => stateIndex(environment, state),
    transition: (state, action, mode) => transition(environment, state, action, mode),
  }, rewardMode, options);
}

/**
 * @param {Environment} environment
 * @param {RewardMode} rewardMode
 * @param {Partial<typeof DEFAULT_TRAINING_OPTIONS>} [options]
 */
export function trainAgent(environment, rewardMode, options = {}) {
  return finishTraining(createTrainer(environment, rewardMode, options));
}

/**
 * Run the learned policy without exploration. This score is deliberately kept
 * separate from the human metric, completedLap.
 *
 * @param {Environment} environment
 * @param {Float64Array} qValues
 * @param {RewardMode} rewardMode
 * @param {{ maxSteps?: number, seed?: number }} [options]
 */
export function evaluatePolicy(environment, qValues, rewardMode, options = {}) {
  const maxSteps = options.maxSteps ?? DEFAULT_TRAINING_OPTIONS.maxSteps;
  const random = seededRandom(options.seed ?? 1_337);
  let state = initialState(environment);
  let reward = 0;
  let checkpointEntries = 0;
  let repeatedEntries = 0;
  let completedLap = false;
  const firstVisits = new Set();
  const trajectory = [{ ...state.position }];
  const actions = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const offset = stateIndex(environment, state) * ACTIONS.length;
    const action = greedyAction(qValues, offset, ACTIONS.length, random);
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

/** @param {number} value */
export function formatReward(value) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return normalized.toFixed(2).replace(/\.00$/, "");
}
