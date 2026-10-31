import {Label} from './MethodFigure';

const ink='var(--text,#16372b)';
const green='var(--accent,#237857)';
const soft='var(--accent-soft,#e7f3ed)';

/** A small, bracketed matrix. Row positions stay fixed when labels are withheld. */
export function EncodingMatrix({x,y,width,rows,rowHeight=40,excluded=[],accent=false}:{
 x:number;y:number;width:number;rows:readonly (readonly string[])[];rowHeight?:number;excluded?:readonly number[];accent?:boolean;
}) {
 const left=x-width/2,right=x+width/2,bottom=y+rows.length*rowHeight;
 return <g>
  {accent && <rect x={left+5} y={y+2} width={width-10} height={bottom-y-4} rx={4} fill={soft}/>}
  <path d={`M ${left+8} ${y} H ${left} V ${bottom} H ${left+8} M ${right-8} ${y} H ${right} V ${bottom} H ${right-8}`} fill="none" stroke={accent?green:ink} strokeWidth={1.5}/>
  {rows.map((cells,rowIndex)=><g key={rowIndex}>
   {cells.map((value,colIndex)=>{
    const cellX=left+(colIndex+.5)*width/cells.length,cellY=y+(rowIndex+.5)*rowHeight+7;
    return <g key={colIndex}>
     <Label x={cellX} y={cellY} muted={excluded.includes(rowIndex)}>{value}</Label>
     {excluded.includes(rowIndex) && <line x1={cellX-12} y1={cellY-14} x2={cellX+12} y2={cellY+2} stroke={ink} strokeWidth={1.5}/>}
    </g>;
   })}
  </g>)}
 </g>;
}
