import { Arrow, Label, MethodFigure, Token } from './MethodFigure';

export type SupervisedFigureMethod = 'mean' | 'oof' | 'm-estimate' | 'woe' | 'loo' | 'james-stein' | 'glmm' | 'ordered';
const ink = 'var(--text,#16372b)';
const green = 'var(--accent,#237857)';
const soft = 'var(--accent-soft,#e7f3ed)';
const border = 'var(--border-strong,#adc3b7)';

function Outcome({x,y,value,excluded=false}:{x:number;y:number;value:number;excluded?:boolean}) {
  return <g opacity={excluded ? .5 : 1}>
    <circle cx={x} cy={y} r={20} fill={value ? soft : 'var(--surface-raised,#fff)'} stroke={excluded ? border : green} strokeWidth={1.5}/>
    <Label x={x} y={y+7}>{value}</Label>
    {excluded && <line x1={x-24} y1={y+24} x2={x+24} y2={y-24} stroke={ink} strokeWidth={2}/>}
  </g>;
}

export function SupervisedFigure({method}:{method:SupervisedFigureMethod}) {
  if(method === 'mean') {
    // Learner question: what does a category mean retain from its observed targets?
    return <MethodFigure method={method} title="Ipê outcomes become one category mean" caption="Three germinations among four Ipê records give 0.75 for a new Ipê observation." height={190}>
      <Label x={155} y={40}>Ipê outcomes</Label>
      {[1,1,1,0].map((value,i)=><Outcome key={i} x={65+i*60} y={100} value={value}/>)}
      <Arrow x1={280} y1={100} x2={335} y2={100}/><Token x={400} y={100} label="0.75" accent/>
      <Label x={400} y={152} small>new record</Label>
    </MethodFigure>;
  }
  if(method === 'oof') {
    // Learner question: which labels may encode record 1 when its whole fold is held out?
    return <MethodFigure method={method} title="OOF blocks the selected record’s entire fold" caption="Record 1 belongs to held-out fold F₁; only Ipê records 3 and 10 in F₂ supply its mean of 0.5." height={220}>
      <rect x={22} y={30} width={184} height={165} rx={8} fill="none" stroke={border} strokeDasharray="5 5"/>
      <Label x={114} y={58} small>F₁ · held out</Label><Label x={114} y={91}>Record 1 · Ipê</Label>
      <Outcome x={114} y={137} value={1} excluded/><Label x={114} y={184} small muted>target blocked</Label>
      <Label x={334} y={36} small>F₂ · available Ipê</Label>
      <Label x={286} y={68} small>record 3</Label><Label x={390} y={68} small>record 10</Label>
      <Outcome x={286} y={103} value={1}/><Outcome x={390} y={103} value={0}/>
      <Arrow x1={286} y1={132} x2={316} y2={161}/><Arrow x1={390} y1={132} x2={360} y2={161}/><Token x={338} y={185} label="0.5" accent/>
    </MethodFigure>;
  }
  if(method === 'm-estimate') {
    // Learner question: how does a prior temper a category supported by one record?
    return <MethodFigure method={method} title="A sparse category is pulled toward the prior" caption="Acácia has one negative record; prior mean 0.5 with weight m = 2 moves its encoded value from 0 to 0.333." height={210}>
      <Label x={240} y={32}>Acácia · one observed outcome</Label>
      <line x1={60} y1={108} x2={420} y2={108} stroke={border}/>
      <circle cx={60} cy={108} r={7} fill="var(--surface-raised,#fff)" stroke={ink} strokeWidth={2}/>
      <circle cx={420} cy={108} r={7} fill="var(--surface-raised,#fff)" stroke={border} strokeWidth={2}/>
      <Label x={60} y={80} anchor="start">mean 0</Label><Label x={420} y={80} anchor="end">prior 0.5</Label>
      <Arrow x1={80} y1={108} x2={287} y2={108}/><rect x={294} y={102} width={12} height={12} fill={green}/>
      <line x1={300} y1={121} x2={300} y2={144} stroke={green}/><Token x={300} y={176} label="0.333" accent/>
    </MethodFigure>;
  }
  if(method === 'woe') {
    // Learner question: what does positive Weight of Evidence express in the declared convention?
    return <MethodFigure method={method} title="Ipê supplies more positive than negative evidence" caption="With equal total class counts and pseudocount α = 0.5, Ipê’s three positive and one negative outcomes give positive WoE: +0.847." height={210}>
      <Label x={116} y={35}>Ipê</Label><Label x={22} y={78} anchor="start" small>positive</Label>
      {[0,1,2].map(i=><Outcome key={i} x={117+i*48} y={72} value={1}/>)}
      <Label x={22} y={145} anchor="start" small>negative</Label><Outcome x={117} y={139} value={0}/>
      <Arrow x1={258} y1={104} x2={315} y2={104}/><Token x={391} y={104} width={128} label="+0.847" accent/>
      <Label x={391} y={156} small>positive evidence</Label>
    </MethodFigure>;
  }
  if(method === 'loo') {
    // Learner question: which label disappears in leave-one-out encoding?
    return <MethodFigure method={method} title="Leave-one-out removes only this record’s outcome" caption="Omitting a positive Ipê record leaves two positives and one negative, giving 2/3; this alone does not guarantee a safe training representation." height={190}>
      <Label x={68} y={36} small>this record</Label><Outcome x={68} y={96} value={1} excluded/>
      <line x1={108} y1={48} x2={108} y2={147} stroke={border} strokeDasharray="4 4"/>
      <Label x={213} y={36} small>other Ipê records</Label>{[1,1,0].map((value,i)=><Outcome key={i} x={153+i*58} y={96} value={value}/>)}
      <Arrow x1={308} y1={96} x2={339} y2={96}/><Token x={405} y={96} label="2/3" accent/>
      <Label x={405} y={151} small>training feature</Label>
    </MethodFigure>;
  }
  if(method === 'james-stein') {
    // Learner question: what does a half-weight toward the prior do to the category mean?
    return <MethodFigure method={method} title="An illustrative shrinkage weight blends two means" caption="With hypothetical B_A = 0.5, Ipê lies halfway between its mean 0.75 and prior 0.5, at 0.625; no weight was estimated here." height={200}>
      <Label x={240} y={35}>Hypothetical weight · 0.5</Label><line x1={70} y1={103} x2={410} y2={103} stroke={border}/>
      <circle cx={70} cy={103} r={7} fill="var(--surface-raised,#fff)" stroke={border} strokeWidth={2}/>
      <circle cx={410} cy={103} r={7} fill="var(--surface-raised,#fff)" stroke={ink} strokeWidth={2}/>
      <Label x={70} y={76} anchor="start">prior 0.5</Label><Label x={410} y={76} anchor="end">mean 0.75</Label>
      <Arrow x1={390} y1={103} x2={254} y2={103}/><rect x={234} y={97} width={12} height={12} fill={green}/>
      <Token x={240} y={164} label="0.625" accent/>
    </MethodFigure>;
  }
  if(method === 'glmm') {
    // Learner question: does the GLMM feature represent a probability or a category effect?
    return <MethodFigure method={method} title="A GLMM encoder can return a category effect" caption="Hypothetical baseline β₀ = 0 and Ipê effect û_A = +0.6: the encoded feature is the effect on the log-odds scale, not probability 0.6." height={200}>
      <Label x={240} y={35}>Hypothetical model parameters</Label><line x1={80} y1={105} x2={400} y2={105} stroke={border}/>
      <line x1={100} y1={92} x2={100} y2={118} stroke={ink} strokeWidth={2}/><Label x={100} y={151}>baseline 0</Label>
      <Arrow x1={116} y1={105} x2={284} y2={105}/><Token x={354} y={105} width={126} label="+0.6" accent/>
      <Label x={354} y={151}>Ipê effect</Label>
    </MethodFigure>;
  }
  // Learner question: which same-category outcomes precede the current record?
  return <MethodFigure method="ordered" title="The current row can read only an earlier prefix" caption="Before record 3, only record 1 supplies an Ipê outcome; fixed prior p₀ = 0.5 with weight a = 2 gives 0.667, without using record 3’s target." height={230}>
    <Label x={80} y={34} small>earlier Ipê</Label><Label x={232} y={34} small>current record</Label><Label x={395} y={34} small>later records</Label>
    <Token x={80} y={83} width={110} label="1 · Ipê" accent/><Token x={232} y={83} width={124} label="3 · Ipê"/><Token x={395} y={83} width={110} label="6, 10"/>
    <Outcome x={80} y={137} value={1}/><Outcome x={232} y={137} value={1} excluded/><Label x={395} y={143} small muted>not available</Label>
    <Arrow x1={108} y1={150} x2={170} y2={192}/><Token x={232} y={205} width={124} label="0.667" accent/>
  </MethodFigure>;
}
