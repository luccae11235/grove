# Sample-based RL MDP loop visual specification

## Learning question

How does one agent–environment interaction become the next observed piece of a trajectory?

## Target inference

The policy produces an action. The environment's transition dynamics produce the next state, while its reward function produces the reward. Repeating that interaction creates an ordered sample of states, actions, and rewards.

## Shared visual language

- Keep exactly two stable objects: **Agent** and **Environment**.
- Use the upper path for policy and action: `π(aₜ | sₜ) → aₜ`.
- Use the return path for the environment response:
  `P(sₜ₊₁ | sₜ, aₜ) → sₜ₊₁` and
  `r(sₜ, aₜ, sₜ₊₁) → rₜ₊₁`.
- Use Aflora green only for the current causal relation. Shape, label, and position must carry the same meaning without color.
- Do not add an MDP tuple, discount factor, legend, decorative icons, or a domain-specific environment. They do not answer this visual's question.

## Static figure

The complete loop is visible at once for self-paced inspection. Desktop uses a horizontal loop; mobile uses the same loop vertically. Both remain within a 760px article measure.

## Animation storyboard

1. **State:** the agent observes `sₜ`.
2. **Policy:** the policy formula and action path pulse; `aₜ` enters the trajectory.
3. **Reward:** the reward formula pulses; `rₜ₊₁` enters the trajectory.
4. **Transition:** the environment and transition formula pulse; `sₜ₊₁` enters the trajectory at the same moment.
5. The next cycle begins with the agent observing that new state.

The loop repeats automatically after the reader presses Run. Each phase remains visible for 1.25 seconds so a first-time reader can connect the highlighted formula to the new trajectory symbol. Pause and Reset are available. Under reduced motion, the same semantic phases change discretely every 1.5 seconds without entrance animation.

## Accessibility and correctness

- The animation exposes its current phase and sample length to assistive technology.
- Equations are DOM text, not raster text, in the interactive version.
- Focus states, keyboard-operable controls, mobile containment, and reduced motion are required.
- The sampled sequence is ordered `s₀, a₀, r₁, s₁, ...`; the reward and next-state symbols enter during their matching highlighted functions, while the transition function itself remains absent from the sample rail.
