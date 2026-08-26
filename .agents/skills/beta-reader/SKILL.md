---
name: beta-reader
description: Simulate a small, varied panel of fresh-eye readers reviewing an educational article draft or sketch, including its explanations, mathematics, narrative flow, writing style, examples, and interactive playgrounds. Use when Codex needs beta-reader feedback, audience-fit testing, an editorial stress test, a simulated reading experience, comprehension notes, confusion points, or prioritized revisions before publishing an article or learning experience.
---

# Beta Reader

Simulate evidence-based reader experiences, not real user research. Use a bounded panel to expose audience-specific friction and synthesize high-value revisions without manufacturing consensus.

## Set the review contract

1. Locate the exact draft and any runnable playground. Prefer the reader-facing rendered article when it is already available; otherwise use the source draft.
2. Infer the article's intended audience, learning promise, and prerequisite knowledge. State material assumptions briefly instead of stopping for optional clarification.
3. Select two readers for a short or narrow draft and three for a substantial technical article. Never exceed three simulated readers in one run; combine concerns rather than adding readers.
4. Give readers independent context. Do not reveal another reader's notes before all independent passes finish.
5. State in the final report that the panel is simulated and its findings are hypotheses for revision, not evidence of actual user behavior.

## Compose a small panel

Use capability boundaries rather than elaborate fictional biographies:

- **Initial reader:** Curious about the topic but lacks its specialist vocabulary. Own conceptual orientation, jargon, explanation order, and prose accessibility.
- **Intermediate reader:** Understands the broad domain and basic notation but cannot silently fill important gaps. Own examples, mathematical explanations, transitions from intuition to formalism, and application.
- **Advanced reader:** Can challenge correctness, hidden assumptions, precision, scope, and misleading simplifications. Own technical validity and nuance without demanding detail outside the article's promise.

Adjust prerequisites to the article, but preserve meaningful distance between the readers. Do not invent demographic traits, life histories, or emotional reactions that the artifact cannot support.

For a two-reader panel, keep the initial reader and combine the intermediate and advanced lenses in a technically capable reader. Use three readers by default for an article with mathematics or a substantial interaction.

## Divide concerns without creating silos

Assign one primary concern set to each reader as above. Every reader must still describe the whole reading experience and may flag a severe issue outside their lens. This produces broad coverage without three duplicate checklists.

Cover these concerns once across the panel:

- promise, prerequisites, and audience fit;
- concept sequence and explanation flow;
- mathematics, notation, assumptions, and intuition-to-formal transitions;
- examples, analogies, and connection to application;
- writing style, voice, pacing, and sentence-level friction;
- interaction discoverability, usability, feedback, and learning value;
- accessibility or responsive friction that materially changes comprehension.

Do not force comments under every concern. Silence is preferable to low-value filler.

## Run independent reading passes

When subagents are available, spawn the selected two or three readers in parallel. The orchestrating agent must keep one slot for synthesis and must not create nested reader panels. When subagents are unavailable, perform the same passes sequentially and keep their notes isolated until synthesis.

Give each reader only:

- the article artifact or exact location;
- the inferred learning promise and intended audience;
- their capability boundary and primary concerns;
- whether they are the designated playground explorer;
- the compact note format and limits below.

Ask each reader to read in article order rather than search only for defects. Return at most:

- a one-sentence statement of what the article seemed to promise;
- three to five important reading moments;
- one overall judgment;
- three highest-value revision suggestions;
- two strengths that should survive revision.

For each reading moment, record:

1. location or section;
2. what the reader understood or expected at that point;
3. the confusion, judgment, or insight;
4. concise artifact evidence;
5. likely effect on that reader's learning.

Mark claims as `observed` when directly grounded in text or interaction, `inferred` when they simulate a persona response, and `verified` when a calculation, test, or source check independently confirms them. Never present an inferred reaction as an observed user fact.

## Explore interactions selectively

Interactive exploration is an exception, not a task for every reader.

Designate at most one reader as the playground explorer when all are true:

- a runnable interaction exists;
- operating it can answer a learning or usability question that source reading cannot;
- the needed browser or screen-control capability is available;
- the likely insight justifies the extra context and tool cost.

Choose the reader whose capability best represents the interaction's intended learner, usually the initial or intermediate reader. The explorer must:

1. open the reader-facing article at a representative viewport;
2. attempt the interaction from visible instructions without reading implementation details first;
3. make only the minimum state changes needed to understand the learning loop;
4. record expectation, action, visible result, interpretation, and friction;
5. stop after the learning claim is tested or after three meaningful interaction states.

Do not ask other readers to operate the screen. They may assess the interaction's surrounding explanation from the draft. If rendering or control fails, report the limitation and review the interaction contract from source; do not simulate successful use.

## Preserve token discipline

- Use two or three readers, never more.
- Cap each independent reader response at roughly 600 words and five reading moments.
- Give each concern one primary owner; deduplicate only during synthesis.
- Quote only the smallest phrase needed to locate evidence.
- Stop investigating a concern when evidence is sufficient to support a revision decision.
- Prefer one representative viewport and three interaction states unless a suspected responsive defect requires one additional viewport.
- Do not rewrite the article during beta reading unless the user explicitly asks for edits.
- Do not run broad correctness research by default. Directly verify only high-impact mathematical or factual doubts that could change the verdict.

## Synthesize without flattening differences

After all independent passes finish:

1. Cluster notes by concern and underlying cause, not merely by section.
2. Preserve disagreements and explain which prerequisite boundary likely caused them.
3. Distinguish a shared blocker from audience-specific friction and advanced-only nuance.
4. Rank findings by learning impact, number of affected reader levels, confidence, and revision cost.
5. Prefer the smallest revision that addresses the cause. Do not automatically recommend adding more explanation; reordering, replacing an example, removing detail, or improving feedback may be better.
6. Protect strengths explicitly so polishing does not erase what already works.

## Report the result

Return a compact report in this order:

1. **Panel and coverage:** reader levels, primary concerns, explorer designation, artifacts reviewed, and limitations.
2. **Main verdict:** two to four sentences on whether the article fulfills its promise for each audience level.
3. **Reader snapshots:** each reader's promise interpretation, decisive moments, judgment, and top suggestions.
4. **Concern synthesis:** explanation flow, mathematics, examples, style, interaction, and any material accessibility issue; omit empty categories.
5. **Themes and disagreements:** shared causes plus important audience-specific differences.
6. **Revision queue:** no more than seven items grouped as `must`, `should`, and `could`, each with evidence, affected readers, and intended learning improvement.
7. **Strengths to preserve:** two to four specific elements.
8. **Confidence and next evidence:** simulated-panel disclaimer and, only when useful, the single best question to test with real readers.

Keep raw notes subordinate to decisions. Important feedback must cite a section, phrase, mathematical step, or interaction state so the author can act on it.
