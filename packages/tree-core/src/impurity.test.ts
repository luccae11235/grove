import { describe, expect, it } from "vitest";
import { entropy, giniImpurity } from "./impurity";

describe("impurity criteria", () => {
  it("returns zero for a pure node", () => {
    expect(giniImpurity(["A", "A", "A"])).toBe(0);
    expect(entropy(["A", "A", "A"])).toBe(0);
  });

  it("matches the hand-calculated balanced binary case", () => {
    expect(giniImpurity(["A", "A", "B", "B"])).toBeCloseTo(0.5);
    expect(entropy(["A", "A", "B", "B"])).toBeCloseTo(1);
  });
});

