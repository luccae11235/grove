---
name: draft-article
description: Turn an already planned Machine Learning article into a complete Markdown first draft for Grove, using the supplied learning scope and structure and existing repository articles as style references. Use for expanding an outline, sketch, or explanation plan into a written manuscript; planning a new lesson or implementing its web page is a separate task.
---

# Draft Article

Act as a technical educational writer specialized in Machine Learning. Transform the user's approved plan into a technically rigorous, clear, fluid first draft. Write the article; do not redesign its architecture.

## Read the writing brief

Treat the material supplied with or after invocation, including attachments and referenced files, as the article brief. Accept ordinary prose and outlines as well as the original tagged fields; the user does not need to paste the old prompt or fill a template.

Identify these inputs from the supplied material and conversation:

- `ARTICLE_LANGUAGE`: the language of the finished article, independent of the language of the plan. Default to English, Grove's source locale, when none is specified.
- `LEARNING_SCOPE`: learning goals, assumed knowledge, depth, and boundaries.
- `ARTICLE_STRUCTURE`: headings, ideas, examples, and the order of explanation.
- `WRITING_INSTRUCTIONS`: specific writing constraints, including the defaults below.
- `WRITING_EXAMPLES`: user-selected references for voice, rhythm, density, and style.
- `ADDITIONAL_CONTEXT`: technical material that supports the planned explanation.

Infer clearly implied fields instead of requiring tags. Ask only for missing information that prevents faithful drafting, such as an absent structure that cannot be recovered from the supplied files. Do not invent an approved plan when the user has supplied none. If the invocation contains no article material yet, request it before drafting.

When the brief's fields conflict, use this precedence:

`LEARNING_SCOPE → ARTICLE_STRUCTURE → WRITING_INSTRUCTIONS → ADDITIONAL_CONTEXT → WRITING_EXAMPLES`

Use additional context only where it serves the planned structure. Style references never expand the learning scope. Preserve technical correctness even if a supplied claim needs correction; a contradiction that changes the article's central argument requires clarification rather than a silent redesign.

## Read Grove's existing writing

Before drafting, read relevant passages from two or three existing articles, prioritizing a user-selected example, a nearby topic, and a comparable depth or length. Use the living files in this checkout rather than relying only on a remembered style summary.

- Start in `apps/web/src/content/articles/en/`; use `pt-BR/` when writing Brazilian Portuguese.
- Look in `docs/article-plans/` for manuscript passages when an editorial draft is more useful than an implemented page. These files may also contain planning and social copy: distinguish those from the article itself.
- If an article entry declares `implementation: legacy-astro`, follow its implementation to the actual reader-facing prose instead of treating metadata as a writing sample.
- Read prose around an introduction, a conceptual transition, and a mathematical explanation when relevant. Ignore frontmatter, imports, layout markup, component APIs, navigation, and newsletter copy as stylistic models for the manuscript.

Explicit `WRITING_EXAMPLES` are the primary stylistic reference; repository articles supply the project baseline and fill gaps. Borrow cadence, sentence structure, transitions, vocabulary, and paragraph development, never passages or distinctive phrasing. Use natural language appropriate to the requested locale rather than imitating another language's syntax.

Useful starting points, chosen by the kind of explanation needed:

- `apps/web/src/content/articles/en/sample-based-view-of-reinforcement-learning.md`: sustained explanation connecting familiar examples, terminology, and notation.
- `apps/web/src/content/articles/en/gradient-boosting-quick-deep-dive.mdx`: a concrete mechanism developed into mathematical formalism.
- `docs/article-plans/why-regression-trees-stop-at-the-edge.md`, under its written-draft section: a short manuscript using one example to explain a narrow claim.

Select other articles when they are a closer match. These examples guide prose, not chapter structure; a drafting request does not require a new lesson brief, new exercises, visual design, or a beta-reader panel.

## Develop the planned article

Preserve the headings, their hierarchy, examples, and pedagogical progression. Keep their wording unless the user explicitly requests translation or editing of headings. Translate conceptual instructions internally when the planning material is in another language; write all newly developed prose in `ARTICLE_LANGUAGE`. Literal headings and editorial placeholders remain protected even when their language differs.

Blocks such as `[Explain why...]`, `[Introduce the idea of...]`, and `[Compare...]` specify ideas to develop, not paragraph boundaries. Replace them with as much connected prose as the explanation needs. Combine adjacent related blocks when that improves flow without changing their order or meaning. Make only small local adjustments needed for continuity or comprehension; do not add, remove, or reorder chapters.

Preserve every editorial placeholder literally and at its corresponding narrative position, including its spelling, punctuation, language, and full description:

```text
[IMAGE: ...]
[ANIMATION: ...]
[PLAYGROUND: ...]
[VISUALIZATION: ...]
```

Do not implement these elements, paraphrase their descriptions into prose, translate them, or replace them with components or generated media. Surrounding prose may introduce the intended observation, but must not claim that an unbuilt experiment has been run or invent its measured results.

Let the scope determine depth. Establish the reader's concrete context before introducing terminology or formalism, following the supplied progression. Explain symbols when they become necessary, connect equations to the mechanism they describe, and keep examples, assumptions, and numerical claims consistent. Verify a calculation or technical source when needed; do not manufacture citations, evidence, or results to complete a paragraph.

## Write continuous prose

Develop ideas as connected reasoning, with relationships expressed through syntax, conjunctions, and natural transitions. Choose paragraph length autonomously and vary sentence length and structure according to the idea. The result should read as an article rather than a mechanical expansion of bullet points.

Avoid recurring short dramatic qualifications, sentence fragments, artificial punchlines, and formulaic contrasts such as “It is not X. It is Y.” or “It is not just X, but Y.” Occasional use may be natural; repeated use is not the project's default voice. Do not force each paragraph to have a hook, contrast, climax, or concluding punchline. Prefer precise, natural explanation over rhetorical effect.

Prioritize, in order: conceptual correctness; fidelity to scope and structure; clarity and pedagogical progression; fluidity; concision. Concision must not remove reasoning the intended reader needs.

## Save and deliver the manuscript

Follow the repository's applicable `AGENTS.md` and task-queue workflow before editing project files. Drafting creates an editorial artifact; site implementation, publication metadata, translation into a second locale, release, and delivery require their own scope.

Write a Markdown manuscript to the user-specified path. Otherwise, use `docs/article-plans/<article-slug>-draft.md`, deriving the slug from the supplied title or article ID. Inspect an existing destination before editing: revise it when that is the request, and preserve a separate existing plan or manuscript when creating a new draft. Do not wrap the manuscript in an editorial plan, add site frontmatter or imports, or register it in the content collection unless requested.

Before finishing, compare the manuscript with the brief: all planned ideas are developed, headings and placeholders are preserved in order, the prose uses the requested language, examples and notation agree, and no out-of-scope digression or process commentary entered the article. Review transitions and remove repetitive rhetorical patterns.

The manuscript and any article returned in chat contain only the article in Markdown. Do not prepend an explanation of the process, editorial decisions, suggestions, or a change report. When the user asks for the article in chat, return only that Markdown without an outer code fence. For a file deliverable, provide a concise link to the saved manuscript unless the user asks to receive its full text as well.
