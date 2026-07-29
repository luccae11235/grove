# Reward Hacking in Reinforcement Learning

Article ID: reward-hacking-three-mdps
Status: published
Article source: apps/web/src/content/articles/en/reward-hacking-three-mdps.mdx
Plan owner: Aflora editorial
Last reviewed: 2026-07-29

## Learning Scope

Central theme: Reward hacking in reinforcement learning.

Primary learning objective: Understand why an agent can maximize its specified
reward while failing to accomplish the intended task.

Supporting concepts:

- Markov decision processes;
- cumulative discounted reward;
- the reward hypothesis;
- Goodhart’s law;
- intended objective versus specified reward;
- missing task restrictions;
- manipulation of a measurement process;
- omission of important outcomes.

### Required prerequisites

- Understand the basic components of a Markov decision process.
- Understand that a reinforcement learning agent maximizes cumulative reward.

### Helpful prerequisites

- Basic familiarity with policies and trajectories.
- Basic familiarity with tabular Q-learning.

### Not required

- Policy gradients.
- Deep reinforcement learning.
- Inverse reinforcement learning.
- RLHF.
- Formal alignment theory.

Scope boundaries: The article does not provide a complete classification of
reward-hacking failures, formal reward-design methods, mathematical guarantees,
RLHF, or a general theory of alignment. Q-learning is identified as the learning
algorithm in the examples but is not derived.

## Learning Structure

### Orient

Begin from the familiar fact that machine-learning systems depend on design
choices, then show that reinforcement learning reduces a task to the maximization
of cumulative scalar reward. Use the reward hypothesis and Goodhart’s law to
establish the central question: why should a scalar reward necessarily represent
the problem humans actually care about?

### Observe

Use three progressively different MDPs. In the checkpoint MDP, the agent repeats
a rewarded event because order is missing from the proxy. In the package-delivery
MDP, the robot disables a camera because the penalty depends on observation
rather than physical damage. In the ramp-metering MDP, the controller protects
highway speed because ramp delay is absent from the reward. Each proxy behavior
is compared with the behavior learned after changing only the reward function.

### Explain

The agent optimizes the quantity encoded by the reward function, not the
intention behind it. A difference between the intended objective and the
specified reward can therefore become part of the learned strategy. The three
examples distinguish a missing restriction, a manipulable measurement process,
and an incomplete objective.

### Generalize

The conclusion compares the three mechanisms and asks the reader to carry three
questions into new reward-design problems: which restrictions are absent,
whether the measurement process can be influenced, and which important outcomes
are missing from the objective. It explicitly states that the three mechanisms
are illustrative rather than exhaustive.

## Article Structure Script

[Introduce reinforcement-learning problem formulation as a collection of design
choices and refresh the five components of an MDP.]

[State the cumulative discounted-return objective and explain why its
expectation ranges over possible trajectories.]

[Use several possible state and action representations to show that no MDP
component is automatically determined by the underlying task.]

[Introduce the reward hypothesis, ask why a scalar reward should guarantee the
intended result, and answer that it does not.]

[Use the customer-support-call example to introduce Goodhart’s law, then define
reward hacking.]

{Keep the introduction’s level of mathematical detail from the editor’s
document. Do not add a Q-learning derivation.}

[Define the checkpoint task and its MDP.]

[Visualization: Checkpoint optimal trajectory — show the grid and allow the
reader to run the intended ordered lap.]

[Introduce the proxy checkpoint-entry reward and explain the repeatable
C1 exploit.]

[Visualization: Checkpoint proxy playground — show learning under the reward
that pays for entry into any checkpoint.]

[Define the aligned reward, which pays only for the next expected checkpoint
and for completing the lap.]

[Visualization: Checkpoint aligned playground — hold the MDP and learning setup
fixed while changing only the reward.]

[Explain that the first failure came from a missing task restriction.]

[Define the package-delivery task, its fragile floor, the camera state, and the
toggle action.]

[Distinguish a physical violation from a camera-detected violation and define
the camera-based proxy reward.]

