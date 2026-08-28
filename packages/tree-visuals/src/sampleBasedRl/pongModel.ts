export type PongAction = "LEFT" | "STAY" | "RIGHT";
export type PongPolicy = "useful" | "weak";
export type PongOutcome = "hit" | "miss";

export interface PongBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface PongState {
  ball: PongBall;
  paddleX: number;
  reward: number;
  hits: number;
  misses: number;
  rally: number;
  action: PongAction;
  outcome: PongOutcome | null;
  outcomeAge: number;
  resetIn: number;
}

export const PONG_GEOMETRY = Object.freeze({
  width: 1,
  height: 1.2,
  ballRadius: 0.022,
  paddleWidth: 0.24,
  paddleHeight: 0.025,
  paddleY: 1.12,
  paddleSpeed: 0.58,
});

const RALLIES: readonly PongBall[] = [
  { x: 0.68, y: 0.34, vx: 0.2, vy: 0.47 },
  { x: 0.28, y: 0.3, vx: -0.18, vy: 0.49 },
  { x: 0.76, y: 0.24, vx: -0.24, vy: 0.46 },
  { x: 0.35, y: 0.38, vx: 0.23, vy: 0.48 },
];

const DEAD_ZONE = 0.018;
const RESET_DELAY = 0.62;
const OUTCOME_VISIBLE_FOR = 0.7;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function reflectedX(x: number) {
  const radius = PONG_GEOMETRY.ballRadius;
  const span = PONG_GEOMETRY.width - radius * 2;
  const raw = ((x - radius) % (span * 2) + span * 2) % (span * 2);
  return radius + (raw <= span ? raw : span * 2 - raw);
}

export function predictedPaddleIntercept(ball: PongBall) {
  const { ballRadius, paddleY } = PONG_GEOMETRY;
  let travelTime: number;

  if (ball.vy > 0) {
    travelTime = (paddleY - ballRadius - ball.y) / ball.vy;
  } else {
    const timeToTop = (ball.y - ballRadius) / -ball.vy;
    const timeFromTop = (paddleY - ballRadius * 2) / -ball.vy;
    travelTime = timeToTop + timeFromTop;
  }

  return reflectedX(ball.x + ball.vx * Math.max(0, travelTime));
}

export function choosePongAction(state: PongState, policy: PongPolicy): PongAction {
  const intercept = predictedPaddleIntercept(state.ball);
  const target = policy === "useful" ? intercept : 1 - intercept;
  const difference = target - state.paddleX;

  if (Math.abs(difference) <= DEAD_ZONE) return "STAY";
  return difference < 0 ? "LEFT" : "RIGHT";
}

function rallyBall(index: number): PongBall {
  const source = RALLIES[index % RALLIES.length];
  return { ...source };
}

export function createPongState(rally = 0, policy: PongPolicy = "useful"): PongState {
  const state: PongState = {
    ball: rallyBall(rally),
    paddleX: 0.5,
    reward: 0,
    hits: 0,
    misses: 0,
    rally,
    action: "STAY",
    outcome: null,
    outcomeAge: OUTCOME_VISIBLE_FOR,
    resetIn: 0,
  };

  return { ...state, action: choosePongAction(state, policy) };
}

function resetRally(state: PongState): PongState {
  const rally = state.rally + 1;
  return {
    ...state,
    ball: rallyBall(rally),
    paddleX: 0.5,
    rally,
    action: "STAY",
    outcome: null,
    outcomeAge: OUTCOME_VISIBLE_FOR,
    resetIn: 0,
  };
}

export function stepPongState(
  state: PongState,
  policy: PongPolicy,
  elapsedSeconds: number,
): PongState {
  const dt = clamp(elapsedSeconds, 0, 1 / 30);
  if (dt === 0) return state;

  if (state.resetIn > 0) {
    const resetIn = state.resetIn - dt;
    return resetIn <= 0 ? resetRally(state) : { ...state, resetIn };
  }

  const action = choosePongAction(state, policy);
  const direction = action === "LEFT" ? -1 : action === "RIGHT" ? 1 : 0;
  const halfPaddle = PONG_GEOMETRY.paddleWidth / 2;
  const paddleX = clamp(
    state.paddleX + direction * PONG_GEOMETRY.paddleSpeed * dt,
    halfPaddle,
    PONG_GEOMETRY.width - halfPaddle,
  );

  let { x, y, vx, vy } = state.ball;
  x += vx * dt;
  y += vy * dt;

  const radius = PONG_GEOMETRY.ballRadius;
  if (x <= radius && vx < 0) {
    x = radius;
    vx *= -1;
  } else if (x >= PONG_GEOMETRY.width - radius && vx > 0) {
    x = PONG_GEOMETRY.width - radius;
    vx *= -1;
  }

  if (y <= radius && vy < 0) {
    y = radius;
    vy *= -1;
  }

  let outcome =
    state.outcomeAge < OUTCOME_VISIBLE_FOR ? state.outcome : null;
  let outcomeAge = state.outcomeAge + dt;
  let reward = state.reward;
  let hits = state.hits;
  let misses = state.misses;
  let resetIn = 0;

  const crossedPaddle =
    vy > 0 &&
    state.ball.y + radius < PONG_GEOMETRY.paddleY &&
    y + radius >= PONG_GEOMETRY.paddleY;

  if (crossedPaddle && Math.abs(x - paddleX) <= halfPaddle + radius) {
    const contactOffset = clamp((x - paddleX) / halfPaddle, -1, 1);
    y = PONG_GEOMETRY.paddleY - radius;
    vy = -Math.abs(vy);
    vx = clamp(vx + contactOffset * 0.1, -0.34, 0.34);
    reward += 1;
    hits += 1;
    outcome = "hit";
    outcomeAge = 0;
  } else if (y - radius > PONG_GEOMETRY.height) {
    reward -= 1;
    misses += 1;
    outcome = "miss";
    outcomeAge = 0;
    resetIn = RESET_DELAY;
  }

  return {
    ...state,
    ball: { x, y, vx, vy },
    paddleX,
    reward,
    hits,
    misses,
    action,
    outcome,
    outcomeAge,
    resetIn,
  };
}

export function advanceToNextOutcome(state: PongState, policy: PongPolicy) {
  const startingOutcomes = state.hits + state.misses;
  let next = state;

  for (let step = 0; step < 4_000; step += 1) {
    next = stepPongState(next, policy, 1 / 120);
    if (next.hits + next.misses > startingOutcomes) return next;
  }

  throw new Error("Pong simulation did not reach an outcome.");
}
