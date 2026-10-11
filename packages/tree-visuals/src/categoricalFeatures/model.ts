export const VISITS = [
  { id: 1, store: "A", purchase: 1 },
  { id: 2, store: "B", purchase: 0 },
  { id: 3, store: "A", purchase: 0 },
  { id: 4, store: "C", purchase: 1 },
  { id: 5, store: "B", purchase: 1 },
  { id: 6, store: "D", purchase: 0 },
] as const;

export type Store = "A" | "B" | "C" | "D";
export type QueryStore = Store | "E";
export type Encoding = "integer" | "one-hot" | "binary" | "frequency";
export type Codes = Record<Store, number>;
export type EncodedColumn = { key: string; label: string; values: number[] };

export const STORES: readonly Store[] = ["A", "B", "C", "D"];
export const DEFAULT_CODES: Codes = { A: 0, B: 1, C: 2, D: 3 };
export const DEFAULT_ORDER = [1, 2, 3, 4, 5, 6] as const;
export const ALTERNATE_ORDER = [4, 6, 2, 5, 1, 3] as const;
export const PRIOR = 0.5;
export const PRIOR_WEIGHT = 1;

export function swapCode(codes: Codes, store: Store, newCode: number): Codes {
  if (!Number.isInteger(newCode) || newCode < 0 || newCode > 3) {
    throw new Error("A store code must be an integer from 0 to 3.");
  }
  const other = STORES.find((candidate) => codes[candidate] === newCode);
  if (!other) throw new Error("Every code must belong to one store.");
  return { ...codes, [store]: newCode, [other]: codes[store] };
}

export function frequency(store: Store): number {
  return VISITS.filter((row) => row.store === store).length / VISITS.length;
}

export function columnsFor(encoding: Encoding, codes: Codes): EncodedColumn[] {
  if (encoding === "integer") {
    return [{ key: "code", label: "Integer code", values: VISITS.map((row) => codes[row.store]) }];
  }
  if (encoding === "one-hot") {
    return STORES.map((store) => ({
      key: store,
      label: `Store ${store}`,
      values: VISITS.map((row) => Number(row.store === store)),
    }));
  }
  if (encoding === "binary") {
    return [
      { key: "high", label: "First bit", values: VISITS.map((row) => (codes[row.store] >> 1) & 1) },
      { key: "low", label: "Second bit", values: VISITS.map((row) => codes[row.store] & 1) },
    ];
  }
  return [{ key: "frequency", label: "Frequency", values: VISITS.map((row) => frequency(row.store)) }];
}

export function splitAt(values: readonly number[], threshold: number): { left: number[]; right: number[] } {
  return {
    left: VISITS.filter((_, index) => values[index] < threshold).map((row) => row.id),
    right: VISITS.filter((_, index) => values[index] >= threshold).map((row) => row.id),
  };
}

export function thresholdChoices(encoding: Encoding): number[] {
  if (encoding === "integer") return [0.5, 1.5, 2.5];
  if (encoding === "frequency") return [0.25];
  return [0.5];
}

export function smoothed(sum: number, count: number, weight = PRIOR_WEIGHT): number {
  if (count + weight === 0 || weight < 0) throw new Error("Invalid smoothing weight.");
  return (sum + weight * PRIOR) / (count + weight);
}

export function orderedValue(order: readonly number[], position: number) {
  if (order.length !== VISITS.length || new Set(order).size !== VISITS.length ||
    order.some((id) => !VISITS.some((row) => row.id === id))) {
    throw new Error("An ordering must include each of the six rows exactly once.");
  }
  if (!Number.isInteger(position) || position < 0 || position >= order.length) {
    throw new Error("Position is outside the ordering.");
  }
  const row = VISITS.find((visit) => visit.id === order[position])!;
  const earlier = order.slice(0, position).map((id) => VISITS.find((visit) => visit.id === id)!);
  const contributing = earlier.filter((visit) => visit.store === row.store);
  const sum = contributing.reduce((total, visit) => total + visit.purchase, 0);
  return {
    row,
    contributingIds: contributing.map((visit) => visit.id),
    sum,
    count: contributing.length,
    value: smoothed(sum, contributing.length),
  };
}

export function inferenceValue(store: QueryStore) {
  const contributing = VISITS.filter((row) => row.store === store);
  const sum = contributing.reduce((total, row) => total + row.purchase, 0);
  return {
    store,
    contributingIds: contributing.map((row) => row.id),
    sum,
    count: contributing.length,
    value: smoothed(sum, contributing.length),
  };
}