[Visualization: Camera proxy playground — show the robot turning off the camera
before crossing the unchanged fragile floor.]

[Define the aligned reward in terms of physical violation rather than detected
violation.]

[Visualization: Physical-violation playground — hold the environment and
learning setup fixed while changing only the reward.]

[Explain that the second failure came from making the measurement process
available for the optimizer to influence.]

[Define the ramp-metering task, state, actions, arrivals, and simplified
congestion dynamics.]

[Define the highway-speed proxy and explain that ramp delay is absent.]

[Visualization: Highway-speed proxy playground — show the controller holding
the ramp indefinitely while the highway remains clear.]

[Define the aligned reward in terms of ramp queue and highway delay.]

[Visualization: Combined-delay playground — hold the traffic dynamics and
learning setup fixed while changing only the reward.]

[Explain that the third failure came from optimizing one legitimate outcome
while omitting another.]

[Compare the three mechanisms in prose, state that they are not exhaustive, and
end on the distinction between what humans meant and what the reward makes
valuable.]

{The checkpoint optimal-trajectory visualization and all six learning
playgrounds are integrated in the draft.}

## Visual and Interactive Plan

### Checkpoint optimal trajectory

Learning phase: Observe

Purpose: Establish the intended ordered route before showing learned behavior.

Medium: Interactive gridworld animation with one action.

Reader task: Run the optimal trajectory and follow the checkpoint order.

Takeaway: Success means visiting C1 through C4 in order and returning to S.

Visual encoding: A minimal 7 × 7 grid with direct labels for S and the four
checkpoints, one agent mark, walls, and a short route trace.

Sequence: Show the complete grid first; after the reader starts the trajectory,
move the agent through the ordered lap once.

Focus: The agent and the next expected checkpoint.

Default state: The full grid is visible with the agent at S and C1 identified as
the next checkpoint.

Controls: Exactly one “Run optimal trajectory” button. The same button replays
the route after completion. There are no learning, training, pause, step, speed,
reward-selection, reset, or value-display controls.

Context: The route is a reference trajectory, not the output of training.

Accessibility: Provide a text summary of the complete ordered route, use direct
checkpoint labels rather than color alone, support keyboard activation, and
replace motion with stepped states when reduced motion is requested.

### Checkpoint proxy playground

Learning phase: Observe

Purpose: Show that paying for entry into any checkpoint makes repeated entry
more profitable than completing the ordered lap.

Medium: Interactive learning playground.

Reader task: Start training, adjust its display speed, and inspect the learned
C1 loop. Move checkpoints to test whether the same reward-seeking behavior
emerges in a new layout.

Takeaway: The agent rationally repeats a rewarded event because the reward does
not encode order or lap completion.

Visual encoding: The same compact grid, moving agent, checkpoint labels,
sampled exploratory actions, a toggleable min–max view of the evolving route
Q-values, concise route trace, cumulative reward, ordered-lap outcome, learning
status, and a small reward-over-episodes line chart. Checkpoint labels double as
minimal drag handles and tap-to-place selectors; no separate layout editor is
added.

Sequence: Begin untrained, train the Q-table live, sample exploratory actions
from the current episode while the greedy route and its Q-values evolve, stop
after a stable reward-optimal policy is found, then replay that final policy.

Focus: Repeated exits from and re-entries into C1 while the learned reward rises
and the lap outcome remains incomplete.

Default state: The proxy reward sentence and full grid are visible before
training begins.

Controls: Start/pause training, a 5–150 episodes-per-second range slider,
show/hide route Q-values, drag C1–C4 or tap a checkpoint and then a legal open
cell, keyboard movement, replay, and reset. Moving a checkpoint clears the
learned Q-table and reward history so the next run learns the changed
environment from scratch.
On wide screens the controls and learning readouts sit beside the grid so the
complete playground fits within a typical laptop viewport. On narrow screens
the grid and learning panel stack without horizontal scrolling.

Context: The 7 × 7 layout, transitions, tabular Q-learning setup, γ = 0.97, and
90-step limit remain fixed for the checkpoint comparison.

