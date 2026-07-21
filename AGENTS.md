# Grove working principles

## Task queue

Before beginning new project work, consult [the task queue](docs/task-queue.md).
It is the source of truth for unfinished operational, product, content, and
release tasks. Update the relevant card's status and completion check when work
changes its state; do not implement a queued task unless it is explicitly in
scope for the current request.

## Educational visualizations: simplicity first

Apply these rules to every article and learning experience in this repository:

- Give each visualization one pedagogical job. Write the learner question it must answer before designing it.
- Use the smallest representation that makes the target relationship visible. Remove every label, number, panel, control, and decoration that does not help answer that question.
- Show the result or comparison directly. Do not display arithmetic, derivations, or intermediate calculations unless performing that calculation is itself the learning objective.
- Avoid repeating the same information in several forms. If the surrounding prose or dataset already establishes a value, the visualization should reveal the new relationship rather than restate every step.
- Prefer direct labels and one clear visual hierarchy over explanatory callouts, legends, cards, or dense annotations.
- Keep important objects stable and emphasize only the meaningful change or comparison.
- Use progressive disclosure when extra detail is genuinely useful, keeping the first view self-explanatory and minimal.
- Before considering a visualization finished, run a simplicity pass: remove one element at a time and keep it removed whenever the intended inference remains clear.

Accuracy, accessibility, and responsive behavior remain requirements; simplicity must not depend on hiding necessary context or using color alone.
