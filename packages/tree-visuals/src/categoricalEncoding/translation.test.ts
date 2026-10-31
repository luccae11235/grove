import {describe,it,expect} from 'vitest';
import {translationFor} from './TranslationPlayground';

describe('compact category translation',()=>{
 it('keeps exact identity encodings and shares spelling evidence',()=>{
  expect(translationFor('target-free','one-hot').rows[0]).toEqual({input:'Ipê',output:'[1, 0, 0, 0]'});
  expect(translationFor('target-free','dummy').rows[3].output).toBe('[0, 0, 0]');
  expect(translationFor('target-free','similarity').rows.find(r=>r.input==='Cedroo')?.output).toBe('[0.8, 0]');
 });
 it('distinguishes new-observation maps from training-record encodings',()=>{
  expect(translationFor('supervised','mean').rows[0].output).toBe('0.75');
  const oof=translationFor('supervised','oof').rows;
  expect(oof[0]).toEqual({input:'Ipê · record 1',output:'0.5'});
  expect(oof[3].output).toBe('0.4');
  expect(translationFor('supervised','loo').rows.map(r=>r.output)).toEqual(['0.667','1']);
  expect(translationFor('supervised','ordered').rows.map(r=>r.output)).toEqual(['0.5','0.667','0.75','0.8']);
 });
 it('uses declared schematic parameters and preserves contextual differences',()=>{
  expect(translationFor('supervised','james-stein').rows[0].output).toBe('0.625');
  expect(translationFor('supervised','glmm').rows[0].output).toBe('0.6');
  expect(translationFor('learned','contextual').rows.map(r=>r.output)).toEqual(['[0.2, 0.8]','[0.6, 0.4]']);
  expect(translationFor('learned','pretrained').rows.at(-1)?.output).toBe('[0.4, 0.6]');
 });
});
