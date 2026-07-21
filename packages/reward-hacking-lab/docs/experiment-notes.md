# Experiment notes

## Learning question

After training the paired agents in three small MDPs, can a reader diagnose which
part of a measurement makes harmful optimization possible?

## Smallest faithful comparison

Each prototype fixes its environment, Q-learning algorithm, seed, training budget,
and evaluation horizon. The experiment changes only the reward function between
the paired agents.

The primary evidence is deliberately small:

1. the learned behavior over time;
2. the optimized measurement;
3. the human outcome omitted or distorted by that measurement.

Q-values, epsilon, and per-episode charts remain omitted from the first view. They
explain the learning process, but they do not help identify the reward failure.

## Current hypotheses

When an easily reversible checkpoint is near the start, the proxy reward makes a
two-cell loop more valuable than finishing a lap. A sequential reward removes the
benefit of returning to an already credited checkpoint.

The expected default result, using seed 7, is:

| Reward | Learned behavior | Human outcome |
| --- | --- | --- |
| Any checkpoint | Re-enter a nearby checkpoint | No completed lap |
| Next checkpoint | Visit C1–C4 and return to start | Completed lap |

This is a deterministic regression fixture, not a claim that every seed and every
checkpoint layout must produce reward hacking. The interface says so when a custom
layout does not yield the contrast.

### Sensor manipulation

When a penalty depends on camera detection instead of the physical violation, the
proxy agent learns to disable the camera, use the short fragile route, and deliver
in seven steps. The aligned agent leaves the camera on and uses the ten-step safe
route. The key evidence is `0 detected` beside `1 real violation`.

### Traffic scope failure

When reward includes only highway speed, the proxy agent holds every ramp vehicle.
The highway stays at full speed while the eight-car queue saturates. When ramp and
highway delay both count, the aligned agent accepts temporary congestion and keeps
the mean queue below one car in the default evaluation.

## Calibration snapshot

The sensor and traffic contrasts were trained independently with seeds
`1, 3, 7, 11, 17, 23, 31, 47`. All eight sensor runs produced camera
manipulation only under the proxy reward. All eight traffic runs produced a
saturated proxy queue with zero releases while the aligned policy controlled the
queue. This is an initial robustness check, not yet a comprehensive parameter sweep.

## Simplifications

- The checkpoint and sensor environments are deterministic.
- The start and walls are fixed in the first prototype.
- Checkpoint episodes have at most 90 steps; sensor episodes have 30; traffic
  training uses fixed episodes of 200 steps.
- Entering the start ends an episode only after all checkpoints were visited in order.
- Both agents observe the next expected checkpoint, even though the proxy reward
  ignores whether a checkpoint is expected.
- Evaluation turns exploration off.
- The traffic environment uses a fixed stochastic arrival sequence during paired
  evaluation so both agents face the same arrivals.
- The traffic queue is capped at 8 rather than 20. This keeps every queue state
  visible and makes tabular training reliable without changing the scope failure.
- Cars arriving after the eight queue positions are occupied count as overflow;
  the visual keeps the saturated queue visible rather than drawing an unbounded line.

## Next experiments

1. Sweep seeds for all three MDPs and record how often the intended qualitative
   policy emerges.
2. Record a few meaningful training snapshots to test whether learning itself is
   legible without a dense curve.
3. Test one constrained intervention per MDP: checkpoint position, switch position,
   and which vehicle groups enter the traffic metric.
4. Decide whether the article should order the failures as repetition → scope →
   manipulation, or repetition → manipulation → scope.
5. Add an optional Q-value inspector only if readers need it to explain why a
   harmful policy becomes stable.
