import { CATEGORIES, NAMES, ROWS, type Category } from './data';

export const TARGET_FREE_METHODS = ['ordinal', 'one-hot', 'dummy', 'binary', 'base-N', 'hashing', 'count', 'frequency', 'similarity'] as const;
export type TargetFreeMethod = typeof TARGET_FREE_METHODS[number];
export const CODE: Record<Category, number> = { A: 0, B: 1, C: 2, D: 3 };
// A deliberately fixed teaching map, rather than the output of a named hash function.
export const HASH_BUCKET: Record<Category, number> = { A: 0, B: 0, C: 1, D: 2 };
export const SIZE_CODE = { Small: 0, Medium: 1, Large: 2 } as const;

export function bigrams(value: string): Set<string> {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return new Set(Array.from({ length: Math.max(0, normalized.length - 1) }, (_, i) => normalized.slice(i, i + 2)));
}

export function similarity(a: string, b: string): number {
  const left = bigrams(a);
  const right = bigrams(b);
  const union = new Set([...left, ...right]);
  if (!union.size) return a.normalize('NFD').toLowerCase() === b.normalize('NFD').toLowerCase() ? 1 : 0;
  return [...left].filter(value => right.has(value)).length / union.size;
}

export function digits(value: number, base: number, width = 2): number[] {
  return Array.from({ length: width }, (_, i) => Math.floor(value / base ** (width - i - 1)) % base);
}

export function encodeTargetFree(method: TargetFreeMethod, category: Category, typed: string = NAMES[category]): number[] {
  switch (method) {
    case 'ordinal': return [CODE[category]];
    case 'one-hot': return CATEGORIES.map(c => Number(c === category));
    case 'dummy': return CATEGORIES.slice(0, -1).map(c => Number(c === category));
    case 'binary': return digits(CODE[category], 2);
    case 'base-N': return digits(CODE[category], 3);
    case 'hashing': return [0, 1, 2].map(bucket => Number(HASH_BUCKET[category] === bucket));
    case 'count': return [ROWS.filter(row => row.category === category).length];
    case 'frequency': return [ROWS.filter(row => row.category === category).length / ROWS.length];
    case 'similarity': return [similarity(typed, 'Cedro'), similarity(typed, 'Ipê')];
  }
}

export const TARGET_FREE_COPY: Record<TargetFreeMethod, {
  name: string; columns: string[]; equation: string; rule: string;
  feature: number; threshold: number; note: string; preserves: string;
}> = {
  ordinal: {
    name: 'Ordinal / integer codes', columns: ['Code'], equation: 'z(c) = r(c)',
    rule: 'Code ≤ 1.5', feature: 0, threshold: 1.5,
    preserves: 'Identity survives, but the code order restricts each threshold.',
    note: 'AC | BD cannot be made by one threshold in this order. A tree uses order, not a claim that code 2 has twice the effect of code 1.',
  },
  'one-hot': {
    name: 'One-hot', columns: ['A', 'B', 'C', 'D'], equation: 'zⱼ(c) = 1[c = cⱼ]',
    rule: 'Is A indicator ≤ 0.5?', feature: 0, threshold: 0.5,
    preserves: 'Each identity has its own indicator; no order is imposed.',
    note: 'A single indicator isolates one species. Grouping A and C requires more questions in a tree with one-feature splits. Sparse storage need not store every zero.',
  },
  dummy: {
    name: 'Dummy · D as reference', columns: ['A', 'B', 'C'], equation: 'One-hot with reference D omitted',
    rule: 'Is A indicator ≤ 0.5?', feature: 0, threshold: 0.5,
    preserves: 'Identity survives in K − 1 columns; D is represented by all zeros.',
    note: 'The D column alone is removed. This can avoid collinearity with a linear intercept, but trees do not require the omission.',
  },
  binary: {
    name: 'Binary · base 2', columns: ['High bit', 'Low bit'], equation: 'ID = 2 × high bit + low bit',
    rule: 'Low bit ≤ 0.5', feature: 1, threshold: 0.5,
    preserves: 'Identity fits in two bits; their grouping comes from the assigned IDs.',
    note: 'The low bit happens to produce AC | BD. This alignment was not learned from the outcomes.',
  },
  'base-N': {
    name: 'Base-N · base 3', columns: ['High trit', 'Low trit'], equation: 'ID = 3 × high trit + low trit',
    rule: 'Low trit ≤ 0.5', feature: 1, threshold: 0.5,
    preserves: 'Identity fits in two base-3 digits with this code convention.',
    note: 'The same IDs now create AD | BC on this digit. Compact codes do not discover semantic similarity; reserved extra IDs can require more digits.',
  },
  hashing: {
    name: 'Hashing · three buckets', columns: ['Bucket 0', 'Bucket 1', 'Bucket 2'], equation: 'zⱼ(c) = 1[h(c) = j]',
    rule: 'Bucket 0 indicator ≤ 0.5', feature: 0, threshold: 0.5,
    preserves: 'Width stays fixed, while A and B lose their separate identities.',
    note: 'This bucket map is illustrative. A and B collide, so a tree cannot distinguish them from these columns alone. Signed hashing is another variant.',
  },
  count: {
    name: 'Count', columns: ['Count'], equation: 'z(c) = n꜀',
    rule: 'Count ≤ 2.5', feature: 0, threshold: 2.5,
    preserves: 'The feature describes how common the category is in the training data.',
    note: 'Equal counts would merge categories. Prevalence is not a target association, and can change across populations.',
  },
  frequency: {
    name: 'Frequency', columns: ['Frequency'], equation: 'z(c) = n꜀ / 10',
    rule: 'Frequency ≤ 0.25', feature: 0, threshold: 0.25,
    preserves: 'Relative prevalence replaces identity in one column.',
    note: 'These frequencies have the same order as the counts. Exact threshold trees can make the same partitions on either scale.',
  },
  similarity: {
    name: 'Similarity · two prototypes', columns: ['Cedro', 'Ipê'], equation: 'sim(a,b) = |G(a) ∩ G(b)| / |G(a) ∪ G(b)|',
    rule: 'Similarity to Cedro ≤ 0.5', feature: 0, threshold: 0.5,
    preserves: 'Character resemblance is shared across spellings, including Cedroo.',
    note: 'Lowercase and remove accents; use bigram sets without boundary padding. Character proximity does not guarantee similar target behavior.',
  },
};

export function categoryPartition(method: TargetFreeMethod): { left: Category[]; right: Category[] } {
  const { feature, threshold } = TARGET_FREE_COPY[method];
  return {
    left: CATEGORIES.filter(c => encodeTargetFree(method, c)[feature] <= threshold),
    right: CATEGORIES.filter(c => encodeTargetFree(method, c)[feature] > threshold),
  };
}
