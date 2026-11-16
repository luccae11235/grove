# Aflora Article Structure Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. The editor approved the design in chat and explicitly requested creation and a trial with the attached example.

**Goal:** Create only the repository-local article-structure skill and test it on the editor's partial data-systems article. Issue: #245.

**Architecture:** A concise `.agents/skills/aflora-article-structure/SKILL.md`, UI metadata, and one reference for Aflora criteria and output shape. Existing editorial documents remain authoritative; the supplied article is a working example, not a universal outline.

**Tech Stack:** Markdown, YAML, bundled skill validator; fresh-context behavioral trials.

**Spec:** Approved chat design and GitHub issue #245: complete gaps, preserve supplied section order and scope, propose substantial changes separately. Produce topic, learning scope and bracketed structure with essential visual ideas; stop before prose drafting or detailed visual design.

## Global Constraints

- Create no prose-writing skill and modify no reader-facing article.
- Use one learner question per visual and apply a removal-based simplicity pass.
- Preserve source evidence and distinguish editorial proposals from verified claims.
- A new article structure remains pending explicit editor approval.
- Keep automatic skill discovery enabled and the skill local to this project.

## Review Focus

- Partial outlines retain their headings, order and substantive decisions.
- Contradictory source material is preserved and questioned rather than silently corrected.
- Topic-only requests receive a useful proposal without an unnecessary questionnaire.
- Nearly complete structures are not expanded merely to fill a template.
- Research limitations and hypothetical examples do not become factual claims.

## Task 1: Create and verify the skill

**Files:** `.agents/skills/aflora-article-structure/{SKILL.md,agents/openai.yaml,references/editorial-contract.md}`; `docs/task-queue.md`.

- [x] Run an independent baseline with the supplied attachment before writing the skill; inspect observable gaps.
- [x] Write the concise skill and reference using the approved editorial contract.
- [x] Validate frontmatter, UI metadata and all local reference paths.
- [x] Run an independent application with the skill on the same input, then inspect the actual output.
- [x] Check topic-only and nearly complete inputs in a bounded additional trial.

## Task 2: Deliver the trial and reviewable branch

**Files:** `docs/article-plans/data-systems-trade-offs.md`; this plan and task queue.

- [x] Verify primary sources for the trial, preserving uncertainties and separating proposed corrections.
- [x] Save the completed outline as a proposed preparation, not an approved manuscript.
- [x] Record behavioral results and limitations below; review the final diff independently.
- [x] Run repository checks, commit with `Refs #245`, and open a PR against `develop` with `Closes #245`.
- [x] Leave merge pending the repository's staging gate; publication is outside scope.

## Verification record

2026-11-15:

- The baseline followed the broad editorial format, but incorporated corrections to
  supplied conceptual instructions into the main sequence. It did not establish a
  general inability to plan; the new skill makes traceability and the handoff repeatable.
- The fresh-context trial with the skill retained all six supplied section titles in
  order, kept the original conceptual blocks visible, flagged corrections in place,
  completed topic/scope, proposed three static visuals, and stopped before prose.
- A separate trial with a topic only produced a short cache explanation path without
  a questionnaire. A nearly complete cache outline retained its three titles, order,
  examples, literal image placeholder, and explicit scope exclusions.
- These are qualitative trials, not a statistical comparison or proof of editorial
  quality. The editor still needs to judge the proposed data-systems structure.
- The official `quick_validate.py` passed using `/usr/bin/python3`; UI YAML and the
  local reference link also passed inspection. Python on PATH lacks PyYAML and its
  pip has a local expat loading problem; the existing system interpreter avoided
  that environment issue without changing project dependencies.
- `pnpm check` exited 0: type checks, unit tests, project validation, production and
  draft builds, and nine newsletter artifact sets. Seven database integration tests
  were skipped by the existing suites because no test database was configured.
- Original outline excerpt preserved unchanged with the full attachment SHA-256.
- Independent final review found no important issues in the skill, references,
  proposed preparation or source preservation. The reviewer did not revalidate
  external sources or rerun behavioral trials.
