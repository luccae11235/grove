# Grove curriculum plan

This document separates the educational sequence from the product-delivery
roadmap. It is deliberately more detailed for the introduction and first lesson;
later chapters retain room for evidence from learner use.

## Learner and north star

- **Learner:** a curious beginner who can read a chart and follow a yes/no rule;
  Python knowledge is helpful only in the implementation labs.
- **Likely misconception:** a tree is a hand-written flowchart or a picture the
  model designer chooses, rather than a structure learned from labeled examples.
- **Long-term transfer outcome:** given an unfamiliar tabular problem, the learner
  can choose between a single tree, a bagged ensemble, and a boosted ensemble;
  explain the mechanism behind that choice; inspect a prediction; and diagnose a
  likely failure mode.
- **Foundational bottleneck:** understanding that learning a tree means searching
  over candidate partitions and preferring the partition that improves an explicit
  objective—not drawing branches by intuition alone.

## Curriculum spine

The left navigation is the compact public version of this sequence.

### 0. Start

1. **Introduction:** establish the promise, prerequisites, learning method, and
   complete route.
2. **Learning path:** show how each part resolves a limitation exposed by the
   previous part.

### I. Decision-tree foundations

1. **How a classification tree learns:** carry one greenhouse table from candidate
   thresholds through Gini gain, recursive growth, and from-scratch code. Three
   synchronized playgrounds keep the same row IDs and model state visible while
   the learner moves from human pattern recognition to an automated search.
2. **Control overfitting:** vary depth and minimum leaf size; compare training fit
   with behavior on unseen data; introduce pruning after the need is visible.
3. **Work with incomplete rows:** compare explicit missing-data strategies and
   introduce learned default routes only after ordinary numeric routing is secure.
4. **Interpret a fitted tree:** derive impurity-based importance from real split
   gains, then expose opportunity bias, correlated features, and causal limits.
5. **Regression trees:** preserve the partitioning mechanism while changing the
   leaf prediction and split objective.

Gini versus entropy remains available as a compact appendix, not as a prerequisite
that interrupts the first article's narrative.

### II. From-scratch implementation labs

1. **Search for a split:** thresholds, partitions, scoring, deterministic ties,
   and computational cost.
2. **Build recursively:** node representation, stopping rules, classification,
   regression, and prediction traversal.
3. **Test and visualize:** invariants, edge cases, serializable training traces,
   and one source of truth across code, calculation, and visual.

The conceptual lessons should not depend on reading code. The labs should refer
back to the same named state—samples, candidate, node, branch, leaf, gain—so code
becomes a second representation of a known mechanism.

### III. Bagging

1. **Why use many trees?** expose the instability of a deep tree under small data
   changes.
2. **Bootstrap and bagging:** create varied training sets, fit trees in parallel,
   and aggregate predictions to reduce variance.
3. **Random forests:** add random feature selection and explain why less-correlated
   errors make averaging more effective.

### IV. Boosting

1. **Learn from mistakes:** fit a small tree to the current errors and add its
   correction to the model.
2. **Gradient boosting:** connect residual correction to an optimization objective.
3. **Tune the ensemble:** reason about learning rate, weak-learner complexity,
   ensemble length, regularization, and overfitting.

### V. Applications and transfer

1. **Diagnose a model:** leakage, imbalance, instability, missing coverage, and
   inability to extrapolate.
2. **Explain predictions:** decision paths, global importance, local explanations,
   and the boundary between explanation and causality.
3. **Case studies:** carry one authentic miniature from problem definition through
   error analysis, including a case where trees are not the best method.
4. **Reinforcement learning specialization:** map samples, features, targets, and
   errors explicitly before using trees for values, policies, or transition models.

## Introduction page brief

**Primary question:** What path will turn tree-based models from a black box into
something I can explain and build?

**Job of the page:** orient rather than teach the algorithm. It should:

1. begin with the familiar shape of a yes/no decision;
2. promise a path from one question to ensembles and applications;
3. declare that no ML background is required and that Python enters later;
4. preview the concrete seedling problem without revealing any mathematics;
5. show the four-part discovery cycle: encounter, predict, explain, build;
6. state the computational-integrity promise that the visual runs on generated
   output from the displayed Python implementation;
7. offer one unambiguous next action: begin lesson 1.

Evidence that the introduction works: a learner can say where they are starting,
what later ideas grow from the first tree, and how the lesson will ask them to
participate.

