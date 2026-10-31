import {useId,type ReactNode} from 'react';
import styles from './MethodFigure.module.css';
export function MethodFigure({method,title,caption,height=220,children}:{method:string;title:string;caption:string;height?:number;children:ReactNode}) {
 const id=useId();
 return <figure className={styles.figure} data-encoding-figure={method}>
  <svg viewBox={`0 0 480 ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
   <title id={`${id}-title`}>{title}</title><desc id={`${id}-desc`}>{caption}</desc>{children}
  </svg><figcaption>{caption}</figcaption>
 </figure>;
}
export function Label({x,y,children,small=false,muted=false,anchor='middle'}:{x:number;y:number;children:ReactNode;small?:boolean;muted?:boolean;anchor?:'start'|'middle'|'end'}) {
 return <text x={x} y={y} textAnchor={anchor} className={`${small?styles.small:''} ${muted?styles.muted:''}`}>{children}</text>;
}
export function Arrow({x1,y1,x2,y2}:{x1:number;y1:number;x2:number;y2:number}) {
 const angle=Math.atan2(y2-y1,x2-x1),size=7;
 const a=[x2-size*Math.cos(angle-.5),y2-size*Math.sin(angle-.5)];
 const b=[x2-size*Math.cos(angle+.5),y2-size*Math.sin(angle+.5)];
 return <g className={styles.arrow}><line x1={x1} y1={y1} x2={x2} y2={y2}/><polygon points={`${x2},${y2} ${a[0]},${a[1]} ${b[0]},${b[1]}`}/></g>;
}
export function Token({x,y,width=110,label,accent=false}:{x:number;y:number;width?:number;label:string;accent?:boolean}) {
 return <g><rect x={x-width/2} y={y-24} width={width} height={42} rx={6} className={accent?styles.accent:styles.token}/><Label x={x} y={y+3}>{label}</Label></g>;
}
