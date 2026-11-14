# Grove working principles

## Task queue

Before beginning new project work, consult [the task queue](docs/task-queue.md).
It is the source of truth for unfinished operational, product, content, and
release tasks. Update the relevant card's status and completion check when work
changes its state; do not implement a queued task unless it is explicitly in
scope for the current request.

For Aflora article preparation in Notion's Building stage, read
[`docs/article-plans/README.md`](docs/article-plans/README.md). Present
research, learning scope, and a proposed bracketed learning structure to the
editor, including visual ideas needed to judge the structure; wait for explicit
structure approval before detailed visual design, the full first draft, or
implementation. Preserve historical examples as source evidence.

## Required GitFlow

Every repository change must follow this sequence:

1. Create or identify a GitHub issue with the objective and acceptance criteria
   before editing project files.
2. Create a temporary branch from the latest `origin/develop`. Use
   `feature/*`, `fix/*`, `docs/*`, or `chore/*` for normal work.
3. Reference the issue in the branch context, commits, and pull request. A
   normal pull request must use a closing reference such as `Closes #123`.
4. Open the pull request against `develop`, pass all checks, and review the
   deployed result in staging before merging.
5. Promote `develop` to `main` only through a release pull request. Do not merge
   or push to `main` without the repository owner's explicit production
   approval, recorded with the `production-approved` label.
6. Treat deploy and newsletter delivery as separate operations. A merge or
   Railway deploy must never imply authorization to create or send a broadcast.

Use `release/*` only when stabilization needs a separate branch. Use
`hotfix/*` from `main` only for an urgent production defect, then merge the
result back into `develop`.

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
