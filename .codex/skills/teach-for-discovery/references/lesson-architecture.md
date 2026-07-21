# Lesson Architecture

Use this reference to turn a topic into the shortest coherent path from existing knowledge to independent reasoning.

## Contents

1. Build the dependency path
2. Write the lesson brief
3. Shape the discovery arc
4. Design analogies
5. Bridge to complex applications
6. Plan progression
7. Review an existing lesson

## 1. Build the dependency path

Start from the transfer outcome and work backward:

1. Name the final decision or explanation the learner must produce.
2. List the concepts that decision depends on.
3. For each concept, ask what prior idea makes it reasonable.
4. Stop when the chain reaches knowledge the target learner likely has.
5. Mark the bottleneck: the relation that is both necessary and least intuitive.
6. Design the main example to expose that bottleneck.

Distinguish four kinds of content:

- **Load-bearing:** required for the transfer outcome; keep in the main path.
- **Scaffolding:** temporarily reduces difficulty; fade or make optional.
- **Enrichment:** deepens appreciation but is not required; move to a side path.
- **Distraction:** interesting but competes with the goal; remove.

## 2. Write the lesson brief

Use this compact template:

```text
Learner:
Prior knowledge:
Likely misconception:
Transfer outcome:
Motivating question:
Smallest faithful example:
Conceptual bottleneck:
Old approach and its limitation:
New idea the learner will invent:
Intuition → mechanism → formal statement:
Primary representation:
Prediction points:
Worked-to-independent progression:
Application or failure case:
Evidence of understanding:
Simplifications and limits:
```

Keep one primary question per lesson. Treat secondary questions as later lessons or optional depth.

## 3. Shape the discovery arc

### Establish the need

Open on a phenomenon the learner can inspect. Ask a question with a visible consequence. Let a reasonable naive method work on the easy case, then reveal the case where it becomes ambiguous, inefficient, or wrong.

### Constrain the invention

Give enough structure that the next idea is discoverable:

- show the relevant objects;
- hold irrelevant variables fixed;
- offer two or three plausible candidates;
- ask for a prediction;
- reveal evidence;
- name the relation the learner just used.

The learner need not invent historical notation or every algebraic step. They should reconstruct the reason the idea is shaped as it is.

### Formalize late but precisely

After the mechanism is visible:

1. name the concept;
2. state the exact definition;
3. map every term to the example;
4. calculate one case;
5. interpret the result behaviorally;
6. state a limit or edge case.

### Consolidate

Ask the learner to predict a changed example, explain the result, and identify the invariant. End with a compact mental model that can be retrieved without the original visual.

## 4. Design analogies

Use an analogy card:

```text
Purpose: the exact relation this analogy should make intuitive
Source: familiar system
Target: new system
Mapping: source object/relation → target object/relation
Prediction: what the mapping lets the learner infer
Boundary: where the mapping becomes false or misleading
Retirement: the target-language statement that replaces the analogy
```

Audit the analogy:

- Does it preserve causality or structure rather than color, shape, or mood?
- Does the learner know the source domain well enough?
- Does it introduce hidden misconceptions?
- Can it generate a correct prediction?
- Is the boundary stated near the analogy, not much later?

For tree learning, “twenty questions” can motivate sequential questions, but it does not explain greedy impurity reduction, learning from labeled data, or why locally best splits can be globally imperfect. State those limits.

## 5. Bridge to complex applications

Use a mechanism-preserving ladder:

1. **Toy case:** make every state and calculation inspectable.
2. **Authentic miniature:** use domain-shaped data small enough to trace manually.
3. **Implementation:** connect each conceptual step to state, code, and output.
4. **Real application:** frame the decision, constraints, and cost of error.
5. **Stress case:** violate an assumption or expose a failure mode.
6. **Transfer case:** change the surface domain and ask what stays invariant.

Do not leap from a toy dataset to “used in healthcare” or “used in finance.” Show how inputs become the same abstract objects, how the algorithm acts on them, and how the output affects a real decision.

For an algorithmic application, answer:

- What is one sample, feature, label, state, action, or reward here?
- Which calculation chooses the next step?
- What is observable in the trace?
- What error or bias matters in this domain?
- What alternative method would be more appropriate in a contrasting case?

## 6. Plan progression

Sequence a curriculum by growing the learner’s powers, not by following a glossary:

| Stage | Learner can | Guidance | Best evidence |
| --- | --- | --- | --- |
| Orient | recognize the problem and objects | strong cues, one concrete case | identify or predict |
| Explain | narrate the mechanism | worked example plus prompts | explain “why” |
| Execute | perform the procedure | faded steps, feedback | complete a near case |
| Diagnose | locate failure and tradeoffs | contrasting cases | explain an error |
| Transfer | apply structure in a new domain | sparse cues | solve and justify |
| Create | adapt or extend the method | constraints and critique | design and defend |

Revisit foundational ideas in later applications. Increase variation and independence while preserving explicit links to the invariant.

## 7. Review an existing lesson

Read it once as a novice and record every point where a new term, representation, or unexplained choice appears. Then inspect:

1. **Outcome:** Is the intended new capability observable?
2. **Motivation:** Does the learner feel why the idea is needed?
3. **Dependency:** Is any required idea introduced after it is used?
4. **Causality:** Can the learner say why each step follows?
5. **Representation:** Does each visual or formula have a unique job?
6. **Agency:** Does the learner make meaningful predictions or explanations?
7. **Transfer:** Does the lesson leave the original example?
8. **Truth:** Are intuition, formal claim, and implementation consistent?

Fix structural problems before polishing sentences. A clearer paragraph cannot repair a missing motivating question or dependency.
