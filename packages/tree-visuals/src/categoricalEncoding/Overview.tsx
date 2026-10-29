import styles from './Visuals.module.css';

export function CategoricalOverview() {
  return <figure className={styles.overview} aria-label="Four sources of categorical representations">
    <div className={styles.family}><strong>Without the target</strong><div className={styles.flow}><span className={styles.token}>A · Ipê</span><span aria-hidden="true">→</span><span>1, 0, 0, 0</span></div><p>Preserve identity, frequency, or spelling.</p></div>
    <div className={styles.family}><strong>With reference targets</strong><div className={styles.flow}><span className={styles.token}>A + allowed outcomes</span><span aria-hidden="true">→</span><span>0.75</span></div><p>Summarize observed response. Which labels are allowed matters.</p></div>
    <div className={styles.family}><strong>Learned representation</strong><div className={styles.flow}><span className={styles.token}>A · Ipê</span><span aria-hidden="true">→</span><span>(0.2, 0.8)</span></div><p>Adjust vector coordinates through a learning objective.</p></div>
    <div className={styles.family}><strong>Inside the tree</strong><div className={styles.flow}><span className={styles.token}>A · Ipê</span><span aria-hidden="true">→</span><span>species ∈ {'{A, C}'}</span></div><p>Let the training procedure choose how categories enter a node.</p></div>
    <figcaption className={styles.overlap}>The families overlap: embeddings can use targets, and native support can calculate target statistics internally. The vector shown here is schematic.</figcaption>
  </figure>;
}
