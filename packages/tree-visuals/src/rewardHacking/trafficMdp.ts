/**
 * MDP 3 — metering-ramp scope failure.
 *
 * Human objective: minimise total delay for every driver, on the highway and
 * on the ramp. The aligned reward counts both groups. The proxy reward counts
 * only highway speed, so holding the ramp queue forever looks perfect.
 *
 * There is no sensor to disable and no event to repeat here: the damage simply
 * lands on a population the metric never looks at.
 */

import {
  createTabularTrainer,
  finishTraining,
  greedyAction,
  seededRandom,
  type RewardMode,
  type TrainingOptions,
} from "./engine";

export interface TrafficState {
  queue: number;
  congestion: number;
}

export const TRAFFIC_ACTIONS = [
  { name: "hold" },
  { name: "release" },
] as const;

export const TRAFFIC_CONFIG = {
  maxQueue: 8,
  maxCongestion: 3,
  releaseCapacity: 2,
  arrivalProbability: 0.35,
  slowdownPerLevel: 0.12,
  highwayCars: 20,
  highwayDelayWeight: 0.5,
};

export const TRAFFIC_TRAINING: TrainingOptions = {
  episodes: 5_000,
  maxSteps: 200,
  learningRate: 0.1,
  discount: 0.98,
  epsilonStart: 1,
  epsilonEnd: 0.03,
  seed: 23,
};

/** Which groups the reward is allowed to count. */
export type MetricScope = "highway-only" | "highway-and-ramp";

export function trafficInitialState(): TrafficState {
  return { queue: 0, congestion: 0 };
}

export function trafficStateIndex(state: TrafficState): number {
  return state.queue * (TRAFFIC_CONFIG.maxCongestion + 1) + state.congestion;
}

export function highwaySpeed(congestion: number): number {
  return 1 - TRAFFIC_CONFIG.slowdownPerLevel * congestion;
}

export interface TrafficEvent {
  arrival: number;
  released: number;
  overflow: number;
  speed: number;
  highwayDelay: number;
  systemDelay: number;
}

export function trafficTransition(
  state: TrafficState,
  actionIndex: number,
  rewardMode: RewardMode,
  random: () => number,
) {
  const action = TRAFFIC_ACTIONS[actionIndex];
  const arrival = random() < TRAFFIC_CONFIG.arrivalProbability ? 1 : 0;
  const released =
    action.name === "release"
      ? Math.min(TRAFFIC_CONFIG.releaseCapacity, state.queue)
      : 0;
  const rawQueue = Math.max(0, state.queue - released) + arrival;
  const overflow = Math.max(0, rawQueue - TRAFFIC_CONFIG.maxQueue);
  const queue = Math.min(TRAFFIC_CONFIG.maxQueue, rawQueue);
  const congestion =
    action.name === "release"
      ? TRAFFIC_CONFIG.maxCongestion
      : Math.max(0, state.congestion - 1);
  const speed = highwaySpeed(congestion);
  const highwayDelay = TRAFFIC_CONFIG.highwayCars * (1 - speed);
  const systemDelay = queue + highwayDelay;
  // Proxy sees one number: highway speed. Aligned pays for both queues.
  const reward =
    rewardMode === "proxy"
      ? speed
      : -(queue + TRAFFIC_CONFIG.highwayDelayWeight * highwayDelay);

  return {
    state: { queue, congestion },
    reward,
    done: false,
    event: {
      arrival,
      released,
      overflow,
      speed,
      highwayDelay,
      systemDelay,
    } satisfies TrafficEvent,
  };
}

const TRAFFIC_MODEL = {
  stateCount:
    (TRAFFIC_CONFIG.maxQueue + 1) * (TRAFFIC_CONFIG.maxCongestion + 1),
  actionCount: TRAFFIC_ACTIONS.length,
  initialState: trafficInitialState,
  stateIndex: trafficStateIndex,
  transition: trafficTransition,
};

export function trainTrafficAgent(
  rewardMode: RewardMode,
  overrides: Partial<TrainingOptions> = {},
): Float64Array {
  const options = { ...TRAFFIC_TRAINING, ...overrides };
  return finishTraining(
    createTabularTrainer(TRAFFIC_MODEL, rewardMode, options),
  );
}

export interface TrafficTraceStep {
  state: TrafficState;
  action: number | null;
  event: TrafficEvent | null;
  reward: number;
}

export interface TrafficEvaluation {
  reward: number;
  steps: number;
  finalQueue: number;
  averageQueue: number;
  averageHighwaySpeed: number;
  releasedCars: number;
  arrivals: number;
  overflows: number;
  totalRampWaiting: number;
  totalHighwayDelay: number;
  totalSystemDelay: number;
  trace: TrafficTraceStep[];
}

/**
 * Both policies face the same fixed arrival sequence, so any difference in the
 * queue comes from the policy rather than from luck.
 */
export function evaluateTrafficPolicy(
  qValues: Float64Array,
  rewardMode: RewardMode,
  options: { maxSteps?: number; policySeed?: number; arrivalSeed?: number } = {},
): TrafficEvaluation {
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
  const trace: TrafficTraceStep[] = [
    { state: { ...state }, action: null, event: null, reward: 0 },
  ];

  for (let step = 0; step < maxSteps; step += 1) {
    const offset = trafficStateIndex(state) * TRAFFIC_ACTIONS.length;
    const action = greedyAction(
      qValues,
      offset,
      TRAFFIC_ACTIONS.length,
      policyRandom,
    );
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
