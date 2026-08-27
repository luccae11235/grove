# Gradient boosting visual system

This note locks the shared regression problem for issue #136 before the
remaining figures, animations, and playgrounds are built. Every artifact within
one experiment should import its generated data and fitted model states rather
than reproducing approximate coordinates by hand. The main explanation uses one
recurring problem; the Getting More Complex section uses one explicitly named
transfer problem because changing surface complexity is its learning job.
The classification section likewise uses one named binary counterpart across
its tables, functions, and playground rather than switching examples midstream.

## Lesson contract

- **Learner:** a reader who understands regression trees and residuals but has
  not yet connected residual fitting to function-space optimization.
- **Transfer outcome:** explain why a feature can predict an error, trace one
  additive correction, and predict how learning rate and tree count alter the
  ensemble's trajectory.
- **Conceptual bottleneck:** the next tree does not predict the original target.
  It uses the same input coordinate to predict the structured residuals left by
  the current ensemble.
- **Recurring question:** given what the model predicts now, what systematic
  correction can a shallow tree make next?

## Locked regression problem: `regime-shift-v1`

The recurring example is a one-dimensional, piecewise-shifted signal:

$$
f(x)
=
0.32x
+0.42\sin(1.7x)
+0.48\mathbf 1[x>0.35]
-0.52\mathbf 1[x>1.65],
\qquad -3\le x\le3.
$$

Observed targets add deterministic Gaussian noise with standard deviation
`0.19`. The training set contains 36 points and the held-out set contains 64
interleaved points. Their seeds, offsets, tree depth, and minimum leaf size are
versioned in `gradientBoosting/experiment.ts`.

This replaces a plain sine curve because it preserves the easy two-dimensional
view while making three facts easier to see:

1. The mean baseline leaves differently signed residuals in different regions.
2. A depth-two tree can express a useful but incomplete regional correction.
3. An aggressive update can overshoot one region, so a later tree must reverse
   direction there.

The discontinuities are deliberate. They make the example tree-shaped without
making it perfectly fit by one weak tree; the sinusoid and linear drift leave
within-region structure for later learners. The visual prose should call this a
"one-dimensional signal with a drift, a wave, and two level changes" rather
than asking the learner to decode the formula.

## Transfer problem: `layered-signal-v1`

The Getting More Complex playground keeps the familiar one-dimensional view but
uses a denser deterministic signal: a drift, two broad oscillatory scales, a
fine ripple, a localized rise, a narrow dip, and two level changes. It contains
72 training points and 120 interleaved held-out points with noise standard
deviation `0.13`.

This is the deliberate transfer step. The boosting procedure, depth-two base
learners, visual grammar, and controls remain familiar while the target now has
structure at several spatial scales. A few trees recover the dominant shape;
smaller local details need a larger budget. At learning rate `0.10`, held-out
RMSE reaches `0.143` at 100 trees and rises to `0.147` at 200 even while training
RMSE continues down. The playground can therefore show approximation and the
regularizing role of tree count without changing data mid-interaction.

## Classification problem: `regional-classes-v1`

The classification bridge uses forty deterministic training observations and
eighty held-out observations on the same input domain, $-3\le x\le3$. Their
class-one probability combines drift, a wave, and two level changes before a
seeded Bernoulli draw produces the observed binary labels. Sixteen of the forty
training observations belong to class 1, fixing the shared baseline at
$p_0=0.40$ and $F_0=\operatorname{logit}(0.40)=-0.405$.

Every classification artifact comes from this run. The progressive arithmetic
tables highlight five rows from the full dataset; they are not a second toy
dataset. Depth-two trees with at least four observations per leaf fit the
first-order signal $y-p$. With learning rate `0.80`, the fitted leaf means are
added to the logit, and sigmoid converts the accumulated score into the plotted
probability. This teaching implementation intentionally does not substitute
Newton leaf values.

The probability plot, pseudo-residual plot, table updates, contribution strip,
and log loss all use the same stored stages. Class 0 uses hollow circles while
class 1 uses filled diamonds, so class identity does not depend on color.

## Parameter evidence

All regression measurements below use depth-two trees with at least three
training points per leaf.

For the isolated first correction, the fitted tree is fixed and only its scale
changes:

| Learning rate | Held-out RMSE after the first tree |
| ---: | ---: |
| 0.95 | 0.243 |
| 1.00 | 0.247 |
| 1.40 | 0.401 |

The small improvement at `0.95` is intentionally modest. It establishes that a
sub-unit step can transfer better without pretending that one-tree shrinkage is
the main reason practical ensembles often use much smaller rates.

