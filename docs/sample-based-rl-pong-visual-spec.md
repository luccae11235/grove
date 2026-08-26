# Sample-based RL Pong visual specification

This specification keeps the policy illustration and the later reward
comparison grounded in the same small environment. It belongs to issue #132.

## Pedagogical roles

- **Policy illustration:** What state does the policy receive, and which action
  does it choose?
- **Reward comparison:** How does useful behavior accumulate more reward than
  behavior that repeatedly misses?

The static illustration stops at the chosen action. Score and reward first
appear in the reward comparison, where they provide new evidence.

## Shared environment

Use normalized coordinates so desktop and mobile renderings share one model.

| Element | Definition |
| --- | --- |
| Playfield | Width `1`, height `1.2`; a closed visual frame, with the lower edge acting as the miss boundary |
| Ball | Radius `0.022`; constant speed between contacts |
| Paddle | Width `0.24`, height `0.025`; center fixed at `y = 1.12` |
| State | `(ballX, ballY, velocityX, velocityY, paddleX)` |
| Actions | `LEFT`, `STAY`, `RIGHT` |
| Paddle speed | `0.58` playfield widths per second |
| Wall contact | Reflect the corresponding velocity component |
| Paddle contact | Reflect upward; contact offset may change the horizontal angle |
| Reward | `+1` on a paddle hit, `-1` on a miss, `0` otherwise |
| Episode end | Ball crosses the open bottom without touching the paddle |

Clamp the paddle inside the side walls. Use a fixed-step simulation and seeded
initial states so every replay is deterministic.

## Static policy frame

The reusable frame has one descending ball, one horizontal paddle, and no
opponent. The ball begins around `(0.68, 0.38)` with positive horizontal and
vertical velocity. The paddle begins around `x = 0.48`, so the visible decision
is `MOVE RIGHT`.

The trajectory mark communicates velocity, not a separate planning algorithm.
The state-to-policy flow names only the three observable groups: ball position,
ball velocity, and paddle position.

The visual language is shared with the interactive version: a pale sage court,
a thin rounded boundary with a quiet inset line, one faint dashed center guide,
a forest-green ball with a restrained halo, and an Aflora-green capsule paddle.
The court is decorative only where decoration also clarifies its spatial extent;
there is no score, scenery, arcade chrome, texture, or shadow.

## Reward comparison animation

Run a sequence of short, matched single-rally episodes. Both panels receive the
same seeded initial ball and paddle state at the start of each rally.

- **Useful policy:** predict the horizontal intercept after accounting for side
  wall reflections, then move toward it.
- **Poor policy:** move toward the mirrored intercept, `1 - predictedIntercept`,
  producing a deterministic but consistently unhelpful behavior.

Show the two playfields side by side at every supported width so the matched
outcomes remain simultaneous. Keep their geometry, initial states, ball speed,
and episode clock identical. Pause briefly at the outcome: a paddle contact receives a labeled
`+1`; a miss receives a labeled `-1`. Then update one cumulative reward number
per panel and reset both panels together with the next seed.

Do not show training, value estimates, model internals, controls, or a scrolling
event log. The learner only needs the stable environment, the different paddle
actions, the outcome, and accumulated reward.

For reduced motion, advance directly between successive outcomes on a measured
interval rather than showing continuous ball movement. The text alternative
must state that the useful policy reaches the predicted intercept and gains
reward while the poor policy moves away and misses.
