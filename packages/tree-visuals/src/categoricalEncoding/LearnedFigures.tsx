import {Arrow,Label,MethodFigure} from './MethodFigure';
import {EncodingMatrix} from './EncodingMatrix';

export type LearnedFigureMethod='entity'|'pretrained'|'contextual';

export function LearnedFigure({method}:{method:LearnedFigureMethod}) {
 const contextual=method==='contextual',pretrained=method==='pretrained';
 const title=contextual?'The same species can have different vectors in different contexts':pretrained?'A model already trained on descriptions can encode a new category':'Each category looks up its own learned vector';
 const caption=contextual?
  'Different specimen sizes can give the same species different vectors. These numbers are illustrative, not fitted results.':pretrained?
  'A fixed, previously trained model can turn a new description into a vector. The vector is illustrative; an ID-only lookup needs an unknown-category fallback.':
  'Each species selects its own learned vector; every Ipê receives the same one. These numbers are illustrative, not fitted results.';
 const input=contextual?[['Ipê','Small'],['Ipê','Medium']]:pretrained?[['E: description']]:[['Ipê'],['Cedro']];
 const output=contextual?[['0.2','0.8'],['0.6','0.4']]:pretrained?[['0.4','0.6']]:[['0.2','0.8'],['0.8','0.2']];
 const y=pretrained?108:88;
 // Learner question: what stays the same, and what can change, when a category becomes a vector?
 return <MethodFigure method={method} title={title} caption={caption} height={250}>
  <Label x={111} y={30}>X</Label><Label x={380} y={30}>Encoded X</Label>
  <Label x={111} y={60} small muted>{contextual?'species + size':pretrained?'new description':'species'}</Label>
  <Label x={380} y={60} small muted>two-number vectors</Label>
  <EncodingMatrix x={111} y={y} width={contextual?194:174} rows={input}/>
  <Arrow x1={218} y1={128} x2={283} y2={128}/>
  <EncodingMatrix x={380} y={y} width={162} rows={output} accent/>
  <Label x={250} y={195} small>{contextual?'Read the whole row':pretrained?'Use the trained model':'Look up the learned row'}</Label>
  <Label x={240} y={233} small muted>Illustrative vectors</Label>
 </MethodFigure>;
}
