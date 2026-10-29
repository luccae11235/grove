export type Category = 'A' | 'B' | 'C' | 'D';
export const CATEGORIES: Category[] = ['A', 'B', 'C', 'D'];
export const NAMES: Record<Category, string> = {A:'Ipê', B:'Cedro', C:'Jacarandá', D:'Acácia'};
export const ROWS = [
 {id:1,category:'A',size:'Small',target:1,typed:'Ipê'},
 {id:2,category:'B',size:'Large',target:0,typed:'Cedro'},
 {id:3,category:'A',size:'Medium',target:1,typed:'Ipê'},
 {id:4,category:'C',size:'Large',target:1,typed:'Jacarandá'},
 {id:5,category:'B',size:'Small',target:0,typed:'Cedroo'},
 {id:6,category:'A',size:'Large',target:1,typed:'Ipê'},
 {id:7,category:'D',size:'Medium',target:0,typed:'Acácia'},
 {id:8,category:'C',size:'Medium',target:1,typed:'Jacarandá'},
 {id:9,category:'B',size:'Medium',target:0,typed:'Cedro'},
 {id:10,category:'A',size:'Small',target:0,typed:'Ipê'},
] as const;
export const format = (n:number) => Number(n.toFixed(3)).toString();
export function summary(category:Category, ids:readonly number[]=ROWS.map(r=>r.id)) {
 const rows=ROWS.filter(r=>r.category===category && ids.includes(r.id));
 return {count:rows.length,sum:rows.reduce((s,r)=>s+r.target,0),ids:rows.map(r=>r.id)};
}
