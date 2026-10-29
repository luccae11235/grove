import {useId, type ReactNode} from 'react';
import styles from './shared.module.css';
export function Frame({family,title,question,children}:{family:string;title:string;question:string;children:ReactNode}) {
 const id=useId();
 return <section className={styles.frame} aria-labelledby={id} data-categorical-family={family}>
  <header className={styles.header}><p className={styles.eyebrow}>{family}</p><h3 id={id}>{title}</h3><p>{question}</p></header>
  <div className={styles.body}>{children}</div>
 </section>;
}
