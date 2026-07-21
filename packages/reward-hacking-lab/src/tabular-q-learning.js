/**
 * Shared tabular Q-learning engine. Each MDP supplies its own states, actions,
 * transitions, and rewards; the update rule stays fixed.
 */

/** @param {number} seed */
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * @param {Float64Array} qValues
 * @param {number} offset
 * @param {number} actionCount
 * @param {() => number} random
 */
export function greedyAction(qValues, offset, actionCount, random) {
  let bestValue = -Infinity;
  /** @type {number[]} */
  const ties = [];
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

/**
 * @template State
 * @param {{
 *   stateCount: number,
 *   actionCount: number,
 *   initialState: () => State,
 *   stateIndex: (state: State) => number,
 *   transition: (state: State, action: number, rewardMode: "proxy" | "aligned", random: () => number) => { state: State, reward: number, done: boolean }
 * }} model
 * @param {"proxy" | "aligned"} rewardMode
 * @param {{ episodes: number, maxSteps: number, learningRate: number, discount: number, epsilonStart: number, epsilonEnd: number, seed: number }} options
 */
export function createTabularTrainer(model, rewardMode, options) {
  if (rewardMode !== "proxy" && rewardMode !== "aligned") {
    throw new Error(`Unknown reward mode: ${rewardMode}`);
  }
  const qValues = new Float64Array(model.stateCount * model.actionCount);
  const random = seededRandom(options.seed);
  let episodesCompleted = 0;

  function trainEpisode() {
    if (episodesCompleted >= options.episodes) return false;
    const progress = options.episodes <= 1 ? 1 : episodesCompleted / (options.episodes - 1);
    const epsilon = options.epsilonStart * (1 - progress) + options.epsilonEnd * progress;
    let state = model.initialState();

    for (let step = 0; step < options.maxSteps; step += 1) {
      const currentOffset = model.stateIndex(state) * model.actionCount;
      const action = random() < epsilon
        ? Math.floor(random() * model.actionCount)
        : greedyAction(qValues, currentOffset, model.actionCount, random);
      const result = model.transition(state, action, rewardMode, random);
      const nextOffset = model.stateIndex(result.state) * model.actionCount;
      let bestNext = qValues[nextOffset];
      for (let nextAction = 1; nextAction < model.actionCount; nextAction += 1) {
        bestNext = Math.max(bestNext, qValues[nextOffset + nextAction]);
      }
      const target = result.reward + (result.done ? 0 : options.discount * bestNext);
      qValues[currentOffset + action] += options.learningRate * (target - qValues[currentOffset + action]);
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
    get episodesCompleted() { return episodesCompleted; },
    get finished() { return episodesCompleted >= options.episodes; },
  };
}

/** @param {{ trainEpisode: () => boolean, qValues: Float64Array }} trainer */
export function finishTraining(trainer) {
  while (trainer.trainEpisode()) {
    // Browser callers train in batches; tests use this compact synchronous path.
  }
  return trainer.qValues;
}
