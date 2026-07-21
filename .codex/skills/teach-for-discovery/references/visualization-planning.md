# Visualization and Interaction Planning

Design visuals as external reasoning surfaces. A good educational visual makes a hidden relation inspectable and supports a specific inference.

## Contents

1. Start with the visual question
2. Choose a representation
3. Storyboard change
4. Design interaction
5. Synchronize representations
6. Specify and verify
7. Accessibility and restraint

## 1. Start with the visual question

Write one sentence before drawing:

> After seeing or manipulating this visual, the learner should be able to answer: ___?

Then define:

- **Evidence:** the visible change or comparison that supports the answer.
- **Inference:** the reasoning the learner must perform; do not state it too early.
- **Invariant:** what must remain visually stable while something else changes.
- **Misread:** the most likely incorrect interpretation.
- **Check:** the prediction or explanation that demonstrates understanding.

If the visual has no inference beyond “this is what it looks like,” prefer prose, a static example, or no visual.

## 2. Choose a representation

Match the representation to the relationship:

| Learning need | Prefer |
| --- | --- |
| compare exact values or mappings | table or aligned small multiples |
| see spatial partitions or geometry | plot with persistent objects and boundaries |
| follow state over time | stepper, trace, or restrained animation |
| understand hierarchy or recursion | tree with highlighted active path |
| see quantities compose | aligned bars, areas, or contributions |
| connect code to behavior | synchronized code, state, and output |
| explore sensitivity | one meaningful control with immediate result |
| understand a decision | candidate comparison with visible scoring evidence |

Use multiple representations only when the mapping between them is itself a learning goal. Align them spatially and highlight corresponding objects together.

## 3. Storyboard change

Build scenes around semantic changes, not narration timestamps:

```text
Scene question:
Initial state:
Learner prediction:
Action or transition:
Objects that persist:
Objects that change:
Attention cue:
Visible evidence:
Pause for explanation:
Next causal question:
```

Preserve object identity. Move or transform an existing mark when continuity matters; avoid replacing it with an unrelated drawing. Use color, motion, enclosure, or emphasis sparingly to direct attention to the current relation.

Animation earns its place when it shows continuity, causality, transformation, accumulation, or synchronized change. A static image is better for careful comparison or self-paced inspection.

## 4. Design interaction

Use the loop **predict → act → observe → explain → vary**.

Give a control only if changing it tests a hypothesis. For every control, specify:

- the learner question it answers;
- the model parameter or state it changes;
- the immediate visible consequence;
- the expected prediction;
- the misconception it can reveal;
- the reset or comparison state.

Prefer constrained choices early. Free-form sandboxes work better after the learner has a question and a model to test.

Keep the learning state explicit: current step, selected candidate, previous state, and consequence. Support forward, back, reset, and keyboard access when sequence matters.

## 5. Synchronize representations

When showing data space, model structure, calculation, trace, or code together:

1. Derive them from one source of truth.
2. Give the same entity the same stable label and non-color cue.
3. Highlight corresponding entities simultaneously.
4. Update all views atomically after one learner action.
5. Let the learner inspect the mapping between views.
6. State simplifications in the interface or nearby lesson text.

For a decision-tree split, a candidate threshold in the plot, partitioned samples, child counts, impurity calculation, gain, trace event, and tree node must all describe the same candidate and data state.

## 6. Specify and verify

Use this visual specification:

```text
Learning question:
Target inference:
Data/model source:
Initial state:
Marks and encodings:
Persistent objects:
Meaningful transitions:
Learner controls:
Prediction prompt:
Feedback:
Cross-view links:
Failure/edge state:
Text alternative:
Keyboard behavior:
Mobile layout:
Reduced-motion behavior:
Correctness checks:
```

Verify with three passes:

- **Truth pass:** recompute representative states and confirm every view matches.
- **Perception pass:** check hierarchy, labels, overlap, contrast, and likely misreads at mobile and desktop sizes.
- **Learning pass:** ask whether a learner can predict, observe evidence, and explain the target relation without narration rescuing the design.

## 7. Accessibility and restraint

- Never encode a class, state, or correctness by color alone; combine shape, pattern, label, or position.
- Provide text equivalents that communicate the same relationship, not only a generic caption.
- Keep focus order aligned with the explanatory sequence.
- Announce meaningful state changes without flooding assistive technology.
- Make targets large enough and controls operable by keyboard.
- Preserve the causal sequence under reduced motion with stepped states or crossfades.
- Avoid simultaneous movement of unrelated objects.
- Label axes, units, thresholds, and uncertainty where relevant.
- Prefer a few meaningful states over continuous controls whose extra precision teaches nothing.

Treat beauty as a consequence of clear structure, continuity, and restraint. Do not let decoration compete with evidence.
