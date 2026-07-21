# Long-Form Lesson Writing

Use this reference to write a deep technical lesson whose length comes from
reasoning, evidence, and transfer rather than repetition.

## Contents

1. Set the article contract
2. Build one narrative current
3. Budget meaningful depth
4. Move from intuition into mathematics
5. Place interactive evidence
6. Make implementation a second explanation
7. Draft in deliberate passes
8. Audit flow, truth, and transfer
9. Calibrate with the decision-tree lesson

## 1. Set the article contract

Define the lesson before drafting paragraphs:

```text
Learner and prior knowledge:
Observable transfer outcome:
Primary motivating question:
One recurring example or dataset:
Conceptual bottleneck:
Mathematical destination:
Implementation destination:
Stress cases or limits:
Interactive evidence:
Target guided time:
Expected prose range:
Explicitly excluded topics:
```

Treat the transfer outcome as the editorial boundary. Include a detail when it
helps the learner explain, calculate, implement, diagnose, or transfer the core
mechanism. Move an interesting detail to an appendix when it interrupts that path.

Use guided time instead of raw word count as the product promise. As a planning
heuristic, a 20-minute technical article often needs 3,500–5,000 prose words when
it contains few activities. A 20-minute guided article with prediction prompts,
worked calculations, and real playgrounds may use 3,000–4,500 prose words. Never
pad to reach the range. Add a missing reasoning step, contrasting case, derivation,
implementation invariant, or transfer task.

## 2. Build one narrative current

Give the lesson one unresolved question that survives across sections. Let each
section resolve part of it and expose the next necessary question.

Prefer transitions with causal pressure:

- “We can see the cleaner group, but code needs a number.”
- “One winning split is not yet a tree; the right child remains mixed.”
- “A numeric comparison has no answer when the value is absent.”
- “The tree is complete; now we can ask which features earned its reductions.”

Avoid transitions that merely announce the outline:

- “Next, we will discuss the formula.”
- “Now let us move to implementation.”
- “Another important topic is missing data.”

Keep the same concrete objects alive as long as they remain faithful. Reuse row
IDs, feature names, candidate thresholds, class counts, node IDs, and predictions.
Stable objects reduce the cost of each new representation and let the learner
notice the transformation rather than decode a new example.

Use a new example only when the current one cannot expose the next mechanism. Say
why the example changes. Treat a stress-case dataset as a deliberate variation,
not an unexplained reset.

## 3. Budget meaningful depth

Allocate attention by reasoning job, adapting to the topic:

| Layer | Typical share | Required learner work |
| --- | ---: | --- |
| Encounter and prediction | 10–15% | inspect, commit, state an expectation |
| Visible mechanism | 15–20% | follow state and explain a change |
| Mathematics | 20–25% | reconstruct, calculate, interpret |
| Implementation | 20–25% | map state to code and trace execution |
| Stress cases and limits | 10–15% | diagnose a failure or ambiguity |
| Retrieval and transfer | 5–10% | explain without the original example |

Do not enforce these percentages mechanically. Use them to catch a draft that
spends half its length on background, races through the algorithm, or appends code
and caveats after the conceptual story has already ended.

Deepen a section with one of these moves:

1. Work one representative calculation completely.
2. Contrast two plausible candidates and explain why one loses.
3. Expose an invariant that survives a changed example.
4. Show a failure caused by violating an assumption.
5. Connect one conceptual state to its exact code representation.
6. Distinguish two questions that use similar terminology.
7. State the boundary of an analogy or simplification.
8. Ask for a prediction, then reveal evidence and targeted feedback.

Do not deepen with extra synonyms, repeated conclusions, historical trivia without
a teaching job, a list of applications, or multiple metaphors for one relation.

## 4. Move from intuition into mathematics

Make formalism feel earned:

1. Show the concrete decision the formula must support.
2. Let informal judgment work on one easy state.
3. Reveal where judgment becomes ambiguous or unscalable.
4. Invent the smallest required quantity.
5. Name the quantity after its job is visible.
6. Derive or define it precisely.
7. Calculate one case using values already present in the lesson.
8. Translate the result back into behavior.
9. State its range, edge case, or limitation.

Translate equations in both directions. Before displaying symbols, say what each
quantity must measure. After calculating, say what a larger, smaller, zero, negative,
or undefined value causes the algorithm to do.

Keep notation stable. Do not alternate among “record,” “observation,” “point,” and
“sample” unless the distinction matters. Place symbol definitions near their first
use rather than in a detached glossary.

When two formulas answer the same operational question, keep the mechanism fixed
and compare only what changes. Do not let an optional comparison fracture the main
path; use a disclosure or appendix when the derivation is not load-bearing.

## 5. Place interactive evidence

Insert a playground at the moment prose creates a testable question. Prepare the
learner before the component and interpret the evidence after it.

Use this three-part editorial frame:

```text
Before: identify the unresolved choice and ask for a prediction.
Inside: let one meaningful control update synchronized evidence.
After: name the invariant, formalize it, and transfer it to the next state.
```

