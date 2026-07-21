# Reward Hacking Lab

Three inspectable browser experiments showing Goodhart's law through tabular
Q-learning. In every MDP, two agents train with the same environment, seed, and
hyperparameters. The only treatment variable is the reward.

1. **Checkpoint loop:** a proxy agent repeatedly re-enters a checkpoint instead
   of completing the lap.
2. **Sensor manipulation:** a proxy agent disables a camera before crossing a
   fragile floor.
3. **Highway ramp:** a proxy agent preserves highway speed by never serving the
   ramp queue.

Each interface keeps the optimized measurement separate from the human outcome.
Readers can reposition checkpoints in the first MDP and retrain both policies in
all three.

This repository is the experimental companion to the future Grove article:
{{CANONICAL_ARTICLE_URL}}

## Run the experiment

The project has no runtime dependencies.

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Run the tests

```bash
npm test
```

The behavioral tests verify that all three default comparisons expose their
intended failure mode.

## Shared experiment contract

- Algorithm: tabular Q-learning with epsilon-greedy exploration.
- Evaluation: a greedy policy with exploration disabled.
- Comparison: environment, state, actions, transition dynamics, hyperparameters,
  training duration, and seed stay fixed inside each MDP.
- Treatment: only the reward definition changes.
- Reporting: the optimized reward and human evaluation metrics remain separate.

Design decisions and open questions live in
[`docs/experiment-notes.md`](docs/experiment-notes.md).

## License

MIT