- [PR #246](https://github.com/luccae11235/grove/pull/246) opened against `develop`;
  remote quality checks and staging review remain the pre-merge gates. The skill
  and proposed preparation are available locally on the issue branch.

## Narrative revision — editor feedback, 2026-11-15

The editor rejected the first trial as a catalogue of subjects with insufficient
development, specifically OLTP/OLAP and the social/legal section without a visual.
The earlier format-focused review was not evidence of storytelling quality.

**Revised deliverable:** research-led development of a story of ideas, where concrete
situations create questions, explanations change the reader's understanding, and
visual scenes carry reasoning. Preserve the four topics and order; preserve source
evidence separately so the proposed reading path need not repeat flawed instructions.
The editor explicitly authorizes multiple research agents when helpful.

- [x] Inspect the rejected artifact and instructions; preserve it as the regression case.
- [x] Research narrative craft, scientific communication and visual explanations in
  primary sources; distinguish evidence from editorial adaptations.
- [x] Run the old skill once with the new request to understand its current behavior.
- [x] Rewrite the skill and references, including research delegation and synthesis.
- [x] Run fresh-context trials with the original input and a different topic.
- [x] Compare the actual outputs for conceptual progression, visual discoveries,
  transitions, depth and scope; use independent critique, not self-scored compliance.
- [x] Replace the proposed preparation with a reviewed candidate; keep approval pending.
- [x] Validate metadata/references and repository checks; update PR #246.

**Research finding:** the first skill emphasized the shortest path and literal input
preservation but did not require a developed line of inquiry or assess missing
inferences. Its trial also explicitly suppressed a new visual in the social section.
The fix must improve explanatory decisions, not impose a count of scenes or controls.

### Revision verification

- Two independent research fronts investigated storytelling and visual explanation,
  with additional primary-source investigation by the author. Eight selected sources
  in the skill reference distinguish craft practice, descriptive frameworks and
  research syntheses; they do not establish a universal storytelling formula.
- The old skill produced a richer outline when given the editor's more explicit
  request. The rejected first artifact remains the regression case; this is not an
  isolated or statistical demonstration that wording alone caused improvement.
- A fresh-context application of the revised skill researched the domain and used
  a separate research agent for society/law. It produced a developed locadora case,
  conceptual transitions and visual scenes instead of only topic classifications.
- Three independent simulated readers (initial, intermediate, advanced) found a
  coherent progression and identified excess qualifications, a missing bridge from
  selecting fields to storage layout, and ambiguity about network failures with a
  single-node database. These are editorial hypotheses, not evidence from real users.
- The author addressed those findings: moved secondary legal/product details to
  notes, kept the client's correction and policy as the social throughline, added
  a storage comparison, clarified application/server communication, and retained
  conditional architectural choices. A policy comparison remains a proposed visual.
- A focused reread found the new policy comparison left the review outcome vague.
  Its contract now distinguishes automatic blocking from a decision pending context
  evaluation; it neither grants access automatically nor equates human review with
  justice. The other targeted narrative gaps were sufficiently addressed at outline level.
- Separate short-cache and nearly complete-plan trials preserved reader scope,
  existing titles/examples and the literal image placeholder without forcing a
  long dramatic plot. No images, interactions or full prose were implemented.
- The instructions received an independent review with no important findings;
  that review did not guarantee the quality of future article plans.
- Official skill validation, UI metadata and local reference checks passed.
  `pnpm check` exited 0, including production/draft builds and nine newsletter
  artifact sets; the same seven database-dependent integration tests skipped.
- The original input and rejected first trial are preserved. The new preparation
  remains proposed, with explicit editor approval pending.

PR #246 now describes the research-led narrative skill and reviewed preparation.
Remote checks and editor review remain integration gates; no merge or publication
was performed. The article structure itself remains pending explicit approval.

## Writing-style amendment — 2026-11-15

Imported only the five writing-style instructions from the editor's new attachment,
adapted to structure preparation. Added the requested near-elimination of rhetorical
colon/dash separators and split titles while preserving technical/placeholder syntax.
No drafting workflow or article content was changed. Official skill validation and
a fresh-context check of three titles, one conceptual block and one literal image
placeholder passed. Full application checks were not repeated for this Markdown-only
amendment.

## Apply style to the preparation — 2026-11-15

Revised the working title, headings, narrative thread and conceptual instructions
in `docs/article-plans/data-systems-trade-offs.md` without changing the topic order
or writing the draft. A comparative review identified one narrowed formulation
about propagating/processing changes and two overloaded sentences; these were
corrected. All visual placeholders, reference links and structural counts remain
unchanged. Source and rejected-trial files were not edited. `git diff --check`
passed; application tests were not repeated for this editorial-only change.
