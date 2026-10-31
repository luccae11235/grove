import {describe, expect, it} from 'vitest';
import {categoryInformation, entropy, gradientRatio, splitEvidence, summaryFor} from './nativeModel';
import type {Category} from './data';

describe('native categorical snapshots', () => {
  it('derives multiway branch evidence from the same ten observations', () => {
    expect(summaryFor(['A'])).toMatchObject({count:4, positive:3, negative:1});
    expect(summaryFor(['B'])).toMatchObject({count:3, positive:0, negative:3});
    expect(summaryFor(['C'])).toMatchObject({count:2, positive:2, negative:0});
    expect(summaryFor(['D'])).toMatchObject({count:1, positive:0, negative:1});
    expect(entropy([5,5])).toBe(1);
    expect(entropy([0,0])).toBe(0);
    expect(categoryInformation().gain).toBeCloseTo(0.6754887502);
    expect(categoryInformation().gainRatio).toBeCloseTo(0.3658331654);
  });
  it('computes the AC versus BD partition and its Gini improvement', () => {
    expect(summaryFor(['A','C'])).toMatchObject({count:6,positive:5,negative:1});
    const split=splitEvidence(['A','C']);
    expect(split.right).toEqual(['B','D']);
    expect(split.parent).toBe(0.5);
    expect(split.weighted).toBeCloseTo(1/6);
    expect(split.gain).toBeCloseTo(1/3);
    expect(splitEvidence(['A']).gain).toBeLessThan(split.gain);
  });
  it('derives logistic gradient ordering without presenting a fitted boosting model', () => {
    expect((['C','A','B','D'] as Category[]).map(c => gradientRatio(c).ratio)).toEqual([-2,-1,2,2]);
    expect(gradientRatio('A')).toEqual({gradient:-1,hessian:1,ratio:-1});
    expect(gradientRatio('C')).toEqual({gradient:-1,hessian:0.5,ratio:-2});
  });
});
