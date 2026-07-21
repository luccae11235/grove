/**
 * Tabular Q-learning shared by the three reward-hacking MDPs.
 *
 * Ported from packages/reward-hacking-lab/src/tabular-q-learning.js. The update
 * rule stays fixed across every MDP; each environment supplies its own states,
 * actions, transitions, and rewards. Reward mode is the only treatment variable
 * inside a comparison, so any behavioral difference is caused by the reward.
 */

export type RewardMode = "proxy" | "aligned";

export interface TrainingOptions {
  episodes: number;
  maxSteps: number;
  learningRate: number;
  discount: number;
  epsilonStart: number;
  epsilonEnd: number;
  seed: number;
}

export interface StepResult<State> {
  state: State;
  reward: number;
  done: boolean;
}

export interface QModel<State> {
  stateCount: number;
  actionCount: number;
  initialState: () => State;
  stateIndex: (state: State) => number;
  transition: (
    state: State,
    action: number,
    rewardMode: RewardMode,
    random: () => number,
  ) => StepResult<State>;
}

/** Deterministic PRNG so every reader sees the same run. */
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Highest-valued action, breaking ties at random so ties stay visible. */
export function greedyAction(
  qValues: Float64Array,
  offset: number,
  actionCount: number,
  random: () => number,
): number {
  let bestValue = -Infinity;
  const ties: number[] = [];
  for (let action = 0; action < actionCount; action += 1) {
    const value = qValues[offset + action];
    if (value > bestValue + 1e-12) {
      bestValue = value;
      ties.splice(0, ties.length, action);
    } else if (Math.abs(value - bestValue) <= 1e-12) {
      ties.push(action);
    }
  }
  return ties[Math.floor(random() * ties.length)];
}

export interface Trainer {
  qValues: Float64Array;
  options: TrainingOptions;
  trainEpisode: () => boolean;
  readonly episodesCompleted: number;
  readonly finished: boolean;
}

export function createTabularTrainer<State>(
  model: QModel<State>,
  rewardMode: RewardMode,
  options: TrainingOptions,
): Trainer {
  const qValues = new Float64Array(model.stateCount * model.actionCount);
  const random = seededRandom(options.seed);
  let episodesCompleted = 0;

  function trainEpisode(): boolean {
    if (episodesCompleted >= options.episodes) return false;
    const progress =
      options.episodes <= 1 ? 1 : episodesCompleted / (options.episodes - 1);
    const epsilon =
      options.epsilonStart * (1 - progress) + options.epsilonEnd * progress;
    let state = model.initialState();

    for (let step = 0; step < options.maxSteps; step += 1) {
      const currentOffset = model.stateIndex(state) * model.actionCount;
      const action =
        random() < epsilon
          ? Math.floor(random() * model.actionCount)
          : greedyAction(qValues, currentOffset, model.actionCount, random);
      const result = model.transition(state, action, rewardMode, random);
      const nextOffset = model.stateIndex(result.state) * model.actionCount;
      let bestNext = qValues[nextOffset];
      for (let next = 1; next < model.actionCount; next += 1) {
        bestNext = Math.max(bestNext, qValues[nextOffset + next]);
      }
      const target =
        result.reward + (result.done ? 0 : options.discount * bestNext);
      qValues[currentOffset + action] +=
        options.learningRate * (target - qValues[currentOffset + action]);
      state = result.state;
      if (result.done) break;
    }

    episodesCompleted += 1;
    return true;
  }

  return {
    qValues,
    options,
    trainEpisode,
    get episodesCompleted() {
      return episodesCompleted;
    },
    get finished() {
      return episodesCompleted >= options.episodes;
    },
  };
}

export function finishTraining(trainer: Trainer): Float64Array {
  while (trainer.trainEpisode()) {
    // Synchronous path: these MDPs train in well under a frame budget.
  }
  return trainer.qValues;
}

/**
 * Trains and snapshots the Q-table at chosen episode counts, so a visualization
 * can show how a policy emerged rather than only what it ended up being.
 */
export function trainWithSnapshots<State>(
  model: QModel<State>,
  rewardMode: RewardMode,
  options: TrainingOptions,
  snapshotEpisodes: readonly number[],
): { qValues: Float64Array; snapshots: Map<number, Float64Array> } {
  const trainer = createTabularTrainer(model, rewardMode, options);
  const wanted = [...snapshotEpisodes].sort((a, b) => a - b);
  const snapshots = new Map<number, Float64Array>();
  let cursor = 0;

  while (trainer.trainEpisode()) {
    while (cursor < wanted.length && trainer.episodesCompleted >= wanted[cursor]) {
      snapshots.set(wanted[cursor], new Float64Array(trainer.qValues));
      cursor += 1;
    }
  }
  for (; cursor < wanted.length; cursor += 1) {
    snapshots.set(wanted[cursor], new Float64Array(trainer.qValues));
  }

  return { qValues: trainer.qValues, snapshots };
}