Accessibility: Expose training status and the final policy as text, use labels
and position in addition to color, support keyboard controls, and provide
stepped snapshots under reduced motion.

### Checkpoint aligned playground

Learning phase: Explain

Purpose: Show the behavior produced when reward is tied to ordered progress and
lap completion.

Medium: Interactive learning playground.

Reader task: Train the same agent and compare its final route with the proxy
agent’s loop. Move checkpoints and retrain to inspect ordered learning in a new
layout.

Takeaway: Repeated entry stops paying when the reward distinguishes the next
expected checkpoint from arbitrary checkpoint contact.

Visual encoding: Reuse the checkpoint grid, sampled exploratory actions,
toggleable evolving route Q-values, learning readouts, reward-over-episodes
chart, controls, and result labels from the proxy playground so only the reward
and learned route change. Reuse the same checkpoint-label drag and tap-to-place
handles without adding a separate editing panel.

Sequence: Present the aligned reward first, then show learning snapshots and the
final ordered lap.

Focus: Progress from one expected checkpoint to the next.

Default state: Same grid and starting state as the proxy playground with the
aligned reward sentence visible.

Controls: Start/pause training, the same 5–150 episodes-per-second range slider,
show/hide route Q-values, drag C1–C4 or tap a checkpoint and then a legal open
cell, keyboard movement, replay, and reset. Moving a checkpoint clears prior
learning. Preserve the proxy playground’s side-by-side desktop layout and
stacked small-screen layout.

Context: Only the reward function changes from the proxy playground.

Accessibility: Preserve the proxy playground’s keyboard, textual, non-color,
and reduced-motion alternatives so the comparison remains equivalent.

### Camera proxy playground

Learning phase: Observe

Purpose: Show that a penalty based on observed damage rewards interference with
the observation process.

Medium: Interactive learning playground.

Reader task: Train the robot and follow its route to the camera switch and then
across the fragile floor.

Takeaway: Turning off the camera removes the penalty without removing the
physical violation.

Visual encoding: Minimal room grid with directly labeled start, delivery goal,
fragile floor, camera switch, camera status, robot, route trace, and final
physical/detected-violation results.

Sequence: Show the safe and fragile routes in the initial environment, then
train and replay the learned switch-and-cross policy.

Focus: The camera status changes while the fragile floor and physical crossing
remain unchanged.

Default state: Camera on, robot at the start, fragile floor and switch labeled,
proxy reward visible.

Controls: Start/pause training, bounded display-speed control, replay, and reset.

Context: Delivery pays +10, each step costs 0.1, and a detected violation costs
12. The switch is deliberately available to demonstrate measurement
manipulation.

Accessibility: State the camera status, physical violation, detected violation,
and outcome in text; use labels and shapes in addition to color; support
keyboard and reduced-motion operation.

### Physical-violation playground

Learning phase: Explain

Purpose: Show that disabling the camera has no value when the penalty follows
physical damage.

Medium: Interactive learning playground.

Reader task: Train the same robot and compare its route with the proxy policy.

Takeaway: When the physical violation is penalized directly, the longer safe
route becomes more rewarding.

Visual encoding: Reuse the exact room grid and result labels from the camera
proxy playground.

Sequence: Present the physical-violation reward, train, and replay the final safe
route.

Focus: The route around the fragile floor and the absence of any benefit from
the camera switch.

Default state: Identical environment state to the proxy playground with the
aligned reward visible.

Controls: Start/pause training, bounded display-speed control, replay, and reset.

Context: Only the reward function changes from the proxy playground.

Accessibility: Preserve the proxy playground’s keyboard, textual, non-color,
and reduced-motion alternatives.

### Highway-speed proxy playground

Learning phase: Observe

Purpose: Show a reward that is accurately measured yet incomplete because it
does not include ramp waiting.

Medium: Interactive traffic simulation.

Reader task: Train the controller and inspect the highway congestion, ramp
queue, and hold/release policy.

Takeaway: The controller maximizes highway speed by never serving the omitted
ramp queue.

