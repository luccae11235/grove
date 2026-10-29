import { useId, useState } from 'react';
import { Frame } from './Frame';
import { CATEGORIES, NAMES, ROWS, format } from './data';
import { METHODS, inferenceMap, isSchematic, supervisedValue, type EncodingMode, type QueryCategory, type SupervisedMethod } from './supervisedModel';
import styles from './shared.module.css';
import local from './Supervised.module.css';

const HELP: Record<SupervisedMethod, string> = {
  mean: 'A category mean is useful for a new observation. Reusing the full map on its own training rows includes their answers.',
  oof: 'OOF is a protocol: hold out the selected row’s entire fold, then calculate its category mean from the other fold.',
  'm-estimate': 'The prior has weight m = 2. Shrinkage is stronger when a category has fewer observations; it does not by itself exclude a training label.',
  woe: 'Positive values favor the positive class, zero is neutral, and negative values favor the negative class. Pseudocount α = 0.5.',
  loo: 'Exclude only the current row. This keeps more data than two-fold OOF, but is not a general substitute for cross-fitting.',
  'james-stein': 'Illustrative weight B_A = 0.5. It was chosen for this diagram, not estimated from the ten records. A complete estimator needs additional assumptions.',
  glmm: 'Hypothetical β₀ = 0 and category effect û_A = 0.6. The returned feature is a log-odds effect, not a probability or a fitted result.',
  ordered: 'For training, only earlier rows can contribute. Prior p₀ = 0.5 was fixed in advance, with weight a = 2. The displayed order is illustrative.',
};

function Shrinkage({raw,value,prior}:{raw:number;value:number;prior:number}) {
  const id=useId();
  const x=(v:number)=>35+290*v;
  return <svg viewBox="0 0 360 124" role="img" aria-labelledby={id} className={local.shrinkage}>
    <title id={id}>Shrinkage moves category mean {format(raw)} toward prior {format(prior)}, giving {format(value)}.</title>
    <line x1="35" y1="64" x2="325" y2="64" stroke="currentColor" opacity=".3" />
    <line x1={x(prior)} y1="30" x2={x(prior)} y2="95" stroke="currentColor" strokeDasharray="3 4" opacity=".5" />
    <text x={x(prior)} y="18" textAnchor="middle" fontSize="12">Prior {format(prior)}</text>
    <circle cx={x(raw)} cy="64" r="6" fill="var(--surface-raised,#fff)" stroke="currentColor" strokeWidth="2" />
    <text x={Math.max(65,Math.min(295,x(raw)))} y="43" textAnchor="middle" fontSize="12">Mean {format(raw)}</text>
    <line x1={x(raw)} y1="64" x2={x(value)} y2="64" stroke="var(--accent,#237857)" strokeWidth="4" />
    <rect x={x(value)-5} y="59" width="10" height="10" fill="var(--accent,#237857)" />
    <text x={Math.max(60,Math.min(300,x(value)))} y="111" textAnchor="middle" fontSize="12">Encoded {format(value)}</text>
  </svg>;
}

