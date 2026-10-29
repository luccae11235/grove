import {Arrow, Label, MethodFigure, Token} from './MethodFigure';

export type LearnedFigureMethod = 'entity' | 'pretrained' | 'contextual';

export function LearnedFigure({method}:{method:LearnedFigureMethod}) {
  if(method==='entity') {
    // Learner question: where does the vector for a category come from?
    return <MethodFigure method={method} title="An entity embedding looks up a learned row" height={160} caption="Ipê selects a row in the learned embedding table. The coordinates are schematic, not estimated from these seed records.">
      <Token x={77} y={65} width={140} label="A · Ipê"/>
      <Arrow x1={151} y1={62} x2={178} y2={62}/>
      <Token x={245} y={65} width={125} label="E[A, :]" accent/>
      <Arrow x1={312} y1={62} x2={336} y2={62}/>
      <Token x={405} y={65} width={140} label="(0.2, 0.8)"/>
      <Label x={245} y={120} small muted>Lookup in a learned table</Label>
    </MethodFigure>;
  }
  if(method==='pretrained') {
    // Learner question: can a description encoder represent a new category?
    return <MethodFigure method={method} title="A frozen description encoder can receive an unseen category" height={160} caption="A new category E can be encoded from its description. A closed lookup would instead need an unknown-category fallback. The vector is schematic.">
      <Token x={80} y={65} width={150} label="E + description"/>
      <Arrow x1={159} y1={62} x2={180} y2={62}/>
      <Token x={245} y={65} width={125} label="Frozen gφ" accent/>
      <Arrow x1={312} y1={62} x2={336} y2={62}/>
      <Token x={405} y={65} width={140} label="(0.4, 0.6)"/>
      <Label x={80} y={120} small muted>Unseen category</Label>
      <Label x={245} y={120} small muted>No task-time fitting</Label>
    </MethodFigure>;
  }
  // Learner question: can the same species receive different vectors in different rows?
  return <MethodFigure method={method} title="The same Ipê category can receive different contextual vectors" height={225} caption="Both records are Ipê. Changing the specimen-size context changes the schematic vector; these values are not fitted results.">
    <Label x={240} y={28}>Same category: Ipê</Label>
    <Token x={112} y={82} width={190} label="Row 1 · Small"/>
    <Arrow x1={212} y1={79} x2={284} y2={79}/>
    <Token x={375} y={82} width={170} label="(0.2, 0.8)" accent/>
    <Token x={112} y={162} width={190} label="Row 3 · Medium"/>
    <Arrow x1={212} y1={159} x2={284} y2={159}/>
    <Token x={375} y={162} width={170} label="(0.6, 0.4)" accent/>
  </MethodFigure>;
}
