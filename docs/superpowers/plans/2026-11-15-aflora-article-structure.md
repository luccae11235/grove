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
