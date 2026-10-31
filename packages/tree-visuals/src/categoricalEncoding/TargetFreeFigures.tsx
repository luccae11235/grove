import {Arrow, Label, MethodFigure, Token} from './MethodFigure';
import {CODE, digits, similarity} from './targetFreeModel';
import {CATEGORIES, ROWS} from './data';

export type TargetFreeFigureMethod = 'ordinal'|'one-hot'|'binary'|'hashing'|'count'|'similarity';
const line = 'var(--border-strong,#adc3b7)';
const accent = 'var(--accent,#237857)';

function OrdinalFigure() {
 // Learner question: which order exists before we assign numerical codes?
 return <MethodFigure method="ordinal" title="Meaningful size order versus arbitrary species IDs" height={288} caption="Size already has an order. Species acquire one only through our assigned IDs.">
  <Label x={25} y={27} small muted anchor="start">Meaningful order</Label>
  <Token x={90} y={70} width={115} label="Small"/>
  <Token x={240} y={70} width={115} label="Medium"/>
  <Token x={390} y={70} width={115} label="Large"/>
  <Arrow x1={154} y1={68} x2={175} y2={68}/><Arrow x1={304} y1={68} x2={325} y2={68}/>
  {[90,240,390].map((x,i)=><Label key={x} x={x} y={120}>{i}</Label>)}
  <line x1={25} y1={147} x2={455} y2={147} stroke={line} opacity={.45}/>
  <Label x={25} y={179} small muted anchor="start">Arbitrary species IDs</Label>
  {CATEGORIES.map((c,i)=><g key={c}><Token x={75+i*110} y={219} width={70} label={c}/><Label x={75+i*110} y={269}>{CODE[c]}</Label></g>)}
 </MethodFigure>;
}

function OneHotFigure() {
 // Learner question: how does an identity occupy its own column, and what does dummy coding remove?
 const xs=[210,280,350,420];
 return <MethodFigure method="one-hot" title="One column per species; dummy coding leaves one out" height={252} caption="One-hot gives each species a column. Dummy coding leaves out the Acácia column.">
  <Label x={25} y={28} small muted anchor="start">One-hot</Label>
  {CATEGORIES.map((c,i)=><Label key={c} x={xs[i]} y={28} small>{c}</Label>)}
  {[{name:'Ipê',values:[1,0,0,0]},{name:'Jacarandá',values:[0,0,1,0]}].map((row,r)=><g key={row.name}>
   <Label x={75} y={80+r*64}>{row.name}</Label>
   <Arrow x1={137} y1={74+r*64} x2={164} y2={74+r*64}/>
   {row.values.map((v,i)=><Token key={i} x={xs[i]} y={77+r*64} width={48} label={String(v)} accent={v===1}/>)}
  </g>)}
  <path d="M183 181v10h194v-10" stroke={accent} strokeWidth={1.6} fill="none"/>
  <Label x={280} y={225} small>Dummy keeps A, B, C</Label>
  <line x1={403} y1={184} x2={437} y2={207} stroke={line} strokeWidth={1.8}/>
  <Label x={420} y={235} small muted>omit D</Label>
 </MethodFigure>;
}

function BinaryFigure() {
 // Learner question: how do the same IDs change when written in different bases?
 return <MethodFigure method="binary" title="The same species IDs in base two and base three" height={258} caption="Writing IDs as digits uses fewer columns. It does not tell us which species behave alike.">
  {['Species','ID','Base 2','Base 3'].map((label,i)=><Label key={label} x={[70,180,290,410][i]} y={28} small muted>{label}</Label>)}
  <line x1={25} y1={43} x2={455} y2={43} stroke={line}/>
  {CATEGORIES.map((c,i)=><g key={c}>
   <Label x={70} y={82+i*49}>{c}</Label><Label x={180} y={82+i*49}>{CODE[c]}</Label>
   <Label x={290} y={82+i*49}>{digits(CODE[c],2).join('')}</Label><Label x={410} y={82+i*49}>{digits(CODE[c],3).join('')}</Label>
  </g>)}
 </MethodFigure>;
}

function HashingFigure() {
 // Learner question: what distinction disappears when two names receive the same hash representation?
 return <MethodFigure method="hashing" title="Two category identities collide in one representation" height={186} caption="After this collision, the representation cannot distinguish Ipê from Cedro.">
  <Token x={100} y={58} width={145} label="A · Ipê"/>
  <Token x={100} y={132} width={145} label="B · Cedro"/>
  <Arrow x1={181} y1={56} x2={252} y2={91}/><Arrow x1={181} y1={129} x2={252} y2={94}/>
  <Label x={359} y={37} small muted>Same output</Label>
  <Token x={359} y={95} width={170} label="[1, 0, 0]" accent/>
 </MethodFigure>;
}

function CountFigure() {
 // Learner question: how do count and frequency express the same category prevalence?
 const count=ROWS.filter(row=>row.category==='A').length;
 const frequency=count/ROWS.length;
 return <MethodFigure method="count" title="How often Ipê appears" height={237} caption="The same four Ipê records become count 4 or frequency 0.4.">
  <Token x={88} y={85} width={130} label="A · Ipê"/>
  <Label x={321} y={29} small muted>Ten training records</Label>
  {ROWS.map((_,i)=><circle key={i} cx={233+(i%5)*43} cy={64+Math.floor(i/5)*43} r={12} fill={i<count?accent:'none'} stroke={i<count?accent:line} strokeWidth={1.6}/>)}
  <Label x={176} y={176} small muted>Count</Label><Label x={355} y={176} small muted>Frequency</Label>
  <Token x={176} y={210} width={110} label={String(count)} accent/><Token x={355} y={210} width={110} label={String(frequency)} accent/>
 </MethodFigure>;
}

function SimilarityFigure() {
 // Learner question: which character evidence makes Cedroo close to Cedro?
 const shared=['ce','ed','dr','ro'];
 return <MethodFigure method="similarity" title="Cedroo shares four bigrams with Cedro and adds oo" height={211} caption="The extra oo changes the spelling while the other four bigrams remain shared.">
  <Label x={73} y={72}>Cedro</Label><Label x={73} y={135}>Cedroo</Label>
  {shared.map((gram,i)=><g key={gram}>
   <line x1={174+i*58} y1={84} x2={174+i*58} y2={103} stroke={line} strokeWidth={1.5}/>
   <Token x={174+i*58} y={69} width={46} label={gram}/><Token x={174+i*58} y={132} width={46} label={gram}/>
  </g>)}
  <Token x={416} y={132} width={46} label="oo" accent/>
  <Label x={416} y={180} small muted>extra</Label>
  <Label x={240} y={205}>Similarity {similarity('Cedroo','Cedro')}</Label>
 </MethodFigure>;
}

export function TargetFreeFigure({method}:{method:TargetFreeFigureMethod}) {
 switch(method) {
  case 'ordinal': return <OrdinalFigure/>;
  case 'one-hot': return <OneHotFigure/>;
  case 'binary': return <BinaryFigure/>;
  case 'hashing': return <HashingFigure/>;
  case 'count': return <CountFigure/>;
  case 'similarity': return <SimilarityFigure/>;
 }
}
