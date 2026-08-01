import { describe, expect, it } from "vitest";
import { pairsAtLag, pearsonCorrelation } from "./AutocorrelationPlayground";
import { partialAutocorrelation, residualPairsAtLag } from "./PartialAutocorrelationPlayground";
import { generateAr1Series } from "./SyntheticArPlaygrounds";

describe("autocorrelation playground calculations", () => {
  it("constructs pairs with the requested gap", () => {
    expect(pairsAtLag([10, 20, 30, 40, 50], 2, 3)).toEqual([
      { index: 0, laterIndex: 2, left: 10, right: 30 },
      { index: 1, laterIndex: 3, left: 20, right: 40 },
      { index: 2, laterIndex: 4, left: 30, right: 50 },
    ]);
  });

  it("keeps an unscanned lag empty", () => {
    expect(pairsAtLag([10, 20, 30], 1, 0)).toEqual([]);
  });

  it("calculates positive and negative Pearson correlations", () => {
    expect(pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(pearsonCorrelation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1);
  });

  it("waits for at least two pairs before reporting a correlation", () => {
    expect(pearsonCorrelation([1], [2])).toBeNull();
  });

  it("uses one deterministic AR(1) sample whose autocorrelation decays across early lags", () => {
    const values = generateAr1Series().map((point) => point.value);
    const correlations = [1, 2, 3].map((lag) => pearsonCorrelation(
      values.slice(0, -lag),
      values.slice(lag),
    ));

    expect(correlations[0]).toBeCloseTo(0.8, 1);
    expect(correlations[1]).toBeCloseTo(0.64, 1);
    expect(correlations[2]).toBeCloseTo(0.512, 1);
  });

  it("makes lag-one partial autocorrelation equal ordinary autocorrelation", () => {
    const values = generateAr1Series().map((point) => point.value);
    const ordinary = pearsonCorrelation(values.slice(0, -1), values.slice(1));

    expect(partialAutocorrelation(values, 1, values.length - 1)).toBeCloseTo(ordinary ?? 0, 10);
  });

  it("removes the propagated AR(1) relationship at later lags", () => {
    const values = generateAr1Series().map((point) => point.value);
    const partials = [1, 2, 3].map((lag) =>
      partialAutocorrelation(values, lag, values.length - lag),
    );

    expect(partials[0]).toBeCloseTo(0.8, 1);
    expect(Math.abs(partials[1] ?? 1)).toBeLessThan(0.15);
    expect(Math.abs(partials[2] ?? 1)).toBeLessThan(0.15);
  });

  it("keeps endpoint residuals orthogonal to the middle observation", () => {
    const values = generateAr1Series().map((point) => point.value);
    const pairs = residualPairsAtLag(values, 2, values.length - 2);
    const middle = values.slice(1, -1);

    expect(pearsonCorrelation(pairs.map((pair) => pair.left), middle)).toBeCloseTo(0, 8);
    expect(pearsonCorrelation(pairs.map((pair) => pair.right), middle)).toBeCloseTo(0, 8);
  });
});
