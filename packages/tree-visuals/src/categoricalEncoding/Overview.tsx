import {useId} from 'react';
import styles from './Visuals.module.css';
const ink='var(--text,#16372b)';
const line='var(--border-strong,#adc3b7)';
const soft='var(--accent-soft,#e7f3ed)';
function Box({x,y,width=76,text}:{x:number;y:number;width?:number;text:string}) {
 return <g><rect x={x} y={y} width={width} height={36} rx={5} fill={soft} stroke={line}/><text x={x+width/2} y={y+24} textAnchor="middle">{text}</text></g>;
}
function Arrow({x1,y1,x2,y2}:{x1:number;y1:number;x2:number;y2:number}) {
 const a=Math.atan2(y2-y1,x2-x1);
 return <g stroke={ink} strokeWidth={1.3} fill={ink}><line x1={x1} y1={y1} x2={x2} y2={y2}/><path d={`M${x2-6*Math.cos(a-.5)},${y2-6*Math.sin(a-.5)} L${x2},${y2} L${x2-6*Math.cos(a+.5)},${y2-6*Math.sin(a+.5)}`} fill="none"/></g>;
}
function Matrix({x,y,width=65,values}:{x:number;y:number;width?:number;values:string[]}) {
 const h=values.length*27+8;
 return <g><path d={`M${x+5} ${y}h-5v${h}h5 M${x+width-5} ${y}h5v${h}h-5`} fill="none" stroke={line} strokeWidth={1.5}/>{values.map((value,i)=><text key={i} x={x+width/2} y={y+23+i*27} textAnchor="middle">{value}</text>)}</g>;
}
export function CategoricalOverview() {
 const id=useId();
 // Learner question: where does each family get the numbers given to the model?
 return <figure className={styles.overview} aria-label="Four families of categorical representations" data-categorical-overview>
  <div className={styles.family}><strong>Target-free encodings</strong>
   <svg viewBox="0 0 320 165" role="img" aria-labelledby={`${id}-free`}><title id={`${id}-free`}>Ipê becomes one-hot columns without using labels</title>
    <Box x={8} y={62} text="Ipê"/><Arrow x1={94} y1={80} x2={128} y2={80}/>
    {[1,0,0,0].map((v,i)=><Box key={i} x={139+i*43} y={62} width={36} text={String(v)}/>)}
   </svg><p>Turn names into numbers without using the outcomes.</p>
  </div>
  <div className={styles.family}><strong>Supervised encodings</strong>
   <svg viewBox="0 0 320 165" role="img" aria-labelledby={`${id}-supervised`}><title id={`${id}-supervised`}>Training labels y help turn the species column in X into germination rates: Ipê 0.75 and Cedro 0</title>
    <text x={43} y={26} textAnchor="middle">X</text><text x={112} y={26} textAnchor="middle">y</text><text x={267} y={26} textAnchor="middle">Encoded X</text>
    <Matrix x={7} y={42} width={72} values={['Ipê','Cedro','…']}/><Matrix x={93} y={42} width={38} values={['1','0','…']}/>
    <path d="M112 137v17h89" fill="none" stroke={line} strokeWidth={1.3}/><Arrow x1={201} y1={154} x2={201} y2={94}/>
    <text x={170} y={143} textAnchor="middle" className={styles.note}>Learn from y</text>
    <Arrow x1={141} y1={85} x2={222} y2={85}/><Matrix x={234} y={42} values={['0.75','0','…']}/>
   </svg><p>Learn category rates from training labels; reuse them on new rows.</p>
  </div>
  <div className={styles.family}><strong>Learned representations</strong>
   <svg viewBox="0 0 320 165" role="img" aria-labelledby={`${id}-learned`}><title id={`${id}-learned`}>A trained encoder turns Ipê into a vector of two numbers, illustrated as 0.2 and 0.8</title>
    <Box x={8} y={62} text="Ipê"/><Arrow x1={94} y1={80} x2={126} y2={80}/><Box x={137} y={62} width={93} text="Encoder"/>
    <Arrow x1={239} y1={80} x2={260} y2={80}/><Matrix x={273} y={49} width={40} values={['0.2','0.8']}/>
    <text x={183} y={128} textAnchor="middle" className={styles.note}>Learned by training</text>
   </svg><p>Learn a short list of numbers for a category: a vector.</p>
  </div>
  <div className={styles.family}><strong>Native categorical handling</strong>
   <svg viewBox="0 0 320 165" role="img" aria-labelledby={`${id}-native`}><title id={`${id}-native`}>A tree chooses a group directly: Ipê and Jacarandá on one branch, Cedro and Acácia on the other</title>
    <Box x={96} y={15} width={128} text="Species?"/>
    <Arrow x1={143} y1={56} x2={76} y2={96}/><Arrow x1={177} y1={56} x2={248} y2={96}/>
    <text x={76} y={121} textAnchor="middle">Ipê · Jacarandá</text><text x={248} y={121} textAnchor="middle">Cedro · Acácia</text>
   </svg><p>Let the tree choose which categories belong together.</p>
  </div>
  <figcaption className={styles.overlap}>The families can overlap: learned vectors may use labels, and some trees calculate target statistics internally. Vector values here are illustrative.</figcaption>
 </figure>;
}
