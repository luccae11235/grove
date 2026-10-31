import { describe, expect, it } from 'vitest';
import { ROWS } from './data';
import { FOLDS, inferenceMap, supervisedValue } from './supervisedModel';

describe('supervised categorical encodings',()=>{
  it('uses a full training reference only for later observations',()=>{
    expect(inferenceMap('mean').map(v=>v.value)).toEqual([.75,0,1,0]);
    expect(supervisedValue('mean','training',1).directLeak).toBe(true);
    expect(supervisedValue('mean','training',1).contributingIds).toContain(1);
  });
  it('excludes every label from the selected OOF fold, including prior estimation',()=>{
    for(const row of ROWS){
      const result=supervisedValue('oof','training',row.id);
      const heldOut=FOLDS.find(f=>(f as readonly number[]).includes(row.id))!;
      expect(result.authorizedIds.every(id=>!(heldOut as readonly number[]).includes(id))).toBe(true);
      expect(result.contributingIds).not.toContain(row.id);
    }
    expect(supervisedValue('oof','training',1).contributingIds).toEqual([3,10]);
    expect(supervisedValue('oof','training',1).value).toBe(.5);
    expect(supervisedValue('oof','training',7).value).toBe(.4);
  });
  it('computes smoothing and WoE without claiming they remove self-labels',()=>{
    expect(supervisedValue('m-estimate','inference',1,'A').value).toBeCloseTo(2/3);
    expect(supervisedValue('m-estimate','inference',1,'D').value).toBeCloseTo(1/3);
    expect(supervisedValue('woe','inference',1,'A').value).toBeCloseTo(Math.log(3.5/1.5));
    expect(supervisedValue('m-estimate','training',1).directLeak).toBe(true);
    expect(supervisedValue('woe','training',1).directLeak).toBe(true);
  });
  it('exposes different leave-one-out values for positive and negative Ipe records',()=>{
    expect(supervisedValue('loo','training',1).value).toBeCloseTo(2/3);
    expect(supervisedValue('loo','training',10).value).toBe(1);
    expect(supervisedValue('loo','training',7).value).toBeCloseTo(5/9);
    for(const row of ROWS) expect(supervisedValue('loo','training',row.id).contributingIds).not.toContain(row.id);
  });
  it('uses only prefix labels and an advance-fixed prior for ordered statistics',()=>{
    expect(supervisedValue('ordered','training',1).value).toBe(.5);
    expect(supervisedValue('ordered','training',3).value).toBeCloseTo(2/3);
    expect(supervisedValue('ordered','training',3).contributingIds).toEqual([1]);
    for(const row of ROWS) expect(supervisedValue('ordered','training',row.id).authorizedIds.every(id=>id<row.id)).toBe(true);
    expect(supervisedValue('ordered','inference',1,'A').value).toBeCloseTo(2/3);
  });
  it('keeps hypothetical James-Stein and GLMM values separate from estimated statistics',()=>{
    expect(supervisedValue('james-stein','inference',1,'A').value).toBe(.625);
    expect(supervisedValue('glmm','inference',1,'A').value).toBe(.6);
    expect(supervisedValue('glmm','inference',1,'A').hypothetical).toBe(true);
    expect(supervisedValue('glmm','inference',1,'A').contributingIds).toEqual([]);
    expect(()=>supervisedValue('glmm','inference',1,'B')).toThrow();
  });
  it('has explicit unseen-category fallbacks',()=>{
    expect(supervisedValue('mean','inference',1,'E').value).toBe(.5);
    expect(supervisedValue('m-estimate','inference',1,'E').value).toBe(.5);
    expect(supervisedValue('ordered','inference',1,'E').value).toBe(.5);
    expect(supervisedValue('woe','inference',1,'E').value).toBe(0);
  });
});