## Lesson 1 brief — How a classification tree learns

```text
Learner: curious beginner or practitioner who has used trees as a black box
Prior knowledge: comparing ordinary numbers and following a yes/no instruction;
  chart reading, probability language, and mathematical notation are taught in place
Likely misconception: the author draws the tree by hand
Transfer outcome: reconstruct, implement, and explain a numeric classification tree
  end to end from the purpose of finding useful boundaries in labeled data
Motivating question: can one reusable yes/no question organize ten past outcomes?
Smallest faithful example: ten seedlings, two numeric features, and two observed labels
Conceptual bottleneck: the question is learned by comparing candidate partitions
Old approach and limitation: one rule per row memorizes rather than generalizes
New idea the learner will invent: choose a threshold that leaves consistent groups
Intuition → mechanism → formal statement: group similar outcomes → search and score
  thresholds → weighted impurity gain → recursive growth → prediction traversal
Primary representation: a fixed table synchronized with candidate routes, impurity
  arithmetic, persistent row IDs, and the growing tree
Prediction points: place a threshold before formulas appear; choose a feature before
  scoring; predict a new row's complete path
Worked-to-independent progression: constrained threshold search → hand calculation →
  scored candidate comparison → stepped tree growth → implementation and transfer trace
Application or failure case: recorded greenhouse outcomes predict but do not prove cause
Evidence of understanding: learner proposes a threshold visually, calculates why
  3.5 wins, explains the two committed splits, and implements training and traversal
Simplifications and limits: tiny numeric dataset, binary target, greedy growth,
  teaching-first candidate search, no claim of causal or production performance
```

### Discovery sequence

1. **Encounter:** ask the learner to find a reusable pattern in the greenhouse rows
   before naming tree anatomy or showing an impurity metric.
2. **Predict:** choose a column and place a threshold using only class consistency.
3. **Observe:** keep rows, labels, and IDs fixed while the satisfying rows highlight
   and the two class counts update without formulas.
4. **Formalize:** expose the need to automate “cleaner,” derive Gini from mismatch
   probability, and calculate weighted gain on the winning 3.5-hour partition.
5. **Automate:** score the same candidates numerically, enumerate the local search,
   and name the resulting root, branches, leaves, and decision stump.
6. **Grow:** reuse the local search recursively and let stable row IDs fall into
   the frontier nodes after each committed split.
7. **Implement:** connect thresholds, index partitions, recursion, stopping rules,
   leaf prediction, and traversal to the executed Python source.
8. **Test and transfer:** trace a novel row, explain greedy and overfitting limits,
   and retrieve the complete training loop without the visual.

### Visualization specification

- **Learning questions:** Can a person see a useful threshold before knowing the
  algorithm? How can “cleaner groups” become a score? How does that one operation
  create a full tree?
- **Target inference:** a classification tree is an automated search for useful
  boundaries, and its full shape emerges from recursive local comparisons.
- **Source:** deterministic candidates, scores, selected tree, and Python excerpt
  generated by `scripts/build_lesson_data.py` from `packages/tree-core/grove`.
- **Invariant:** samples, coordinates, labels, shapes, axes, and plot scale.
- **Changes:** selected feature and threshold, full-row match highlighting, yes/no
  routes, class counts, impurity arithmetic, and visible frontier nodes.
- **Controls:** feature selectors, threshold sliders, best-split reveals, and
  step/back/play/reset tree growth.
- **Non-color cues:** thriving uses circles and struggling uses squares; groups
  include text counts and yes/no labels.
- **Text alternative:** SVG title/description plus exact counts in adjacent cards.
- **Keyboard:** native buttons, pressed states, visible focus, native disclosures.
- **Mobile:** candidate and visual grids collapse into the causal reading order.
- **Reduced motion:** no essential animation; every change is a complete static state.
- **Correctness:** every candidate and result comes from the generated training trace;
  the browser does not reimplement impurity or split selection.

## Review gates for the first release

- The learner predicts before the winner appears.
- New vocabulary is introduced only after the learner uses the underlying relation.
- Every formula maps its terms back to stable seedling rows and computed candidates.
- Tree structure, routes, group counts, scores, source, and tests agree.
- The first playground contains no Gini, entropy, or gain vocabulary.
- Missing-data routing and feature importance remain separate future lessons.
- The implementation path is visible but optional.
- A reasoning check requires explanation rather than recognition.
- The lesson states the toy dataset's simplifications and the causal boundary.
