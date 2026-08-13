# How bagging makes decision-tree predictions more stable

Article ID: bagging-reduces-tree-variance
Status: revised interactive draft implemented
GitHub issue: #120
Article source: apps/web/src/content/articles/en/bagging-reduces-tree-variance.mdx
Plan owner: Aflora editorial
Last reviewed: 2026-08-13
Earliest publication date: 2026-08-26

## Lesson brief

```text
Learner: a reader who understands supervised learning and the basic behavior of
  a regression tree, but has not studied ensemble methods
Prior knowledge: fitted models depend on training data; averages combine numbers;
  variance describes spread
Likely misconception: many trees are more stable merely because the ensemble is
  larger, or bootstrap sampling by itself reduces variance
Transfer outcome: explain, from a new prediction distribution at a fixed input,
  why averaging varied tree predictions narrows that distribution and identify
  the independence assumption behind the sigma-squared-over-B result
Motivating question: if one tree changes when its training data changes, can we
  build a prediction that changes less?
Smallest faithful example: deep regression trees fitted to small noisy samples
  from one sine curve, with every prediction inspected at the same input x_0
Conceptual bottleneck: the unstable objects remain unstable; it is the average
  of their prediction fluctuations that has less variance
Old approach and its limitation: trust one fitted tree, whose early splits can
  change when a few training observations change
New idea the learner will invent: create varied training views with bootstrap
  samples, fit one tree to each, and average their predictions
Intuition → mechanism → formal statement: observe a wide pointwise prediction
  distribution → average high and low fluctuations → derive Var(T-bar_B)=sigma^2/B
  for independent, equal-variance tree predictions
Primary representation: the same sine curve, training-sample size, tree settings,
  fixed input x_0, prediction axis, and horizontal distribution scale throughout
Prediction points: predict the next tree's value after resampling; identify why
  repeated training on an unchanged dataset gives no diversity; rank the spread
  for B=1, 2, 5, and 25 before revealing it
Worked-to-independent progression: inspect resampled trees → trace three bootstrap
  samples → average two and five concrete predictions → interpret the general
  variance formula → diagnose a correlated-tree limit
Application or failure case: trees that fluctuate together leave a variance
  floor, motivating the later random-forest article
Evidence of understanding: explain what is fixed in pointwise variance; explain
  why replacement creates different trees; translate the factor 1/B into a
  distributional prediction; state why the result is an idealized benchmark
Simplifications and limits: synthetic regression, one fixed input, equal tree
  variances, independent predictions for the displayed derivation, no covariance
  formula, random-feature sampling, classification, OOB error, or boosting
```

## Editorial decisions from the initial sketch

- Use a decision tree from the first resampling scene instead of introducing a
  polynomial model and replacing it later. The polynomial adds a second model
  vocabulary but does not provide evidence needed for the transfer outcome.
- Introduce ensemble learning through the instability problem. Keep the opening
  distinction between bagging and boosting to one sentence near the boundary,
  after the reader understands what bagging is for.
- Keep two sources of variation explicit. Across experimental trials, a new
  training dataset is sampled from the sine process. Within each trial, bagging
  draws bootstrap samples from that dataset and averages the resulting trees.
- Treat `sigma^2(x_0) / B` as an idealized benchmark. Bootstrap trees share an
  original dataset and are correlated; the exact correlation result belongs to
  the planned follow-up article.
- Use the independent-tree formula once. Concrete cases for two and five trees
  should interpret the same equation rather than repeat the derivation.

## Discovery sequence

1. Encounter two trees trained by the same procedure on two samples from the
   same sine process; their predictions disagree at one fixed input.
2. Hold the process, algorithm, and input fixed. Name the spread across possible
   training datasets as pointwise model variance.
3. Explain why an early split change can propagate through a deep tree.
4. Ask how one observed dataset can produce several non-identical trees.
5. Invent bootstrap sampling by drawing the same number of rows with replacement.
6. Average two concrete tree predictions, then five, and predict what happens to
   the distribution across repeated training datasets.
7. Reveal the narrowing distributions for B = 1, 2, 5, and 25.
8. Derive `Var(T-bar_B(x_0)) = sigma^2(x_0) / B` under independence and equal
   variance, translating every algebraic step back to the visual.
9. Stress the independence assumption and use the remaining shared movement to
   motivate correlation and random forests without teaching them here.
10. End with an unfamiliar distribution comparison and ask the learner to explain
    which ensemble is more stable, what evidence supports the claim, and which
    assumption they cannot infer from the chart alone.

## Visual and interactive plan

