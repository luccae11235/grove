import {useId, useState} from 'react';
import {Frame} from './Frame';
import {CATEGORIES, NAMES, type Category} from './data';
import shared from './shared.module.css';
import styles from './Visuals.module.css';

type Mode = 'entity' | 'pretrained' | 'contextual';
type Point = {label:string;input:string;x:number;y:number;note?:string;newCategory?:boolean;context?:boolean};
const ENTITY: Record<Category, [number,number]> = {A:[.2,.8], B:[.8,.2], C:[.3,.7], D:[.7,.3]};
const DESCRIPTIONS: Record<Category,string> = {A:'Teaching category A; demonstration seed lot.',B:'Teaching category B; demonstration seed lot.',C:'Teaching category C; second demonstration seed lot.',D:'Teaching category D; demonstration seed lot.'};
function pointsFor(mode:Mode):Point[] {
  if(mode==='contextual') return [
    {label:'Row 1',input:'A · Ipê + Small',x:.2,y:.8,note:'Same species, small specimen',context:true},
    {label:'Row 3',input:'A · Ipê + Medium',x:.6,y:.4,note:'Same species, medium specimen',context:true},
  ];
  const points:Point[]=CATEGORIES.map(c=>({label:c,input:`${c} · ${NAMES[c]}`,x:ENTITY[c][0],y:ENTITY[c][1],note:mode==='pretrained'?DESCRIPTIONS[c]:undefined}));
  if(mode==='pretrained') points.push({label:'E',input:'E · unseen category',x:.4,y:.6,note:'Teaching category E; newly described demonstration lot.',newCategory:true});
  return points;
}
function CoordinateMap({points}:{points:Point[]}) {
  const id=useId();
  return <svg className={styles.chart} viewBox="0 0 340 300" role="img" aria-labelledby={`${id}-title ${id}-description`}>
    <title id={`${id}-title`}>Schematic two-dimensional representations</title>
    <desc id={`${id}-description`}>{points.map(p=>`${p.label}: coordinate 1 is ${p.x}, coordinate 2 is ${p.y}`).join('. ')}. Coordinates are illustrative and were not trained on these records.</desc>
    {[0,.5,1].map(t=><g key={t}><line className={styles.gridline} x1="45" y1={245-t*205} x2="295" y2={245-t*205}/><text x="34" y={249-t*205} textAnchor="end">{t}</text><text x={45+t*250} y="264" textAnchor="middle">{t}</text></g>)}
    <path className={styles.axis} fill="none" d="M45 30V245H305"/>
    <text x="170" y="290" textAnchor="middle">Coordinate 1</text><text x="45" y="18">Coordinate 2</text>
    {points.map(p=><g key={p.label}><circle cx={45+p.x*250} cy={245-p.y*205} r={6} className={p.newCategory?styles.newPoint:p.context?styles.contextPoint:styles.point}/><text x={45+p.x*250+(p.label==='D'?-13:11)} y={245-p.y*205+(p.label==='C'||p.label==='B'?19:-10)} textAnchor={p.label==='D'?'end':'start'}>{p.label}</text></g>)}
  </svg>;
}
export function LearnedPlayground() {
  const [mode,setMode]=useState<Mode>('entity');
  const id=useId();
  const points=pointsFor(mode);
  return <Frame family="learned" title="One category, one vector—or a vector for each context?" question="What must the encoder know before it can return these coordinates?">
    <div className={shared.controls}><label htmlFor={id}>Representation<select id={id} aria-label="Learned representation" value={mode} onChange={event=>setMode(event.target.value as Mode)}><option value="entity">Entity embedding</option><option value="pretrained">Pretrained representation</option><option value="contextual">Contextual embedding</option></select></label></div>
    <div className={shared.grid} data-learned-mode={mode}>
      <div className={shared.scroll}><table><caption>{mode==='contextual'?'Category + row context':'Category'+(mode==='pretrained'?' + description':'')} → coordinates</caption><thead><tr><th scope="col">Input</th><th scope="col">Vector</th></tr></thead><tbody>{points.map(point=><tr key={point.label}><th scope="row">{mode==='contextual'?`${point.label}: `:''}{point.input}{point.note&&<p className={styles.description}>{point.note}</p>}</th><td className={styles.vector}>({point.x}, {point.y})</td></tr>)}</tbody></table></div>
      <div><p className={styles.coordinateHeading}>Fixed schematic coordinates</p><CoordinateMap points={points}/></div>
    </div>
    <p className={shared.result} aria-live="polite">{mode==='entity'?'A lookup returns the same vector for every Ipê record. A downstream tree receives coordinate columns and can threshold them.':mode==='pretrained'?'A description encoder can produce a vector for new category E. A closed lookup would need an UNK fallback instead. These invented descriptions demonstrate the interface, not useful botanical knowledge.':'Both records are Ipê. Changing the row context changes the vector: row 1 is (0.2, 0.8), while row 3 is (0.6, 0.4).'}</p>
    <p className={shared.note}>All coordinates are schematic; no encoder is trained here. Nearness is not guaranteed by similar target means. The axes are representation coordinates, not probabilities or a fitted decision boundary.</p>
  </Frame>;
}