Give one playground one primary reasoning job. Prefer several small, causally
sequenced playgrounds to one dashboard with unrelated controls.

For each playground specify:

- the learner question;
- the stable objects;
- the learner-controlled variable;
- the computed consequence;
- the prediction prompt;
- the most likely misread;
- the explanation required afterward;
- the reduced-motion, keyboard, text, and mobile equivalents.

Do not narrate the interface control by control. Explain the mechanism the control
reveals. Ensure all synchronized views come from one computed state. In a tree
lesson, a threshold, routed rows, class counts, impurity terms, gain, trace event,
and drawn node must agree exactly.

## 6. Make implementation a second explanation

Introduce code after the learner knows the state it manipulates. Map concepts to
representations explicitly:

| Concept | Implementation state |
| --- | --- |
| samples in a node | stable row indices |
| candidate question | feature index and threshold |
| partition | left and right index lists |
| objective improvement | parent score minus weighted child score |
| learned structure | node with question and two children |
| prediction | repeated routing until a leaf |

Show the smallest complete skeleton before production details. Then add validation,
tie-breaking, stopping rules, serialization, missing states, and performance only
when the learner can attach each detail to a known failure or contract.

Use tests to teach invariants. Prefer “the children are disjoint and cover the
parent” to “this helper returns a list of length four.” Explain which refactors the
test permits and which behavioral regressions it prevents.

State performance limits honestly. Distinguish a teaching-first implementation
from production algorithms, and explain which optimization changes execution cost
without changing the conceptual mechanism.

## 7. Draft in deliberate passes

Draft a long-form lesson in this order:

1. **Brief pass:** complete the article contract and dependency path.
2. **Question pass:** give every section one learner question and one answer.
3. **Evidence pass:** place calculations, examples, visuals, code, and checks.
4. **Continuity pass:** connect sections with unresolved causal questions.
5. **Prose pass:** write direct sentences around the evidence.
6. **Truth pass:** recompute displayed states and reconcile prose, math, visuals,
   code, tests, and limitations.
7. **Depth pass:** measure guided time and add missing reasoning, not padding.
8. **Compression pass:** remove repeated setup, redundant metaphors, and conclusions.
9. **Retrieval pass:** add prediction, explanation, stress, and transfer checks.

Draft headings as questions or conceptual turns, not textbook buckets. “A missing
value cannot answer ≤ 3.25” creates more useful pressure than “Handling Missing Data.”

Use short direct sentences for load-bearing claims. Use longer paragraphs only when
they preserve a causal chain. Avoid “simply,” “obviously,” “easy,” “magic,” and
“as you can see.” Name what evidence makes the conclusion reasonable.

## 8. Audit flow, truth, and transfer

Reject or revise the article when any answer is unclear:

- Can the learner state the motivating question after the opening?
- Does each section exist because the previous section exposed its need?
- Does the recurring example remain faithful to every later claim?
- Is every equation motivated, calculated, and interpreted?
- Does code manipulate the same named state as the visual and prose?
- Does every playground generate evidence instead of clicks?
- Is the target time supported by reasoning rather than repetition?
- Are simplifications, performance limits, and failure cases explicit?
- Does the article distinguish prediction, explanation, association, and cause?
- Can a learner perform a near-transfer task without the original visual?
- Do desktop, mobile, keyboard, reduced-motion, and text paths preserve the lesson?

Read the draft once using only transitions and first sentences. The causal thread
should remain intelligible. Read it again using only examples, equations, computed
values, and code. Those artifacts should describe one consistent mechanism.

## 9. Calibrate with the decision-tree lesson

Use the Grove classification-tree article as a calibration pattern, not a mandatory
template:

1. Begin with a ten-row greenhouse table and the question of where a learned gate
   comes from.
2. Let the learner choose a feature and move real midpoint thresholds while every
   matching row highlights; show class counts but no metric vocabulary yet.
3. Use the learner's visual judgment to expose the need for a scalar mixture score,
   then derive Gini from mismatch
   probability and calculate weighted gain on the visible winning partition.
4. Return to the same candidate search with scores visible, enumerate the exhaustive
   local algorithm, and only then name the stump's root, branches, and leaves.
5. Reuse the same local search recursively while stable row IDs move from the table
   into frontier nodes.
6. Connect row indices, candidates, recursion, stopping rules, and traversal to the
   executed Python model and invariant tests.

Keep missing-value handling and feature importance in dedicated follow-on lessons.
They use the same fitted structure, but inserting them here weakens the first article's
single discovery spine: human boundary finding → mathematical scoring → exhaustive
local search → recursive composition → prediction.

This sequence works because each later topic is a consequence of the same object and
objective. Do not copy the greenhouse setting or the exact order when another topic
has a different bottleneck. Preserve the deeper pattern:

> encounter → predict → expose a choice → invent a measure → formalize → execute →
> recurse or compose → stress → transfer → compress
