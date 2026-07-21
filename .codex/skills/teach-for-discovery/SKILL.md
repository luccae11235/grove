---
name: teach-for-discovery
description: Design, write, review, or implement intuitive lessons and learning experiences for complex technical, mathematical, algorithmic, or applied topics. Use when Codex needs to plan an explanation path, write an in-depth article or tutorial, teach with simple language, build conceptual intuition before formalism, create 3Blue1Brown-inspired guided rediscovery, choose or audit analogies, sequence a curriculum, connect theory to implementation and real-world applications, plan educational visualizations or interactions, write exercises and checks for understanding, or evaluate whether educational content produces durable understanding and transfer.
---

# Teach for Discovery

## Hold the north star

Create the conditions for the learner to reconstruct the idea, not merely receive it. Make each new concept feel like a reasonable response to a problem the learner already understands.

Preserve three kinds of integrity:

- Preserve conceptual integrity: distinguish intuition, analogy, empirical behavior, and formal claim.
- Preserve computational integrity: make every displayed result come from the real model or calculation whenever possible.
- Preserve learner integrity: never hide a necessary difficulty behind phrases such as “obviously,” “simply,” or “just.”

Treat guided rediscovery as structured instruction. Supply prompts, constraints, feedback, worked examples, and timely explanations; do not abandon novices to unguided exploration.

## Design before drafting

Build a compact lesson brief before writing prose or code. Infer reasonable details when the user has not supplied them, and label consequential assumptions.

1. Define the learner: prior knowledge, likely vocabulary, goals, and context.
2. Define one observable transfer outcome: what unfamiliar problem should the learner be able to explain, predict, debug, compare, or build afterward?
3. Identify the minimum prerequisites and the one or two conceptual bottlenecks.
4. Find a motivating problem whose attempted solution creates a genuine need for the target idea.
5. Choose the smallest concrete example that preserves the mechanism.
6. Trace the explanation path from existing knowledge to the transfer outcome. Remove interesting facts that do not support that path.
7. Select evidence of understanding before selecting presentation polish.

Read [lesson-architecture.md](references/lesson-architecture.md) when planning a complete lesson, curriculum sequence, complex application, or analogy.

## Build the discovery spine

Prefer this causal sequence, adapting its length to the task:

1. **Encounter:** Show a concrete phenomenon, decision, or puzzle.
2. **Predict:** Ask for a low-cost commitment before revealing the answer.
3. **Expose tension:** Let a plausible first approach fail, become inefficient, or reveal an unresolved choice.
4. **Invent:** Introduce the smallest new representation, quantity, or rule that resolves the tension.
5. **Make it visible:** Keep the relevant objects stable and animate or highlight only the meaningful change.
6. **Name and formalize:** Attach terminology and notation after their purpose is felt; connect every symbol to the concrete example.
7. **Test:** Ask the learner to explain a step, predict a change, or complete a partially worked case.
8. **Vary:** Change a surface feature while preserving the structure.
9. **Transfer:** Apply the idea in a less familiar case, implementation, failure analysis, or real application.
10. **Compress:** End with the smallest accurate mental model and its limits.

Do not manufacture drama. Use a failed approach only when it reveals the real reason the concept exists.

## Calibrate guidance to the learner

- For a novice, use one representation at a time, concrete cases, explicit cues, and worked examples.
- For a learner with foundations, ask more predictions, compare cases, and fade steps toward independent reasoning.
- For an expert, compress familiar prerequisites and spend attention on invariants, tradeoffs, edge cases, and transfer.
- For mixed audiences, write a clear main path and place derivations, proofs, implementation details, and edge cases in optional depth layers.

Keep the challenge in the target reasoning, not in decoding the interface, prose, notation, or visual layout.

## Use analogies as temporary models

Before using an analogy:

1. State what relation it must illuminate.
2. Choose a familiar source with the same causal or structural relations, not merely similar appearance.
3. Map source to target explicitly.
4. Use the mapping to make a prediction.
5. State where the analogy breaks.
6. Return to the real mechanism and vocabulary.

Prefer two contrasting concrete examples over a chain of different metaphors. Retire an analogy once the learner can reason in the target model.

## Plan visuals as evidence

Give every visual one pedagogical job expressed as a learner question. Specify what stays fixed, what changes, what the learner controls, what the visual makes observable, and what inference the learner should make.

Use animation to preserve object identity across change, compare synchronized representations, or reveal a process over time. Use interaction only when the learner’s action creates evidence: predict, manipulate, observe, explain. Avoid controls that merely decorate or replay narration.

Read [visualization-planning.md](references/visualization-planning.md) before designing or auditing a diagram, animation, chart, interactive, simulation, or synchronized code/model view.

## Write for understanding

Read [long-form-lesson-writing.md](references/long-form-lesson-writing.md) when drafting or substantially reformulating an in-depth article, tutorial, or chapter—especially when the experience must sustain a 15–30 minute learning arc, integrate mathematics with implementation, or place several interactive playgrounds inside one narrative.

- Lead with the learner’s question, not the textbook’s taxonomy.
- Put concrete before abstract and purpose before terminology.
- Use short, direct sentences, active verbs, and stable names for the same objects.
- Introduce one new load-bearing idea at a time.
- Define a term at first use in the sentence where it matters.
- Place labels and explanations next to the object or change they describe.
- Translate equations in both directions: words to symbols and symbols back to behavior.
- Separate the intuitive model from the exact claim, then reconcile them.
- Prefer “because,” “so,” and “therefore” to lists of disconnected facts.
- Never equate familiarity, smooth reading, or visual beauty with learning.

Read [learning-science.md](references/learning-science.md) when choosing instructional techniques, assessments, scaffolding, practice, or when reviewing claims about how people learn.

## Make applications teach the mechanism

Treat an application as a second explanation, not as a final name-drop.

1. State the application’s real decision or failure mode.
2. Map domain objects to the concept’s objects.
3. Run one small end-to-end case through the actual mechanism.
4. Show which assumption or tradeoff matters in practice.
5. Contrast a case where the method works with one where it fails or should not be used.
6. Return to the invariant that connects the application to the foundational example.

For algorithms, connect the same state across concept, calculation, code, trace, and visualization. Do not let an illustrative animation contradict the implementation.

## Require evidence of learning

Include checks that reveal reasoning rather than recognition:

- Ask for a prediction before a reveal.
- Ask “why this step?” during a worked example.
- Ask the learner to explain a visual change in words.
- Present a near-transfer case with one changed feature.
- Present a contrasting or failure case.
- Ask for unaided recall of the compact mental model.

Give feedback that names the misconception and points to the relevant relation. Do not merely mark an answer wrong.

## Run the final audit

Reject or revise the lesson if any answer is unclear:

- What can the learner do afterward that they could not do before?
- Why does each section exist on the shortest path to that outcome?
- Where does the learner think before being told?
- Is discovery guided enough to prevent floundering?
- Does every analogy preserve the important relations and declare its limits?
- Does every visual reveal evidence that prose alone would hide?
- Are words, symbols, visuals, code, and computed results mutually consistent?
- Does the lesson progress from example to mechanism to formalism to transfer?
- Are accessibility, mobile use, reduced motion, and non-color cues built into the design?
- Does the assessment test explanation or transfer rather than recall alone?
- Are simplifications and limits explicit?

When reviewing existing educational work, lead with the largest obstacle to understanding, explain why it blocks the learner, and propose the smallest structural revision that fixes the path.
