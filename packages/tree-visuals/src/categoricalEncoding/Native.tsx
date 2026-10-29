import {useId, useState} from 'react';
import {Frame} from './Frame';
import {CATEGORIES, NAMES, summary, format, type Category} from './data';
import {categoryInformation, gradientRatio, splitEvidence, summaryFor} from './nativeModel';
import shared from './shared.module.css';
import styles from './Visuals.module.css';

type Method='id3'|'c45'|'cart'|'hist'|'lightgbm'|'xgboost'|'catboost';
const METHODS:{value:Method;label:string}[]=[{value:'id3',label:'ID3'},{value:'c45',label:'C4.5'},{value:'cart',label:'Classical categorical CART'},{value:'hist',label:'HistGradientBoosting'},{value:'lightgbm',label:'LightGBM'},{value:'xgboost',label:'XGBoost'},{value:'catboost',label:'CatBoost'}];
function Branch({categories,label}:{categories:Category[];label?:string}) {
 const stat=summaryFor(categories);
 return <div className={styles.branch}><strong>{label??categories.join(' + ')}</strong><div className={styles.groupNames}>{categories.map(c=>NAMES[c]).join(', ')}</div><p>{stat.count} records · {stat.positive} germinated<br/>{stat.negative} did not germinate</p></div>;
}
function BinaryNode({question,left}:{question:string;left:Category[]}) {
 const right=CATEGORIES.filter(c=>!left.includes(c));
 return <div><p className={styles.question}>{question}</p><div className={styles.branches}><Branch categories={left} label={`Yes · ${left.join(' + ')}`}/><Branch categories={right} label={`No · ${right.join(' + ')}`}/></div></div>;
}
function CategoryOrder({categories,cut}:{categories:Category[];cut:number}) {
 return <div className={styles.order}>{categories.map((c,i)=><span key={c}>{i===cut&&<b aria-label="cut">│ </b>}{c}</span>)}</div>;
}
export function NativePlayground() {
 const [method,setMethod]=useState<Method>('cart');
 const id=useId();
 const info=categoryInformation();
 const split=splitEvidence(['A','C']);
 const multi=method==='id3'||method==='c45';
 return <Frame family="native" title="Change the question a node is allowed to ask" question="Can one node put Ipê and Jacarandá together, apart from Cedro and Acácia?">
  <div className={shared.controls}><label htmlFor={id}>Tree mechanism<select id={id} aria-label="Native tree mechanism" value={method} onChange={event=>setMethod(event.target.value as Method)}>{METHODS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
  <div className={`${shared.scroll} ${styles.nativeTable}`}><table><caption>The same ten fictional seed records, grouped by species</caption><thead><tr><th scope="col">Species</th>{CATEGORIES.map(c=><th scope="col" key={c}>{c}<span>{NAMES[c]}</span></th>)}</tr></thead><tbody><tr><th scope="row">Records</th>{CATEGORIES.map(c=><td key={c}>{summary(c).count}</td>)}</tr><tr><th scope="row">Germinated</th>{CATEGORIES.map(c=><td key={c}>{summary(c).sum}</td>)}</tr></tbody></table></div>
  <div className={styles.mechanism} data-native-method={method} aria-live="polite">
   {multi?<>
    <p className={styles.question}>Which species?</p>
    <div className={`${styles.branches} ${styles.multiway}`}>{CATEGORIES.map(c=><Branch key={c} categories={[c]}/>)}</div>
    <div className={styles.scores}><span>{method==='id3'?'Information gain':'Gain ratio'}<strong>{format(method==='id3'?info.gain:info.gainRatio)}{method==='id3'?' bit':''}</strong></span></div>
   </>:method==='catboost'?<>
    <p className={styles.orderingLabel}>Two possible internal treatments; configuration decides</p>
    <div className={styles.path}><div className={styles.pathBox}><strong>Category A · Ipê</strong><p>One-hot route</p></div><span className={styles.pathArrow} aria-hidden="true">→</span><div className={styles.pathBox}><strong>A indicator = 1</strong><p>Numeric test: indicator(A) &gt; 0.5<br/>A versus B + C + D</p></div></div>
    <div className={styles.path}><div className={styles.pathBox}><strong>Category A + allowed history</strong><p>Ordered-statistic route</p></div><span className={styles.pathArrow} aria-hidden="true">→</span><div className={styles.pathBox}><strong>Row 1: 0.5 · Row 3: 0.667</strong><p>A numeric test such as statistic &gt; 0.6 can route these two Ipê records differently.</p></div></div>
   </>:method==='xgboost'?<div className={styles.exampleGrid}>
    <div><p className={styles.orderingLabel}>Equality strategy · selected for sufficiently few categories</p><BinaryNode question="species = A?" left={['A']}/></div>
    <div><p className={styles.orderingLabel}>Partition strategy · selected by categorical configuration</p><BinaryNode question="species ∈ {A, C}?" left={['A','C']}/></div>
   </div>:<>
    {(method==='hist'||method==='lightgbm')&&<>
     <p className={styles.orderingLabel}>{method==='hist'?'Illustrative local category order':'Unregularized logistic G/H at initial probability 0.5'}</p>
     {method==='lightgbm'&&<div style={{maxWidth:320,margin:'0 auto 16px'}}>{(['C','A','B','D'] as Category[]).map(c=>{const ratio=gradientRatio(c).ratio;return <div className={styles.barRow} key={c}><strong>{c}</strong><span className={styles.barTrack}><span className={styles.bar} style={{left:`${ratio<0?50+ratio*25:50}%`,width:`${Math.abs(ratio)*25}%`}}/></span><span>{ratio}</span></div>;})}</div>}
     <CategoryOrder categories={method==='hist'?['B','D','A','C']:['C','A','B','D']} cut={2}/>
    </>}
    <BinaryNode question={method==='hist'?'species ∈ {B, D}?':'species ∈ {A, C}?'} left={method==='hist'?['B','D']:['A','C']}/>
    {method==='cart'&&<div className={styles.scores}><span>Parent Gini<strong>{format(split.parent)}</strong></span><span>After split<strong>{format(split.weighted)}</strong></span><span>Gain<strong>{format(split.gain)}</strong></span></div>}
   </>}
  </div>
  <p className={shared.note}>{method==='cart'?'A direct subset test groups A and C in one node. A threshold on the original integer order A, B, C, D cannot do this. Classical categorical CART is a mechanism; not every CART-style library implements it.':multi?'Each nominal category receives a branch. Many categories fragment the data. C4.5 normalizes information gain with the split entropy; that ratio does not describe its entire attribute-selection procedure.':method==='catboost'?'Conceptual snapshot, not a trained CatBoost model. Internal statistics can depend on a row’s permitted history; CatBoost is not a universal direct subset search. Ordered target statistics and ordered boosting are different mechanisms.':'Conceptual snapshot, not a trained library model. Local statistics, regularization, and configuration determine the actual split; the original category IDs are not measured magnitudes.'}</p>
 </Frame>;
}
