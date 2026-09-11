const MIN_TRAINING_FRAME_MS = 18;
const MAX_TRAINING_FRAME_MS = 80;
const BASE_EPISODES_PER_SECOND = 100;

/**
 * Maps the experiment speed control to a legible visual sampling rate.
 * The court cannot display every training transition, so it samples the
 * current policy more aggressively as the requested episode rate rises.
 */
export function trainingFrameDelay(episodesPerSecond: number) {
  const safeRate = Number.isFinite(episodesPerSecond)
    ? Math.max(BASE_EPISODES_PER_SECOND, episodesPerSecond)
    : BASE_EPISODES_PER_SECOND;
  const delay = MAX_TRAINING_FRAME_MS * Math.sqrt(
    BASE_EPISODES_PER_SECOND / safeRate,
  );
  return Math.max(MIN_TRAINING_FRAME_MS, Math.round(delay));
}
