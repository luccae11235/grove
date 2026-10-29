import {Arrow, Label, MethodFigure, Token} from './MethodFigure';

export type NativeFigureMethod = 'id3' | 'cart' | 'hist' | 'lightgbm' | 'xgboost' | 'catboost';

function GroupSplit({x,y,question,left,right,width=210}:{x:number;y:number;question:string;left:string;right:string;width?:number}) {
  return <g>
    <Token x={x} y={y} width={width} label={question} accent/>
    <Arrow x1={x-20} y1={y+23} x2={x-68} y2={y+72}/>
    <Arrow x1={x+20} y1={y+23} x2={x+68} y2={y+72}/>
    <Label x={x-68} y={y+104}>{left}</Label>
    <Label x={x+68} y={y+104}>{right}</Label>
  </g>;
}

export function NativeFigure({method}:{method:NativeFigureMethod}) {
  if(method==='id3') {
    // Learner question: how can one nominal feature create several branches?
    return <MethodFigure method={method} title="A species node branches directly by category" height={215} caption="A multiway species node gives each nominal category its own branch. ID3 and C4.5 can share this structure while using different selection criteria.">
      <Token x={240} y={55} width={150} label="Species?" accent/>
      {[60,180,300,420].map(x=><Arrow key={x} x1={240} y1={79} x2={x} y2={132}/>)}
      {['Ipê','Cedro','Jacarandá','Acácia'].map((name,i)=><Label key={name} x={60+i*120} y={165}>{name}</Label>)}
    </MethodFigure>;
  }
  if(method==='cart') {
    // Learner question: can a single membership question make AC versus BD?
    return <MethodFigure method={method} title="One subset question groups Ipê and Jacarandá" height={220} caption="The subset {A, C} sends Ipê and Jacarandá together. A single threshold on the integer order A, B, C, D cannot make this grouping.">
      <GroupSplit x={240} y={60} question="Species ∈ {A, C}?" left="A + C" right="B + D" width={230}/>
      <Label x={172} y={192} small muted>Yes</Label><Label x={308} y={192} small muted>No</Label>
    </MethodFigure>;
  }
  if(method==='hist') {
    // Learner question: how does a local category order make a useful subset contiguous?
    return <MethodFigure method={method} title="A local ordering makes the BD versus AC cut available" height={195} caption="A conceptual local order puts B and D before A and C, enabling one partition. Category IDs remain identities, not magnitudes; this is not a fitted HistGradientBoosting model.">
      <Label x={240} y={32} small muted>Order by a local statistic</Label>
      {['B','D','A','C'].map((c,i)=><Token key={c} x={66+i*116} y={85} width={70} label={c} accent={i>1}/>)}
      <line x1={240} y1={54} x2={240} y2={112} stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 4"/>
      <Label x={124} y={153}>B + D</Label><Label x={356} y={153}>A + C</Label>
    </MethodFigure>;
  }
  if(method==='lightgbm') {
    // Learner question: which category grouping becomes available after sorting the local gradient statistic?
    return <MethodFigure method={method} title="Local gradient statistics order C and A before B and D" height={205} caption="With initial logistic probability 0.5 and no regularization in this illustration, the local G/H order permits CA versus BD. This is a conceptual snapshot, not a fitted LightGBM model.">
      <Label x={240} y={27} small muted>Local gradient / Hessian</Label>
      {['C','A','B','D'].map((c,i)=><g key={c}><Token x={66+i*116} y={78} width={70} label={c} accent={i<2}/><Label x={66+i*116} y={125}>{[-2,-1,2,2][i]}</Label></g>)}
      <line x1={240} y1={45} x2={240} y2={140} stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 4"/>
      <Label x={124} y={181}>C + A</Label><Label x={356} y={181}>B + D</Label>
    </MethodFigure>;
  }
  if(method==='xgboost') {
    // Learner question: how do equality and subset tests differ?
    return <MethodFigure method={method} title="XGBoost supports equality and partition questions" height={230} caption="Equality isolates one category; a partition test can group several. Configuration selects the strategy. These are conceptual XGBoost split examples, not a trained model.">
      <Label x={120} y={27} small muted>Equality</Label><Label x={360} y={27} small muted>Partition</Label>
      <GroupSplit x={120} y={78} width={175} question="Species = A?" left="A" right="B C D"/>
      <GroupSplit x={360} y={78} width={210} question="Species ∈ {A, C}?" left="A C" right="B D"/>
      <Label x={52} y={211} small muted>Yes</Label><Label x={188} y={211} small muted>No</Label>
      <Label x={292} y={211} small muted>Yes</Label><Label x={428} y={211} small muted>No</Label>
    </MethodFigure>;
  }
  // Learner question: where does CatBoost transform categories before the split?
  return <MethodFigure method={method} title="CatBoost can transform a category internally before a numeric split" height={260} caption="Configuration may select one-hot handling or ordered categorical statistics. A numeric split reads that internal representation; CatBoost is not a universal direct nominal-subset search. This is a conceptual diagram.">
    <Token x={72} y={113} width={115} label="A · Ipê"/>
    <Arrow x1={134} y1={106} x2={180} y2={63}/><Arrow x1={134} y1={116} x2={180} y2={165}/>
    <Token x={264} y={62} width={162} label="One-hot" accent/>
    <Token x={264} y={166} width={162} label="Ordered statistic" accent/>
    <Arrow x1={350} y1={60} x2={383} y2={102}/><Arrow x1={350} y1={163} x2={383} y2={119}/>
    <Token x={430} y={113} width={85} label="Split"/>
    <Label x={264} y={222} small muted>Internal numeric representation</Label>
  </MethodFigure>;
}