Visual encoding: Preserve the standalone traffic playground’s highway and
curved on-ramp scene: highway cars move continuously at one stable visual speed,
queued cars occupy fixed ramp positions, and only released ramp cars travel
through the merge. Direct values report queue size, congestion, highway speed,
action, and overflow. Below the scene, preserve the paired 4 × 9 Q-value grids
for hold and release. Each grid uses congestion as rows and queue size as
columns; direct numeric values, a WIN label, a current-state outline, and an
updated-or-chosen-action outline reveal which action is winning in every state
without relying on color alone. On wide screens, give the traffic scene most of
the stage width and keep the controls column to the smallest height needed for
status, metrics, exploration, speed, and actions. Do not repeat each learning
event as visible prose; announce that detail to assistive technology instead.

Sequence: Begin with an empty queue, no congestion, and both zero-valued Q
tables. During training, update the queue scene and the exact Q-table cell
changed by each visible learning step. Then replay the learned hold policy long
enough for the queue to fill while the chosen state-action cell remains
highlighted.

Focus: First, highway traffic continues moving while the ramp queue grows.
Second, the hold table wins across the states the controller encounters,
connecting the visible behavior to the learned action values.

Default state: q = 0, c = 0, the proxy equation visible, both actions directly
labeled, and both 4 × 9 Q-value grids visible with the current state outlined.

Controls: Start/pause training, bounded display-speed control, replay, and reset.

Context: Arrival probability is 0.35, release serves at most two cars, the queue
is capped at eight, and the simplified model is illustrative.

Accessibility: Report each action and the changing queue, congestion, speed, and
overflow in text; give every Q-value cell an action, state, value, and policy
status label; pair color with WIN and outline markers; make the table region
keyboard-scrollable; support keyboard operation and stepped reduced-motion
updates.

### Combined-delay playground

Learning phase: Explain

Purpose: Show the policy produced when both ramp delay and highway delay affect
reward.

Medium: Interactive traffic simulation.

Reader task: Train the same controller and compare its behavior and combined
delay with the proxy controller.

Takeaway: The aligned controller accepts temporary highway congestion to avoid
unbounded ramp delay.

Visual encoding: Reuse the exact highway/on-ramp scene, paired 4 × 9 Q-value
grids, direct result labels, WIN markers, and current/action outlines from the
proxy playground, adding only the combined-delay result required for comparison.

Sequence: Present the combined-delay reward with zero-valued tables, update the
same state-action cells during training, and replay a policy that alternates
between holding and releasing while released ramp cars visibly traverse the
merge.

Focus: The tradeoff between short-lived congestion and accumulating ramp delay,
and the state-dependent shift between winning hold and release values.

Default state: Identical traffic state and zero-valued Q tables to the proxy
playground with the aligned reward equation visible.

Controls: Start/pause training, bounded display-speed control, replay, and reset.

Context: Traffic dynamics, arrivals, algorithm, and hyperparameters are held
fixed; only the reward function changes.

Accessibility: Preserve the proxy playground’s keyboard, textual, Q-table,
non-color, and reduced-motion alternatives, including a textual comparison of
both delay components.

## Current implementation state

The draft contains the complete editor-provided prose and equations, the
checkpoint optimal-trajectory visualization, and all six planned learning
playgrounds. The reference grid is intentionally compact. All learning
playgrounds train the Q-table live and place controls, learning readouts, and
reward history beside the environment on wide screens and below it on narrow
screens. The checkpoint playgrounds additionally expose sampled exploration,
evolving route Q-values, and direct checkpoint repositioning. The
package-delivery pair keeps the exact same learning shell and room grid while
changing only whether detected damage or physical damage receives the penalty.
The traffic pair keeps the same traffic dynamics, fixed arrival sequence,
5,000-episode Q-learning setup, controls, original highway/on-ramp animation,
paired hold/release Q-value grids, and replay while changing only whether the
reward counts highway speed or combined delay. The content metadata therefore
reports zero implemented static visuals and seven implemented interactions.
