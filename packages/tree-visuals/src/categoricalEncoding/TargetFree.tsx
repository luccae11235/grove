import { useId, useState } from 'react';
import { CATEGORIES, NAMES, ROWS, format } from './data';
import { Frame } from './Frame';
import shared from './shared.module.css';
import styles from './TargetFree.module.css';
import { CODE, SIZE_CODE, TARGET_FREE_COPY, TARGET_FREE_METHODS, categoryPartition, encodeTargetFree, type TargetFreeMethod } from './targetFreeModel';

export function TargetFreePlayground() {
  const [method, setMethod] = useState<TargetFreeMethod>('one-hot');
  const id = useId();
  const copy = TARGET_FREE_COPY[method];
  const groups = categoryPartition(method);
  const mappings = CATEGORIES.map(category => ({ category, name: NAMES[category], values: encodeTargetFree(method, category) }));
  if (method === 'similarity') mappings.splice(2, 0, { category: 'B', name: 'Cedroo', values: encodeTargetFree(method, 'B', 'Cedroo') });

  return <Frame family="Target-free" title="Change the code. Inspect the question." question="Which distinctions can a tree see without reading any germination outcomes?">
    <div className={shared.controls}>
      <label htmlFor={id}>Representation
        <select id={id} aria-label="Target-free representation" value={method} onChange={event => setMethod(event.target.value as TargetFreeMethod)}>
          {TARGET_FREE_METHODS.map(value => <option key={value} value={value}>{TARGET_FREE_COPY[value].name}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => setMethod('one-hot')}>Reset representation</button>
    </div>
    <div data-target-free-method={method}>
      <div className={shared.grid}>
        <div className={shared.scroll}>
          <table className={styles.source}>
            <caption>Same ten input records</caption>
            <thead><tr><th scope="col">Row</th><th scope="col">{method === 'similarity' ? 'Typed name' : 'Species'}</th></tr></thead>
            <tbody>{ROWS.map(row => <tr key={row.id} data-source-row={row.id} className={method === 'similarity' && row.id === 5 ? shared.active : undefined}>
              <th scope="row">{row.id}</th><td>{method === 'similarity' ? row.typed : <>{row.category} · {NAMES[row.category]}</>}</td>
            </tr>)}</tbody>
          </table>
          <p className={shared.note}>No target column is consulted. Species codes are A = Ipê, B = Cedro, C = Jacarandá, D = Acácia.</p>
        </div>
        <div>
          <div className={shared.scroll}>
            <table data-encoded-mapping="target-free">
              <caption>Values passed to the tree</caption>
              <thead><tr><th scope="col">{method === 'similarity' ? 'Name' : 'Species'}</th>{copy.columns.map((label, column) => <th key={label} scope="col" className={column === copy.feature ? shared.active : undefined}>{label}</th>)}</tr></thead>
              <tbody>{mappings.map((mapping, index) => <tr key={`${mapping.name}-${index}`} data-mapping-name={mapping.name}>
                <th scope="row">{method === 'similarity' ? mapping.name : mapping.category}</th>
                {mapping.values.map((value, column) => <td key={column} data-output-column={column} data-output-value={value} className={column === copy.feature ? shared.active : undefined}>{format(value)}</td>)}
              </tr>)}</tbody>
            </table>
          </div>
          <p className={shared.note}>Each occurrence reuses its mapping{method === 'similarity' ? ' for the typed string' : ' for that species'}.</p>
          <p className={`${shared.equation} ${styles.equation}`}>{copy.equation}</p>
          {method === 'ordinal' && <div className={styles.order} aria-label="Integer code order: A zero, B one, threshold 1.5, C two, D three">
            {CATEGORIES.map((category, index) => <span key={category} className={index === 1 ? styles.beforeCut : undefined}><strong>{category}</strong><small>{CODE[category]}</small>{index === 1 && <b aria-hidden="true">│</b>}</span>)}
          </div>}
          <div className={shared.result} aria-live="polite" data-partition-left={groups.left.join('')} data-partition-right={groups.right.join('')}>
            <p className={styles.rule}>{copy.rule}</p>
            <div className={styles.branches}>
              <div><span className={styles.branchLabel}>Yes · ≤</span><div className={shared.chips}>{groups.left.map(category => <span className={shared.chip} key={category}>{category}</span>)}</div></div>
              <div><span className={styles.branchLabel}>No · &gt;</span><div className={shared.chips}>{groups.right.map(category => <span className={shared.chip} key={category}>{category}</span>)}</div></div>
            </div>
            <p>{copy.preserves}</p>
          </div>
          {method === 'ordinal' && <p className={shared.note}>A genuine order is different: {Object.entries(SIZE_CODE).map(([size, code]) => `${size} → ${code}`).join(', ')}.</p>}
          {method === 'hashing' && <p className={styles.detail}><strong>A and B are identical:</strong> both receive (1, 0, 0). No later split can undo this collision.</p>}
          {method === 'similarity' && <p className={styles.detail}><strong>Cedro:</strong> ce · ed · dr · ro<br /><strong>Cedroo:</strong> ce · ed · dr · ro · oo<br />Four shared bigrams out of five: <strong>0.8</strong> similarity.</p>}
          <p className={shared.note}>{copy.note}</p>
        </div>
      </div>
    </div>
  </Frame>;
}
