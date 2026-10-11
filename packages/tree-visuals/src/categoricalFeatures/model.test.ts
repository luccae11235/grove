import { describe, expect, it } from "vitest";
import {
  ALTERNATE_ORDER,
  columnsFor,
  DEFAULT_CODES,
  DEFAULT_ORDER,
  frequency,
  inferenceValue,
  orderedValue,
  smoothed,
  splitAt,
  swapCode,
  VISITS,
} from "./model";

describe("categorical feature demonstration", () => {
  it("keeps one six-row source and computes the default representations", () => {
    expect(VISITS.map((row) => `${row.store}${row.purchase}`)).toEqual(["A1", "B0", "A0", "C1", "B1", "D0"]);
    expect(["A", "B", "C", "D"].map((store) => frequency(store as "A" | "B" | "C" | "D"))).toEqual([1 / 3, 1 / 3, 1 / 6, 1 / 6]);
    expect(columnsFor("integer", DEFAULT_CODES)[0].values).toEqual([0, 1, 0, 2, 1, 3]);
    expect(columnsFor("one-hot", DEFAULT_CODES).map((column) => column.values[0])).toEqual([1, 0, 0, 0]);
    expect(columnsFor("binary", DEFAULT_CODES).map((column) => column.values)).toEqual([
      [0, 0, 0, 1, 0, 1],
      [0, 1, 0, 0, 1, 1],
    ]);
    expect(columnsFor("frequency", DEFAULT_CODES)[0].values).toEqual([1 / 3, 1 / 3, 1 / 3, 1 / 6, 1 / 3, 1 / 6]);
  });

  it("changes numeric partitions after a code swap but keeps categories and outcomes fixed", () => {
    const initial = splitAt(columnsFor("integer", DEFAULT_CODES)[0].values, 1.5);
    const changed = swapCode(DEFAULT_CODES, "B", 2);
    expect(initial).toEqual({ left: [1, 2, 3, 5], right: [4, 6] });
    expect(splitAt(columnsFor("integer", changed)[0].values, 1.5)).toEqual({
      left: [1, 3, 4],
      right: [2, 5, 6],
    });
    expect(changed).toEqual({ A: 0, B: 2, C: 1, D: 3 });
  });

  it("distinguishes smoothing from excluding the selected target", () => {
    expect(smoothed(1, 1, 0)).toBe(1);
    expect(smoothed(1, 1, 1)).toBe(0.75);
    expect(smoothed(0, 1, 1)).toBe(0.25);
    expect(smoothed(0, 0, 1)).toBe(0.5);
  });

  it("uses only earlier same-store rows for every training step and changes evidence under permutation", () => {
    expect(DEFAULT_ORDER.map((_, position) => orderedValue(DEFAULT_ORDER, position).value)).toEqual([
      0.5, 0.5, 0.75, 0.5, 0.25, 0.5,
    ]);
    expect(orderedValue(DEFAULT_ORDER, 2).contributingIds).toEqual([1]);
    expect(orderedValue(DEFAULT_ORDER, 4).contributingIds).toEqual([2]);
    expect(orderedValue(DEFAULT_ORDER, 3).contributingIds).toEqual([]);
    expect(orderedValue(ALTERNATE_ORDER, 0).row.id).toBe(4);
    expect(orderedValue(ALTERNATE_ORDER, 0).value).toBe(0.5);
    expect(orderedValue(ALTERNATE_ORDER, 3).contributingIds).toEqual([2]);
  });

  it("uses full training history for inference and the prior for unknown E", () => {
    expect(["A", "B", "C", "D", "E"].map((store) => inferenceValue(store as "A" | "B" | "C" | "D" | "E").value)).toEqual([
      0.5, 0.5, 0.75, 0.25, 0.5,
    ]);
    expect(inferenceValue("E")).toEqual({ store: "E", contributingIds: [], sum: 0, count: 0, value: 0.5 });
  });
});
