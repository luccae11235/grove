import { CATEGORIES, ROWS, summary, type Category } from './data';

export function entropy(counts: readonly number[]): number {
  const total = counts.reduce((sum, count) => sum + count, 0);
  return total ? -counts.reduce((sum, count) => count ? sum + (count / total) * Math.log2(count / total) : sum, 0) : 0;
}
export function categoryInformation() {
  const parent = summaryFor(CATEGORIES);
  const gain = entropy([parent.positive, parent.negative]) - CATEGORIES.reduce((sum, c) => {
    const stat = summary(c);
    return sum + stat.count / ROWS.length * entropy([stat.sum, stat.count - stat.sum]);
  }, 0);
  return {gain, gainRatio: gain / entropy(CATEGORIES.map(c => summary(c).count))};
}
export function summaryFor(categories: readonly Category[]) {
  const rows = ROWS.filter(row => categories.includes(row.category));
  const positive = rows.reduce((sum, row) => sum + row.target, 0);
  return {count: rows.length, positive, negative: rows.length - positive, ids: rows.map(row => row.id)};
}
export function gini(categories: readonly Category[]) {
  const stat = summaryFor(categories);
  return stat.count ? 2 * (stat.positive / stat.count) * (stat.negative / stat.count) : 0;
}
export function splitEvidence(left: readonly Category[]) {
  const right = CATEGORIES.filter(c => !left.includes(c));
  const weighted = (summaryFor(left).count * gini(left) + summaryFor(right).count * gini(right)) / ROWS.length;
  return {left: [...left], right, parent: gini(CATEGORIES), weighted, gain: gini(CATEGORIES) - weighted};
}
export function gradientRatio(category: Category) {
  const stat = summary(category);
  const gradient = 0.5 * stat.count - stat.sum;
  const hessian = 0.25 * stat.count;
  return {gradient, hessian, ratio: gradient / hessian};
}
