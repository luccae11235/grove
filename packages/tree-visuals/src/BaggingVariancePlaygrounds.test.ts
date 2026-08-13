import { describe, expect, it } from "vitest";
import {
  adaptiveHistogramBinCount,
  bootstrapSample,
  createBaggingEpisode,
  fitRegressionTree,
  fittingFrameStride,
  fitRegressionTreeWithTrace,
  generateSineSample,
  histogramBins,
  predictTree,
  predictionMean,
  runBaggingExperiment,
  sampleVariance,
  speedFromSliderPosition,
} from "./BaggingVariancePlaygrounds";

describe("bagging variance playground calculations", () => {
  it("reproduces a seeded sine sample in sorted input order", () => {
    const first = generateSineSample(120);
    const second = generateSineSample(120);

    expect(first).toEqual(second);
    expect(first).toHaveLength(38);
    expect(first.every((point, index) => index === 0 || first[index - 1].x <= point.x)).toBe(true);
  });

  it("fits a deterministic regression tree and returns finite predictions", () => {
    const dataset = generateSineSample(120);
    const tree = fitRegressionTree(dataset);

    expect(tree.kind).toBe("split");
    expect(Number.isFinite(predictTree(tree, 0.8))).toBe(true);
    expect(predictTree(tree, -2)).not.toBe(predictTree(tree, 2));
  });

  it("builds a truthful depth-by-depth fitting trace whose last frame is the final tree", () => {
    const dataset = generateSineSample(120);
    const trace = fitRegressionTreeWithTrace(dataset);

    expect(trace.map((frame) => frame.depth)).toEqual([0, 1, 2, 3, 4]);
    expect(trace[0].tree.kind).toBe("leaf");
    expect(trace.at(-1)?.tree).toEqual(fitRegressionTree(dataset));
    expect(predictTree(trace.at(-1)!.tree, 0.8)).toBeCloseTo(
      predictTree(fitRegressionTree(dataset), 0.8),
      12,
    );
  });

  it("draws bootstrap rows from the original observations with replacement", () => {
    const original = generateSineSample(412, 8);
    const sample = bootstrapSample(original, 31);
    const originalIds = new Set(original.map((point) => point.id));
    const sampleIds = sample.map((point) => point.id);

    expect(sample).toHaveLength(original.length);
    expect(sampleIds.every((id) => originalIds.has(id))).toBe(true);
    expect(new Set(sampleIds).size).toBeLessThan(sampleIds.length);
  });

  it("computes population variance for the visible prediction history", () => {
    expect(sampleVariance([1, 2, 3])).toBeCloseTo(2 / 3, 12);
    expect(sampleVariance([4])).toBe(0);
  });

  it("maps the speed slider endpoints and midpoint to 0.25x, 1x, and 10x", () => {
    expect(speedFromSliderPosition(0)).toBeCloseTo(0.25, 12);
    expect(speedFromSliderPosition(50)).toBeCloseTo(1, 12);
    expect(speedFromSliderPosition(100)).toBeCloseTo(10, 12);
    expect(speedFromSliderPosition(75)).toBeCloseTo(Math.sqrt(10), 12);
    expect(speedFromSliderPosition(-10)).toBeCloseTo(0.25, 12);
    expect(speedFromSliderPosition(110)).toBeCloseTo(10, 12);
  });

  it("skips only intermediate fitting frames at high episode speeds", () => {
    expect(fittingFrameStride(25, 1)).toBe(1);
    expect(fittingFrameStride(25, 10)).toBe(5);
    expect(fittingFrameStride(5, 10)).toBe(1);
  });

  it("tracks the exact arithmetic mean of completed predictions", () => {
    expect(predictionMean([])).toBeUndefined();
    expect(predictionMean([0.5, 0.7, 1.2])).toBeCloseTo(0.8, 12);
  });

  it("places every committed prediction into exactly one aligned histogram bin", () => {
    const values = [-1.55, -0.4, 0, 0.2, 1.55];
    const bins = histogramBins(values);

    expect(bins.reduce((total, bin) => total + bin.count, 0)).toBe(values.length);
    expect(bins[0].count).toBe(1);
    expect(bins.at(-1)?.count).toBe(1);
  });

  it("adds histogram detail monotonically as episode evidence accumulates", () => {
    const counts = [0, 1, 25, 100, 200, 400, 10_000].map(adaptiveHistogramBinCount);

    expect(counts[0]).toBe(10);
    expect(counts.every((count, index) => index === 0 || count >= counts[index - 1])).toBe(true);
    expect(counts[4]).toBeGreaterThanOrEqual(30);
    expect(counts.at(-1)).toBe(42);

    const values = Array.from({ length: 200 }, (_, index) => -0.2 + index / 500);
    const bins = histogramBins(values, adaptiveHistogramBinCount(values.length));
    expect(bins.reduce((total, bin) => total + bin.count, 0)).toBe(values.length);
  });

  it("computes every selectable ensemble from nested bootstrap trees in one outer episode", () => {
    const episode = createBaggingEpisode(4);

    for (const count of [1, 2, 5, 10, 25]) {
      const expected = episode.bootstrapPredictions
        .slice(0, count)
        .reduce((sum, value) => sum + value, 0) / count;
      expect(episode.ensemblePredictions[count]).toBeCloseTo(expected, 12);
    }
  });

  it("uses nested tree sets so each displayed ensemble mean matches its members", () => {
    const experiment = runBaggingExperiment(8);
    const trial = experiment.trials[0];

    for (const count of experiment.treeCounts) {
      const expected = trial.treePredictions
        .slice(0, count)
        .reduce((sum, value) => sum + value, 0) / count;
      expect(trial.means[count]).toBeCloseTo(expected, 12);
    }
  });

  it("makes the repeated-dataset prediction distribution narrower as more trees are averaged", () => {
    const experiment = runBaggingExperiment();
    const variances = experiment.treeCounts.map((count) =>
      sampleVariance(experiment.distributions[count]),
    );

    expect(variances[1]).toBeLessThan(variances[0]);
    expect(variances[2]).toBeLessThan(variances[1]);
    expect(variances[3]).toBeLessThan(variances[2]);
  });
});