export function SupervisedPlayground() {
  const [method,setMethod]=useState<SupervisedMethod>('oof');
  const [mode,setMode]=useState<EncodingMode>('training');
  const [rowId,setRowId]=useState(1);
  const [query,setQuery]=useState<QueryCategory>('A');
  const hypothetical=isSchematic(method);
  const result=supervisedValue(method,mode,rowId,query);
  const map=inferenceMap(method);
  const selectedFold=[1,4,5,6,7].includes(rowId)?'F₁':'F₂';
  const actualMode=hypothetical?'Hypothetical new-observation representation':mode==='training'?'Constructing a training feature':'Transforming a new observation';

  function changeMethod(next:SupervisedMethod) {
    setMethod(next);
    if(isSchematic(next)){setMode('inference');setQuery('A');setRowId(1);}
  }
  function reset() {setMethod('oof');setMode('training');setRowId(1);setQuery('A');}

  return <Frame family="supervised" title="Which outcomes may supply this feature?" question="Before changing the method, predict whether the selected record’s own outcome will be allowed to contribute.">
    <div data-supervised-method={method} data-mode={mode} data-row={rowId} data-value={result.value.toFixed(3)} data-contributors={result.contributingIds.join(',')}>
      <div className={styles.controls}>
        <label>Supervised method<select aria-label="Supervised encoding method" value={method} onChange={e=>changeMethod(e.target.value as SupervisedMethod)}>{METHODS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        <label>Use of the feature<select aria-label="Supervised encoding mode" value={mode} disabled={hypothetical} onChange={e=>setMode(e.target.value as EncodingMode)}><option value="training">Training record</option><option value="inference">New observation</option></select></label>
        {mode==='training'?<label>Reference record<select aria-label="Supervised reference record" value={rowId} onChange={e=>setRowId(Number(e.target.value))}>{ROWS.map(r=><option key={r.id} value={r.id}>{r.id} · {NAMES[r.category]}</option>)}</select></label>:<label>New observation’s species<select aria-label="Supervised new species" value={query} disabled={hypothetical} onChange={e=>setQuery(e.target.value as QueryCategory)}>{CATEGORIES.map(c=><option key={c} value={c}>{c} · {NAMES[c]}</option>)}<option value="E">E · unseen species</option></select></label>}
        <button type="button" onClick={reset}>Reset supervised</button>
      </div>
      <p className={local.mode}>{actualMode}{method==='oof'&&mode==='training'?` · hold out ${selectedFold}`:''}</p>
      <p className={styles.note}>{HELP[method]}</p>
      {method==='oof'&&mode==='training'&&<p className={styles.note}>F₁: records 1, 4, 5, 6, 7. F₂: records 2, 3, 8, 9, 10. A missing category uses the other fold’s mean, never the held-out labels.</p>}
      {method==='ordered'&&mode==='training'&&<div className={styles.controls} aria-label="Move through the illustrative order"><button type="button" disabled={rowId===1} onClick={()=>setRowId(rowId-1)}>Previous record</button><span className={styles.note}>Prefix before record {rowId}</span><button type="button" disabled={rowId===10} onClick={()=>setRowId(rowId+1)}>Next record</button></div>}
      <div className={styles.grid}>
        <div className={styles.scroll}>
          <table className={local.evidence}><caption>{hypothetical?'Reference data (parameters are not fitted here)':'Reference labels and their availability'}</caption>
            <thead><tr><th scope="col">Record</th><th scope="col">Species</th><th scope="col">Target</th><th scope="col">Evidence</th></tr></thead>
            <tbody>{ROWS.map(r=>{
              const allowed=result.authorizedIds.includes(r.id);
              const used=result.contributingIds.includes(r.id);
              const current=mode==='training'&&r.id===rowId;
              const evidence=hypothetical?'Not fitted':used?'Category':allowed?'Reference':'Blocked';
              return <tr key={r.id} className={current?local.current:used?styles.active:''} data-record={r.id} data-evidence={evidence.toLowerCase()} aria-current={current?'true':undefined}>
                <th scope="row">{r.id}{current?' ←':''}</th><td>{r.category} · {NAMES[r.category]}</td><td>{allowed?<strong>{r.target}</strong>:<span aria-label="Target excluded">—</span>}</td><td><span className={allowed?undefined:local.blocked}>{evidence}</span></td>
              </tr>;
            })}</tbody>
          </table>
          <p className={styles.note}>{hypothetical?'No labels estimate the hypothetical parameter in this diagram.':'“Category” labels enter the category statistic. Other permitted “Reference” labels can supply a prior or WoE class totals. Blocked labels cannot contribute.'}</p>
        </div>
        <div>
          <div className={styles.result} aria-live="polite" aria-atomic="true">
            <span className={local.outputLabel}>{result.category==='E'?'Unseen species':`${result.category} · ${NAMES[result.category]}`} → feature</span>
            <strong className={local.value} data-supervised-value>{format(result.value)}</strong>
            <p className={styles.equation}>{result.formula}</p>
            {!hypothetical&&<p className={styles.note}>Matching permitted records: {result.contributingIds.join(', ')||'none'}.</p>}
            {method==='oof'&&mode==='training'&&<p className={styles.note}>Full-training mean for {NAMES[result.row.category]}: {format(supervisedValue('mean','inference',1,result.row.category).value)}. This full map is for later observations.</p>}
            {hypothetical&&<p className={styles.note}>Hypothetical parameters · no model was trained.</p>}
          </div>
          {result.directLeak&&<p className={local.warning} role="note"><strong>Naive training example.</strong> Record {rowId} supplies its own target. This full-data map is not a safe procedure for constructing its training feature.</p>}
          {method==='loo'&&mode==='training'&&<p className={styles.note}>For Ipê, a positive training record receives 2/3; its negative record receives 1. Excluding one target changes the remaining mean according to the excluded answer.</p>}
          {(method==='m-estimate'||method==='james-stein')&&<Shrinkage raw={result.raw} value={result.value} prior={result.globalMean}/>}
          {method==='glmm'&&<p className={styles.note}>The probability would require the inverse logit of β₀ + û_A. The encoded feature shown here is the effect alone.</p>}
          <details className={local.mapping}><summary>{hypothetical?'Declared hypothetical mapping':'Full-training map for new observations'}</summary><table><caption>{hypothetical?'Not estimated from this dataset':'All ten outcomes are permitted training history for a later observation'}</caption><thead><tr><th scope="col">Species</th><th scope="col">Feature</th></tr></thead><tbody>{map.map(v=><tr key={v.category}><th scope="row">{v.category} · {NAMES[v.category as keyof typeof NAMES]}</th><td>{format(v.value)}</td></tr>)}</tbody></table></details>
        </div>
      </div>
      <p className={styles.note}>Choose the statistic, its regularization, and its label-access protocol separately. A realistic outer split must still respect entity groups and label availability over time.</p>
    </div>
  </Frame>;
}