The later tree-count experiment uses the same data to expose the larger
interaction between learning rate and boosting budget:

| Learning rate | Held-out RMSE after 4 trees | Held-out RMSE after 40 trees |
| ---: | ---: | ---: |
| 0.10 | 0.470 | 0.196 |
| 0.30 | 0.238 | 0.218 |
| 1.00 | 0.237 | 0.251 |

These states support both sides of the learning-rate story. With only four
trees, `0.10` has barely moved from the baseline. With a budget of 40 trees, it
beats the full-size update on held-out data even though the full-size update
drives training error lower. At `eta = 1.30`, the first correction at `x = 0.8`
is positive and the second is negative, giving the later-correction visual a
real reversal rather than a drawn fiction.

These values are pedagogical evidence from this fixed experiment, not a claim
that `0.10` is universally optimal.

## Shared visual grammar

- Keep the input domain, axes, points, and scale fixed whenever states are
  compared.
- Use dark green for the current model, amber for the correction currently
  under inspection, and a muted dashed line for the previous model.
- Use position and line style in addition to color. Residuals are vertical
  segments; tree predictions are step functions; observed targets are circles.
- Reveal only one new relationship per figure. Avoid legends when a direct
  label can sit beside the relevant line.
- Use the held-out points alone in the shrinkage comparison. Training points
  would add a second point vocabulary without helping answer that question.
- Preserve the same computed state for desktop, mobile, keyboard, reduced
  motion, and text alternatives.

## Artifact map

| Article moment | Learner question | Shared source | Smallest representation |
| --- | --- | --- | --- |
| Starting Simple · standalone tree | What shape can one regression tree predict? | Training points; depth-three fit to `y` | Points plus one step line |
| Starting Simple · data table | What are the raw columns? | Training points | Remove: the plot already establishes `x` and `y` and the table adds no inference |
| Starting Simple · baseline | What is wrong with one constant prediction? | Training points; `F0` | Points, mean line, residual segments |
| Starting Simple · residual space | Do the errors depend on `x`? | Baseline residuals | Same points moved around a zero line |
| Starting Simple · first tree | Can a tree generalize those errors by region? | First residual tree | Residual points plus one step line |
| Starting Simple · first update | How does a correction become a better model? | `F0 + h1` | Previous line and updated step line |
| Nothing Is That Simple · two static comparisons | How does a full step compare with shrinkage? | Held-out runs | Remove: the learning-rate playground already provides the exact aligned comparison without duplicating two frozen slider states |
| Learning-rate playground | How does `eta` scale one already learned correction? | Fixed `F0` and `h1`; `F1 = F0 + eta h1` | One slider, held-out prediction plot, residual histogram, held-out RMSE |
| More Trees · residual round two | What target does tree two receive? | Residuals before stage two | Current model beside residual space |
| More Trees · correction reversal | Can a later tree undo an earlier move? | `eta=1.30`, stages one and two | Stable baseline with two signed correction segments |
| More Trees · process animation | What changes during one boosting round? | Stage trace | Stepper/animation: predict → residuals → tree → add |
| More Trees · error animation | Do remaining errors contract as trees accumulate? | Same stage trace | Residual histogram plus held-out RMSE trajectory |
| Tree-count and rate playground | How do `eta` and tree count work together? | Stages one through four across `eta` | Tree-count choices, one `eta` slider, synchronized prediction/residual views |
| Getting More Complex playground | How do many shallow trees build structure at several spatial scales? | Transfer dataset `layered-signal-v1`, up to 200 stages | Familiar prediction/residual views, tree-budget slider, learning-rate slider, compressed additive strip |
| Classification bridge | Why update logits rather than probabilities? | `regional-classes-v1` | Two aligned number lines and the transformation arrows |
| Sigmoid and logit | How do the two spaces map? | Analytic functions | Two directly labeled curves |
| Classification arithmetic tables | How does one pseudo-residual update a probability? | Five highlighted rows from `regional-classes-v1` | One progressively extended table, not four unrelated drawings |
| Classification playground | Does the same correction loop survive a new loss? | `regional-classes-v1` | Probability curve, staged pseudo-residuals, and logit contribution strip |
| General gradient framework | What changes when the loss changes? | Analytic summary | One correction loop with the loss as the only replaceable input |

The first five computed regression figures and the learning-rate playground
form the initial implementation slice. Later artifacts must reuse the same exported
experiment rather than introduce new samples or refit settings.

The first learning-rate playground isolates one update: `F0` and `h1` remain
fixed while `eta` changes only the height of the four regional steps. The
multi-tree playground later in the article will handle the separate fact that
changing `eta` also changes the residuals and fitted trees in subsequent rounds.
