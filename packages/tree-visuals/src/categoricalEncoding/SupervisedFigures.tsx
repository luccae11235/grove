import {Arrow,Label,MethodFigure} from './MethodFigure';
import {EncodingMatrix} from './EncodingMatrix';

export type SupervisedFigureMethod='mean'|'oof'|'m-estimate'|'woe'|'loo'|'james-stein'|'glmm'|'ordered';

type Diagram={title:string;caption:string;action:string;query:string;value:string;excluded?:number[];acacia?:boolean};
const diagrams:Record<SupervisedFigureMethod,Diagram>={
 mean:{
  title:'The labels turn a species name into its germination rate',
  caption:'Three of four Ipê seeds germinated, so a new Ipê receives 0.75. Training rows need their own label-exclusion rule.',
  action:'Average',query:'New Ipê',value:'0.75',
 },
 oof:{
  title:'Out-of-fold encoding uses labels from the other fold',
  caption:'For record 1, block its fold’s Ipê labels from records 1 and 6. The remaining labels from records 3 and 10 give 0.5.',
  action:'Other fold',query:'Record 1',value:'0.5',excluded:[0,2],
 },
 'm-estimate':{
  title:'Smoothing gives a small group some help from the overall rate',
  caption:'One Acácia outcome plus two votes at the overall rate of 0.5 gives 0.333. The overall rate comes from all ten training records.',
  action:'Blend',query:'New Acácia',value:'0.333',acacia:true,
 },
 woe:{
  title:'Weight of Evidence compares positive and negative labels',
  caption:'With equal overall class counts and an extra half-count on each side, Ipê gives +0.847. This means more positive evidence, not a probability.',
  action:'Compare',query:'New Ipê',value:'+0.847',
 },
 loo:{
  title:'Leave-one-out hides this row’s own label',
  caption:'Skip record 1’s label: two of the three remaining Ipê records germinated, giving 0.667. This alone does not prevent misleading training patterns.',
  action:'Other rows',query:'Record 1',value:'0.667',excluded:[0],
 },
 'james-stein':{
  title:'James–Stein encoding pulls a group estimate toward the overall rate',
  caption:'A halfway pull from Ipê’s 0.75 toward the overall 0.5 gives 0.625. The pull is hypothetical, not fitted here.',
  action:'Shrink',query:'New Ipê',value:'0.625',
 },
 glmm:{
  title:'A GLMM learns how a species changes a shared prediction',
  caption:'The model learns a species adjustment from X and y. Ipê’s +0.6 is hypothetical and uses the log-odds scale; it is not a probability.',
  action:'Fit effect',query:'New Ipê',value:'+0.6',
 },
 ordered:{
  title:'Ordered encoding can use only earlier labels',
  caption:'For record 3, only Ipê record 1 is earlier. Its label plus two votes at a fixed starting rate of 0.5 gives 0.667; current and later labels stay unused.',
  action:'Earlier rows',query:'Record 3',value:'0.667',excluded:[1,2,3],
 },
};

export function SupervisedFigure({method}:{method:SupervisedFigureMethod}) {
 const diagram=diagrams[method];
 const ids=diagram.acacia?[7]:[1,3,6,10];
 const targets=diagram.acacia?['0']:['1','1','1','0'];
 const y=diagram.acacia?138:78;
 // Learner question: which y labels may change this row's encoded X, and how?
 return <MethodFigure method={method} title={diagram.title} caption={diagram.caption} height={260}>
  <Label x={112} y={30}>X</Label><Label x={218} y={30}>y</Label><Label x={400} y={30}>Encoded X</Label>
  <Label x={30} y={60} small muted>row</Label><Label x={112} y={60} small muted>species</Label><Label x={218} y={60} small muted>label</Label>
  {ids.map((id,i)=><Label key={id} x={30} y={y+(i+.5)*40+7} small muted>{id}</Label>)}
  <EncodingMatrix x={112} y={y} width={104} rows={ids.map(()=>[diagram.acacia?'Acácia':'Ipê'])}/>
  <EncodingMatrix x={218} y={y} width={44} rows={targets.map(value=>[value])} excluded={diagram.excluded}/>
  <Arrow x1={254} y1={158} x2={330} y2={158}/>
  <Label x={292} y={198} small>{diagram.action}</Label>
  <Label x={400} y={112} small>{diagram.query}</Label>
  <EncodingMatrix x={400} y={138} width={126} rows={[[diagram.value]]} accent/>
 </MethodFigure>;
}
