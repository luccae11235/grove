import {useId,useState} from 'react';
import {CATEGORIES,NAMES,format} from './data';
import {TARGET_FREE_METHODS,TARGET_FREE_COPY,encodeTargetFree,type TargetFreeMethod} from './targetFreeModel';
import {METHODS,supervisedValue,type SupervisedMethod} from './supervisedModel';
import styles from './TranslationPlayground.module.css';

type Family='target-free'|'supervised'|'learned';
type Entry={input:string;output:string};
const vectors={A:[.2,.8],B:[.8,.2],C:[.3,.7],D:[.7,.3]};
const vector=(values:number[])=>`[${values.map(format).join(', ')}]`;
export function translationFor(family:Family,method:string):{rows:Entry[];note:string;columns?:string} {
 if(family==='target-free') {
  const key=method as TargetFreeMethod;
  const rows=CATEGORIES.map(c=>{
   const values=encodeTargetFree(key,c);
   return {input:NAMES[c],output:values.length===1?format(values[0]):vector(values)};
  });
  if(key==='similarity') rows.splice(2,0,{input:'Cedroo',output:vector(encodeTargetFree(key,'B','Cedroo'))});
  return {rows,columns:TARGET_FREE_COPY[key].columns.join(' · '),note:key==='hashing'?'Fixed illustrative hash; different names can share the same representation.':key==='similarity'?'Similarity to Cedro and Ipê, in that order.':key==='dummy'?'Acácia is the omitted reference category.':'The same mapping is reused for each occurrence of a species.'};
 }
 if(family==='learned') {
  if(method==='contextual') return {rows:[{input:'Ipê · small specimen',output:vector([.2,.8])},{input:'Ipê · medium specimen',output:vector([.6,.4])}],note:'Schematic vectors: the same species can have a different representation in a different context.'};
  const rows=CATEGORIES.map(c=>({input:method==='pretrained'?`${NAMES[c]} + description`:NAMES[c],output:vector(vectors[c])}));
  if(method==='pretrained') rows.push({input:'New species + description',output:vector([.4,.6])});
  return {rows,note:method==='entity'?'Schematic lookup vectors; each species keeps the same vector across records.':'Schematic outputs from a fixed description encoder; no model is trained here.'};
 }
 const key=method as SupervisedMethod;
 if(key==='james-stein'||key==='glmm') return {rows:[{input:'Ipê',output:format(supervisedValue(key,'inference',1,'A').value)}],note:key==='james-stein'?'Hypothetical shrinkage weight 0.5; this parameter was not estimated here.':'Hypothetical category effect 0.6 on a log-odds scale, not a probability.'};
 if(key==='loo'||key==='ordered') {
  const ids=key==='loo'?[1,10]:[1,3,6,10];
  return {rows:ids.map(id=>({input:`Ipê · record ${id}`,output:format(supervisedValue(key,'training',id).value)})),note:key==='loo'?'Training features: each record uses the other Ipê outcomes.':'Training features: only earlier Ipê outcomes are used. Fixed prior 0.5, weight 2.'};
 }
 if(key==='oof') {
  const ids=[1,2,4,7];
  return {rows:ids.map(id=>{const result=supervisedValue(key,'training',id);return {input:`${NAMES[result.row.category]} · record ${id}`,output:format(result.value)};}),note:'Training features use the other fold: Ipê record 1 uses records 3 and 10 (0.5). Unseen Acácia uses its reference fold’s mean (0.4).'};
 }
 return {rows:CATEGORIES.map(c=>({input:NAMES[c],output:format(supervisedValue(key,'inference',1,c).value)})),note:key==='mean'?'For new observations, using the ten training outcomes as reference.':key==='m-estimate'?'For new observations, with prior 0.5 and prior weight 2.':'For new observations; positive values favor germination. Pseudocount 0.5.'};
}
export function TranslationPlayground({family}:{family:Family}) {
 const first=family==='target-free'?'one-hot':family==='supervised'?'mean':'entity';
 const [method,setMethod]=useState(first);
 const id=useId();
 const options=family==='target-free'?TARGET_FREE_METHODS.map(value=>({value,label:TARGET_FREE_COPY[value].name})):family==='supervised'?METHODS.map(m=>({value:m.id,label:m.label})):[{value:'entity',label:'Entity embedding'},{value:'pretrained',label:'Pretrained representation'},{value:'contextual',label:'Contextual embedding'}];
 const result=translationFor(family,method);
 return <section className={styles.playground} data-translation-family={family} data-translation-method={method} aria-label={`${family} category translation`}>
  <div className={styles.control}><label htmlFor={id}>Compare the representations</label><select id={id} value={method} onChange={event=>setMethod(event.target.value)}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
  <div className={styles.mapping} aria-live="polite" aria-atomic="true">
   <div className={styles.labels}><span>Category</span><span aria-hidden="true"/><span>{result.columns||'Representation'}</span></div>
   {result.rows.map(row=><div className={styles.row} key={row.input} data-translation-input={row.input}><span>{row.input}</span><span className={styles.arrow} aria-hidden="true">→</span><code>{row.output}</code></div>)}
  </div>
  <p className={styles.note}>{result.note}</p>
 </section>;
}