All four visual scenes remain within the 720-pixel article measure. The two
computed experiments share one episode shell, axes, fixed input, data generator,
phase language, controls, and aligned horizontal histogram.

### 1. One tree feeds a prediction distribution — implemented

Learning question: Why can the same tree-learning procedure give different
predictions at one fixed input?

One episode samples 38 observations, learns a real regression tree depth by depth,
predicts at `x_0`, and transfers the prediction horizontally into a histogram that
uses the plot's exact y-scale. Repeated episodes change only the outer dataset.

The process starts paused at 0.25 episodes per second. Play/pause, one-episode,
reset, and a nonlinear speed slider provide only the agency needed to inspect and
then accumulate the loop. The slider maps 0.25× at the left, 1× at its midpoint,
and 10× at the right. High speed skips only intermediate display frames; the final
fitted model and recorded prediction remain exact. The true sine mean and nested
noise bands are optional.
Tree-leaf segments and their supporting observations are linked by pointer and
keyboard inspection.

The right-side metrics and explanatory cards from the first implementation are
removed. Phase, curve, points, transferred prediction, and growing histogram carry
the story directly. A dashed marker tracks the exact mean of all completed
predictions. Histogram bins become progressively narrower with sample count while
the plot and histogram preserve one shared y-domain.

### 2. Bootstrap sampling with replacement — implemented static figure

Learning question: What changes when sampling happens with replacement?

Two aligned rows show an observed dataset and a same-size bootstrap sample.
Repeated `C` observations share a restrained visual cue; absent `D` and `E`
observations are communicated by their absence and the text alternative. There
are no controls, tree glyphs, predictions, or out-of-bag statistics.

### 3. Several predictions become one — implemented static figure

Learning question: What is the aggregation step in bagging?

The compact figure appears only after bootstrap sampling and immediately before
the bagging equation. Three direct tree predictions flow into their arithmetic
mean. It introduces no decorative underlining and no competing explanation.

### 4. A bagged model feeds the same distribution — implemented

Learning question: Why does averaging more varied trees produce a more stable
final prediction?

The outer episode is visually identical to the single-tree experiment. Within
it, bootstrap samples are drawn without animating every draw, trees are fitted,
and the dark running-average curve updates while the current tree remains faint.
Only the final ensemble prediction transfers to the aligned histogram.

The learner selects `B = 1, 2, 5, 10, 25`. Every completed outer episode computes
all five nested ensemble sizes from the same bootstrap-tree sequence, so changing
`B` preserves a fair history instead of mixing unrelated trials. The article
distinguishes the within-episode average settling from the across-episode
distribution narrowing; accumulating more trials alone is not described as
variance reduction.

### Shared accessibility and truth contract

- SVG titles and descriptions state what is fixed and what changes.
- Direct labels, line form, point shape, position, and opacity supplement color.
- Controls have keyboard focus and at least 42-pixel targets; the plots support
  arrow-key leaf inspection and concise completion announcements.
- Reduced motion disables autoplay and replaces travel with a stepped transfer;
  one-episode playback preserves the causal sequence.
- Fixed seeds reproduce datasets, tree traces, bootstrap membership, exact means,
  histogram bins, and empirical variances outside the view.
- Browser checks cover KaTeX, episode state, the 0.25×–10× slider, high-speed
  accumulation, running means, adaptive bins, tree-count histories, 720-pixel
  containment, mobile overflow, and reduced motion.

## Mathematics and truth checks

- At a fixed input, define model variance over repeated training datasets before
  using `Var` without a subscript.
- Distinguish the original training dataset from each bootstrap sample in words
  and notation.
- Do not claim that bootstrap trees are independent. Independence is introduced
  only as a simplifying thought experiment for the `1 / B` derivation.
- Do not claim the observed empirical variances equal `sigma^2 / B` exactly.
- State that standard deviation shrinks like `1 / sqrt(B)` if width is discussed;
  the variance, not the raw width, shrinks like `1 / B`.
- State that averaging preserves the expected center under equal expected
  predictions; do not promise unchanged real-world bias for every bagging setup.

## Release contract

- The article remains `status: draft` with no `publishedAt` through the initial
  pull request into `develop`.
- A draft preview may use `SHOW_DRAFTS=true`; published-only staging and production
  must continue to hide the route, catalog card, sitemap entry, and feed entry.
- The exact pull-request revision must pass checks and be reviewed in Railway
  staging before merge to `develop`.
- Publication requires a separate issue-linked change no earlier than 2026-08-26,
  followed by the normal `develop` to `main` release path and explicit production
  approval.
- Drafting, merging, deploying, or publishing the website never authorizes a
  newsletter draft, schedule, or send.
