import {
  createTabularTrainer,
  finishTraining,
  greedyAction,
  seededRandom,
} from "./tabular-q-learning.js";

/** @typedef {"proxy" | "aligned"} RewardMode */

export const TRAFFIC_ACTIONS = Object.freeze([
  Object.freeze({ name: "hold", label: "Segurar" }),
  Object.freeze({ name: "release", label: "Liberar" }),
]);

export const TRAFFIC_CONFIG = Object.freeze({
  maxQueue: 8,
  maxCongestion: 3,
  releaseCapacity: 2,
  arrivalProbability: 0.35,
  slowdownPerLevel: 0.12,
  highwayCars: 20,
  highwayDelayWeight: 0.5,
});

export const TRAFFIC_TRAINING_OPTIONS = Object.freeze({
  episodes: 5_000,
  maxSteps: 200,
  learningRate: 0.1,
  discount: 0.98,
  epsilonStart: 1,
  epsilonEnd: 0.03,
  seed: 23,
});

export function trafficInitialState() {
  return { queue: 0, congestion: 0 };
}

export function trafficStateIndex(state) {
  return state.queue * (TRAFFIC_CONFIG.maxCongestion + 1) + state.congestion;
}

export function highwaySpeed(congestion) {
  return 1 - TRAFFIC_CONFIG.slowdownPerLevel * congestion;
}

/**
 * @param {{ queue: number, congestion: number }} state
 * @param {number} actionIndex
 * @param {RewardMode} rewardMode
 * @param {() => number} random
 */
export function trafficTransition(state, actionIndex, rewardMode, random) {
  const action = TRAFFIC_ACTIONS[actionIndex];
  if (!action) throw new Error(`Unknown traffic action: ${actionIndex}`);
  if (rewardMode !== "proxy" && rewardMode !== "aligned") throw new Error(`Unknown reward mode: ${rewardMode}`);

  const arrival = random() < TRAFFIC_CONFIG.arrivalProbability ? 1 : 0;
  const released = action.name === "release"
    ? Math.min(TRAFFIC_CONFIG.releaseCapacity, state.queue)
    : 0;
  const rawQueue = Math.max(0, state.queue - released) + arrival;
  const overflow = Math.max(0, rawQueue - TRAFFIC_CONFIG.maxQueue);
  const queue = Math.min(TRAFFIC_CONFIG.maxQueue, rawQueue);
  const congestion = action.name === "release"
    ? TRAFFIC_CONFIG.maxCongestion
    : Math.max(0, state.congestion - 1);
  const speed = highwaySpeed(congestion);
  const highwayDelay = TRAFFIC_CONFIG.highwayCars * (1 - speed);
  const systemDelay = queue + highwayDelay;
  const reward = rewardMode === "proxy"
    ? speed
    : -(queue + TRAFFIC_CONFIG.highwayDelayWeight * highwayDelay);

  return {
    state: { queue, congestion },
    reward,
    done: false,
    event: { arrival, released, overflow, speed, highwayDelay, systemDelay },
  };
}

export function createTrafficTrainer(rewardMode, overrides = {}) {
  const options = { ...TRAFFIC_TRAINING_OPTIONS, ...overrides };
  return createTabularTrainer({
    stateCount: (TRAFFIC_CONFIG.maxQueue + 1) * (TRAFFIC_CONFIG.maxCongestion + 1),
    actionCount: TRAFFIC_ACTIONS.length,
    initialState: trafficInitialState,
    stateIndex: trafficStateIndex,
    transition: trafficTransition,
  }, rewardMode, options);
}

export function trainTrafficAgent(rewardMode, options = {}) {
  return finishTraining(createTrafficTrainer(rewardMode, options));
}

export function evaluateTrafficPolicy(qValues, rewardMode, options = {}) {
  const maxSteps = options.maxSteps ?? 120;
  const policyRandom = seededRandom(options.policySeed ?? 8_112);
  const arrivalRandom = seededRandom(options.arrivalSeed ?? 99);
  let state = trafficInitialState();
  let reward = 0;
  let releasedCars = 0;
  let arrivals = 0;
  let totalRampWaiting = 0;
  let totalHighwayDelay = 0;
  let totalSystemDelay = 0;
  let totalSpeed = 0;
  let overflows = 0;
  const trace = [{ state: { ...state }, action: null, event: null, reward: 0 }];

  for (let step = 0; step < maxSteps; step += 1) {
    const offset = trafficStateIndex(state) * TRAFFIC_ACTIONS.length;
    const action = greedyAction(qValues, offset, TRAFFIC_ACTIONS.length, policyRandom);
    const result = trafficTransition(state, action, rewardMode, arrivalRandom);
    reward += result.reward;
    releasedCars += result.event.released;
    arrivals += result.event.arrival;
    totalRampWaiting += result.state.queue;
    totalHighwayDelay += result.event.highwayDelay;
    totalSystemDelay += result.event.systemDelay;
    totalSpeed += result.event.speed;
    overflows += result.event.overflow;
    trace.push({
      state: { ...result.state },
      action,
      event: { ...result.event },
      reward: result.reward,
    });
    state = result.state;
  }

  return {
    reward,
    steps: maxSteps,
    finalQueue: state.queue,
    averageQueue: totalRampWaiting / maxSteps,
    averageRampWait: totalRampWaiting / Math.max(1, arrivals),
    averageHighwaySpeed: totalSpeed / maxSteps,
    releasedCars,
    arrivals,
    overflows,
    totalRampWaiting,
    totalHighwayDelay,
    totalSystemDelay,
    trace,
  };
}
