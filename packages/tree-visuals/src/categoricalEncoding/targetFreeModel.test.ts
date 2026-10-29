import { describe, expect, it } from 'vitest';
import { CATEGORIES, ROWS } from './data';
import { TARGET_FREE_METHODS, bigrams, categoryPartition, digits, encodeTargetFree, similarity } from './targetFreeModel';

describe('target-free categorical representations', () => {
  it('preserves the ten-record category counts without consulting targets', () => {
    expect(ROWS).toHaveLength(10);
    expect(CATEGORIES.map(c => encodeTargetFree('count', c)[0])).toEqual([4, 3, 2, 1]);
    expect(CATEGORIES.map(c => encodeTargetFree('frequency', c)[0])).toEqual([.4, .3, .2, .1]);
    expect(categoryPartition('count')).toEqual(categoryPartition('frequency'));
  });

  it('keeps identities separate in one-hot and removes only the D reference in dummy', () => {
    expect(encodeTargetFree('one-hot', 'A')).toEqual([1, 0, 0, 0]);
    expect(encodeTargetFree('one-hot', 'C')).toEqual([0, 0, 1, 0]);
    for (const category of CATEGORIES) expect(encodeTargetFree('dummy', category)).toEqual(encodeTargetFree('one-hot', category).slice(0, 3));
    expect(encodeTargetFree('dummy', 'D')).toEqual([0, 0, 0]);
    expect(categoryPartition('one-hot')).toEqual({left:['B','C','D'],right:['A']});
  });

  it('creates different available groups from integer and digit representations', () => {
    expect(categoryPartition('ordinal')).toEqual({left:['A','B'],right:['C','D']});
    expect(CATEGORIES.map(c => encodeTargetFree('binary', c))).toEqual([[0,0],[0,1],[1,0],[1,1]]);
    expect(CATEGORIES.map(c => encodeTargetFree('base-N', c))).toEqual([[0,0],[0,1],[0,2],[1,0]]);
    expect(categoryPartition('binary')).toEqual({left:['A','C'],right:['B','D']});
    expect(categoryPartition('base-N')).toEqual({left:['A','D'],right:['B','C']});
    expect(digits(8,3)).toEqual([2,2]);
  });

  it('makes the illustrative A/B hash collision irreversible in its representation', () => {
    expect(encodeTargetFree('hashing','A')).toEqual([1,0,0]);
    expect(encodeTargetFree('hashing','B')).toEqual(encodeTargetFree('hashing','A'));
    expect(encodeTargetFree('hashing','C')).toEqual([0,1,0]);
    expect(encodeTargetFree('hashing','D')).toEqual([0,0,1]);
  });

  it('normalizes accents and compares unpadded character bigram sets', () => {
    expect([...bigrams('Cédro')]).toEqual(['ce','ed','dr','ro']);
    expect([...bigrams('Cedroo')]).toEqual(['ce','ed','dr','ro','oo']);
    expect(similarity('Cedroo','Cedro')).toBe(.8);
    expect(encodeTargetFree('similarity','B','Cedroo')).toEqual([.8,0]);
    expect(similarity('Ipê','IPE')).toBe(1);
    expect(similarity('Ipê','Cedro')).toBe(0);
  });

  it('returns finite coordinates and partitions every category exactly once for every method', () => {
    for (const method of TARGET_FREE_METHODS) {
      for (const category of CATEGORIES) expect(encodeTargetFree(method,category).every(Number.isFinite)).toBe(true);
      const partition=categoryPartition(method);
      expect([...partition.left,...partition.right].sort()).toEqual(CATEGORIES);
    }
  });
});
