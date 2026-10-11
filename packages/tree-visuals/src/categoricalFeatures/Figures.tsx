import type { ReactNode } from "react";
import { VISITS } from "./model";
import styles from "./CategoricalFeatures.module.css";

function Figure({
  kind,
  eyebrow,
  title,
  caption,
  children,
}: {
  kind: string;
  eyebrow: string;
  title: string;
  caption: string;
  children: ReactNode;
}) {
  const id = `categorical-${kind}`;
  return (
    <figure className={styles.figure} data-categorical-figure={kind} aria-labelledby={`${id}-title ${id}-caption`}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <p>{eyebrow}</p>
          <h3 id={`${id}-title`}>{title}</h3>
        </header>
        {children}
      </div>
      <figcaption id={`${id}-caption`}>{caption}</figcaption>
    </figure>
  );
}

function VisitRows() {
  return (
    <div className={styles.visitRows} aria-label="The six fixed visits">
      {VISITS.map((row) => (
        <div className={styles.visitRow} key={row.id}>
          <span className={styles.muted}>Row {row.id}</span>
          <strong>Store {row.store}</strong>
          <span>Purchase {row.purchase}</span>
        </div>
      ))}
    </div>
  );
}

export function CategorySplitFigure() {
  return (
    <Figure
      kind="split"
      eyebrow="One dataset · two questions"
      title="A code threshold and a category test route the same visits differently"
      caption="With A=0, B=1, C=2, D=3, the numeric threshold groups A with B. Membership in {A, C} groups A with C."
    >
      <div className={styles.splitGrid}>
        <div>
          <h4>Same six visits</h4>
          <VisitRows />
        </div>
        <div className={styles.splitQuestions}>
          <div className={styles.ruleCard}>
            <strong>Numeric: code &lt; 2?</strong>
            <div className={styles.branchPair}>
              <p><span>Yes · A, B</span><small>Rows 1, 2, 3, 5</small></p>
              <p><span>No · C, D</span><small>Rows 4, 6</small></p>
            </div>
          </div>
          <div className={styles.ruleCard}>
            <strong>Categorical: store ∈ {"{A, C}"}?</strong>
            <div className={styles.branchPair}>
              <p><span>Yes · A, C</span><small>Rows 1, 3, 4</small></p>
              <p><span>No · B, D</span><small>Rows 2, 5, 6</small></p>
            </div>
          </div>
        </div>
      </div>
    </Figure>
  );
}

export function CrossFittingFigure() {
  return (
    <Figure
      kind="cross-fitting"
      eyebrow="One category · two evidence boundaries"
      title="Row 4 cannot use its own answer; a future C visit can use row 4"
      caption="Within an outer training set, an internal held-out fold receives statistics from other folds. A later validation or new C visit uses the full permitted training history, without its own unknown target."
    >
      <div className={styles.flowGrid}>
        <div className={styles.flowCard}>
          <strong>Encoding training row 4 · C1</strong>
          <p className={styles.flowLabel}>Internal fold held out</p>
          <p><span className={styles.blockedChip}>Blocked: rows 1, 2, 4</span> <span className={styles.allowedChip}>Allowed: rows 3, 5, 6</span></p>
          <p>No C appears in the allowed fold, so row 4 receives the fixed prior <strong>0.5</strong>.</p>
        </div>
        <div className={styles.flowCard}>
          <strong>Encoding a later C visit · target unknown</strong>
          <p className={styles.flowLabel}>Validation or new query</p>
          <p><span className={styles.allowedChip}>Allowed: training rows 1–6</span> <span className={styles.blockedChip}>Blocked: query target</span></p>
          <p>Historical C1 from row 4 is now allowed: <strong>(1 + 0.5) / 2 = 0.75</strong>.</p>
        </div>
      </div>
    </Figure>
  );
}

export function EmbeddingFigure() {
  const example = [
    ["A", "0.2", "0.8"],
    ["B", "0.6", "0.1"],
    ["C", "0.4", "0.7"],
    ["D", "0.9", "0.3"],
  ] as const;
  return (
    <Figure
      kind="embedding"
      eyebrow="Illustrative coordinates · no model fitted"
      title="A lookup turns a category into a vector; training chooses the entries"
      caption="These coordinates are arbitrary illustrations, not estimates learned from the six visits. A supervised model's prediction loss can update the lookup table; a downstream tree can then split on its numeric coordinates."
    >
      <div className={styles.embeddingFlow}>
        <div className={styles.embeddingStage}>
          <strong>Category ID</strong>
          <p>A · B · C · D</p>
        </div>
        <span className={styles.flowArrow} aria-hidden="true">→</span>
        <div className={styles.embeddingStage}>
          <strong>Vector lookup table</strong>
          <table>
            <thead><tr><th scope="col">Store</th><th scope="col">z₁</th><th scope="col">z₂</th></tr></thead>
            <tbody>{example.map(([store, first, second]) => (
              <tr key={store}><th scope="row">{store}</th><td>{first}</td><td>{second}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <span className={styles.flowArrow} aria-hidden="true">→</span>
        <div className={styles.embeddingStage}>
          <strong>Tree input</strong>
          <p>Numeric coordinates z₁, z₂</p>
        </div>
      </div>
      <p className={styles.trainingPath}>Prediction loss from a supervised training task <span aria-hidden="true">→</span> updates the lookup table. The six rows shown here have not trained it.</p>
    </Figure>
  );
}
