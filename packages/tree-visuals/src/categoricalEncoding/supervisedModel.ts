import { CATEGORIES, ROWS, type Category } from './data';

export type SupervisedMethod = 'mean' | 'oof' | 'm-estimate' | 'woe' | 'loo' | 'james-stein' | 'glmm' | 'ordered';
export type EncodingMode = 'training' | 'inference';
export type QueryCategory = Category | 'E';
export const FOLDS = [[1, 4, 5, 6, 7], [2, 3, 8, 9, 10]] as const;
export const METHODS: { id: SupervisedMethod; label: string }[] = [
  { id: 'mean', label: 'Mean / target' },
  { id: 'oof', label: 'Target with OOF' },
  { id: 'm-estimate', label: 'M-estimate / smoothing' },
  { id: 'woe', label: 'Weight of Evidence' },
  { id: 'loo', label: 'Leave-one-out' },
  { id: 'james-stein', label: 'James–Stein (schematic)' },
  { id: 'glmm', label: 'GLMM effect (schematic)' },
  { id: 'ordered', label: 'Ordered target statistic' },
];
export const isSchematic = (method: SupervisedMethod) => method === 'james-stein' || method === 'glmm';

export function supervisedValue(method: SupervisedMethod, mode: EncodingMode, rowId: number, query: QueryCategory = 'A') {
  const row = ROWS.find(r => r.id === rowId);
  if (!row) throw new Error('Select one of the ten reference records.');
  const category: QueryCategory = mode === 'training' ? row.category : query;
  const allIds = ROWS.map(r => r.id);
  let authorizedIds: number[] = allIds;
  if (mode === 'training') {
    if (method === 'oof') {
      const heldOut = FOLDS.find(fold => (fold as readonly number[]).includes(rowId))!;
      authorizedIds = allIds.filter(id => !(heldOut as readonly number[]).includes(id));
    } else if (method === 'loo') authorizedIds = allIds.filter(id => id !== rowId);
    else if (method === 'ordered') authorizedIds = allIds.filter(id => id < rowId);
  }
  const ref = ROWS.filter(r => authorizedIds.includes(r.id));
  const categoryRows = ref.filter(r => r.category === category);
  const sum = categoryRows.reduce((s, r) => s + r.target, 0);
  const count = categoryRows.length;
  const globalMean = ref.length ? ref.reduce((s, r) => s + r.target, 0) / ref.length : 0.5;
  const raw = count ? sum / count : globalMean;
  let value = raw;
  let formula = count ? `${sum} / ${count}` : `No matching records → reference mean ${globalMean}`;
  let hypothetical = false;
  if (method === 'm-estimate') {
    value = (sum + 2 * globalMean) / (count + 2);
    formula = `(${sum} + 2 × ${globalMean}) / (${count} + 2)`;
  } else if (method === 'ordered') {
    value = (sum + 2 * 0.5) / (count + 2);
    formula = `(${sum} + 2 × 0.5) / (${count} + 2)`;
  } else if (method === 'woe') {
    const positives = ref.reduce((s, r) => s + r.target, 0);
    const negatives = ref.length - positives;
    value = category === 'E' ? 0 : Math.log(((sum + .5) / (positives + CATEGORIES.length * .5)) / ((count - sum + .5) / (negatives + CATEGORIES.length * .5)));
    formula = category === 'E' ? 'Unseen category → neutral fallback 0' : `log[((${sum} + 0.5) / ${positives + 2}) / ((${count - sum} + 0.5) / ${negatives + 2})]`;
  } else if (isSchematic(method)) {
    if (category !== 'A') throw new Error('The declared hypothetical parameters describe category A only.');
    hypothetical = true;
    value = method === 'james-stein' ? .625 : .6;
    formula = method === 'james-stein' ? '(1 − 0.5) × 0.75 + 0.5 × 0.5' : 'z(A) = û_A = 0.6; β₀ = 0';
    authorizedIds = [];
  }
  const directLeak = mode === 'training' && ['mean', 'm-estimate', 'woe'].includes(method);
  return { category, row, value, formula, raw, globalMean, count, sum, authorizedIds,
    contributingIds: hypothetical ? [] : categoryRows.map(r => r.id), hypothetical, directLeak };
}

export function inferenceMap(method: SupervisedMethod) {
  return (isSchematic(method) ? ['A'] as Category[] : CATEGORIES).map(category => supervisedValue(method, 'inference', 1, category));
}
