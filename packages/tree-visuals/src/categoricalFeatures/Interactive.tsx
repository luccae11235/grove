import { useEffect, useState, type ReactNode } from "react";
import {
  ALTERNATE_ORDER,
  columnsFor,
  DEFAULT_CODES,
  DEFAULT_ORDER,
  inferenceValue,
  orderedValue,
  PRIOR,
  smoothed,
  splitAt,
  STORES,
  swapCode,
  thresholdChoices,
  VISITS,
  type Codes,
  type Encoding,
  type QueryStore,
  type Store,
} from "./model";
import styles from "./CategoricalFeatures.module.css";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function formatValue(value: number) {
  if (Math.abs(value - 1 / 3) < 1e-10) return "1/3";
  if (Math.abs(value - 1 / 6) < 1e-10) return "1/6";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function LabFrame({
  kind,
  eyebrow,
  title,
  children,
}: {
  kind: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const id = `categorical-${kind}-title`;
  return (
    <section className={styles.lab} data-categorical-lab={kind} aria-labelledby={id}>
      <header className={styles.header}>
        <p>{eyebrow}</p>
        <h3 id={id}>{title}</h3>
      </header>
      {children}
    </section>
  );
}

export function EncodingPlayground() {
  const [encoding, setEncoding] = useState<Encoding>("integer");
  const [codes, setCodes] = useState<Codes>(DEFAULT_CODES);
  const [columnKey, setColumnKey] = useState("code");
  const [threshold, setThreshold] = useState(1.5);
  const columns = columnsFor(encoding, codes);
  const active = columns.find((column) => column.key === columnKey) ?? columns[0];
  const groups = splitAt(active.values, threshold);
  const storesIn = (ids: number[]) => STORES.filter((store) => ids.some((id) => VISITS.find((row) => row.id === id)?.store === store)).join(", ") || "none";

  function changeEncoding(next: Encoding) {
    setEncoding(next);
    setColumnKey(columnsFor(next, codes)[0].key);
    setThreshold(thresholdChoices(next)[next === "integer" ? 1 : 0]);
  }

  return (
    <LabFrame kind="encoding" eyebrow="Try one depth-one split" title="Change the representation, then watch the branches">
      <div className={styles.labBody} data-encoding-mode={encoding} data-left-rows={groups.left.join(",")} data-right-rows={groups.right.join(",")}>
        <fieldset className={styles.modeChoices}>
          <legend>Representation</legend>
          {([
            ["integer", "Integer"],
            ["one-hot", "One-hot"],
            ["binary", "Binary"],
            ["frequency", "Frequency"],
          ] as const).map(([value, label]) => (
            <button type="button" key={value} aria-pressed={encoding === value} onClick={() => changeEncoding(value)}>{label}</button>
          ))}
        </fieldset>

        {(encoding === "integer" || encoding === "binary") && (
          <fieldset className={styles.codeChoices}>
            <legend>Assign each store a code · choosing an occupied code swaps them</legend>
            {STORES.map((store) => (
              <label key={store}>Store {store}
                <select aria-label={`Code for store ${store}`} value={codes[store]} onChange={(event) => setCodes((current) => swapCode(current, store, Number(event.target.value)))}>
                  {[0, 1, 2, 3].map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
            ))}
          </fieldset>
        )}

        <div className={styles.splitControls}>
          <label>Encoded column
            <select aria-label="Encoded column" value={active.key} onChange={(event) => setColumnKey(event.target.value)}>
              {columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
          </label>
          <label>Threshold
            <select aria-label="Threshold" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))}>
              {thresholdChoices(encoding).map((value) => <option key={value} value={value}>{formatValue(value)}</option>)}
            </select>
          </label>
        </div>

        <div className={styles.matrixGrid}>
          <div className={styles.tableScroll}>
            <table>
              <caption>Same six rows, encoded as {encoding}</caption>
              <thead><tr><th scope="col">Row</th><th scope="col">Store</th><th scope="col">Purchase</th>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
              <tbody>{VISITS.map((row, index) => (
                <tr key={row.id}><th scope="row">{row.id}</th><td>{row.store}</td><td>{row.purchase}</td>{columns.map((column) => <td key={column.key}>{formatValue(column.values[index])}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <div className={styles.resultPanel} aria-live="polite">
            <strong>One split: {active.label} &lt; {formatValue(threshold)}</strong>
            <div className={styles.branchPair}>
              <p><span>Yes · {storesIn(groups.left)}</span><small>Rows {groups.left.join(", ") || "none"}</small></p>
              <p><span>No · {storesIn(groups.right)}</span><small>Rows {groups.right.join(", ") || "none"}</small></p>
            </div>
            <p className={styles.smallNote}>Frequency gives A and B the same value, and C and D the same value. Unseen stores need a separate policy.</p>
          </div>
        </div>
      </div>
    </LabFrame>
  );
}

const STRENGTHS = [0, 1, 2, 4, 8] as const;

export function SmoothingAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const weight = STRENGTHS[step];
  const value = smoothed(1, 1, weight);

  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % STRENGTHS.length), 1600);
    return () => window.clearInterval(timer);
  }, [playing, reduced]);
  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);

  return (
    <LabFrame kind="smoothing" eyebrow="Smoothing changes the number, not its source" title="Follow row 4's target into C's encoding">
      <div className={styles.labBody} data-strength={weight} data-value={value.toFixed(3)}>
        <div className={styles.smoothingGrid}>
          <div className={styles.selectedRow}><span>Selected training row</span><strong>Row 4 · Store C · Purchase 1</strong><small>This is the only C visit.</small></div>
          <div className={styles.formulaPanel} aria-live="polite">
            <span>Target contribution from row 4</span>
            <strong>(<mark>1</mark> + {formatValue(weight * PRIOR)}) / {1 + weight}</strong>
            <small>({`1 + ${weight} × 0.5`}) / ({`1 + ${weight}`}) = {formatValue(value)}</small>
            <p>Row 4's own <strong>1</strong> is still in the numerator.</p>
          </div>
          <div className={styles.valuePanel}><span>Value handed to the tree</span><strong>{formatValue(value)}</strong><small>{weight === 0 ? "Full category mean" : `Prior weight a = ${weight}`}</small></div>
        </div>
        <div className={styles.stepControls}>
          <button type="button" onClick={() => setPlaying((current) => !current)} disabled={reduced} aria-label={playing ? "Pause smoothing animation" : "Play smoothing animation"}>{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => { setPlaying(false); setStep((current) => (current + 1) % STRENGTHS.length); }}>Next step</button>
          <button type="button" onClick={() => { setPlaying(false); setStep(0); }}>Reset</button>
          <label>Prior weight a
            <select aria-label="Prior weight" value={weight} onChange={(event) => { setPlaying(false); setStep(STRENGTHS.indexOf(Number(event.target.value) as typeof STRENGTHS[number])); }}>
              {STRENGTHS.map((strength) => <option key={strength} value={strength}>{strength}</option>)}
            </select>
          </label>
        </div>
        {reduced && <p className={styles.smallNote}>Automatic motion is off. Use Next step or choose a prior weight.</p>}
      </div>
    </LabFrame>
  );
}

const ORDERS = { default: DEFAULT_ORDER, alternate: ALTERNATE_ORDER } as const;
type OrderKey = keyof typeof ORDERS;

export function OrderedStatisticsPlayground() {
  const [mode, setMode] = useState<"training" | "inference">("training");
  const [orderKey, setOrderKey] = useState<OrderKey>("default");
  const [position, setPosition] = useState(0);
  const [focus, setFocus] = useState<Store | "all">("all");
  const [query, setQuery] = useState<QueryStore>("A");
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const order = ORDERS[orderKey];
  const eligible = order.map((id, index) => ({ id, index })).filter(({ id }) => focus === "all" || VISITS.find((row) => row.id === id)?.store === focus).map(({ index }) => index);
  const training = orderedValue(order, position);
  const result = mode === "training" ? training : inferenceValue(query);
  const currentId = mode === "training" ? training.row.id : 0;
  const contributorIds = result.contributingIds;

  function move(delta: -1 | 1) {
    const at = eligible.indexOf(position);
    const next = eligible[at + delta];
    if (next !== undefined) setPosition(next);
    else if (delta === 1) setPlaying(false);
  }

  useEffect(() => {
    if (!playing || reduced || mode !== "training") return;
    const timer = window.setInterval(() => move(1), 1700);
    return () => window.clearInterval(timer);
  }, [playing, reduced, mode, position, focus, orderKey]);
  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);

  function reset() {
    setPlaying(false);
    setMode("training");
    setOrderKey("default");
    setPosition(0);
    setFocus("all");
    setQuery("A");
  }

  return (
    <LabFrame kind="ordered" eyebrow="CatBoost mechanism · simplified ordered target statistic" title={mode === "training" ? "Read only the prefix available to this row" : "Use permitted training history for a new visit"}>
      <div className={styles.labBody} data-mode={mode} data-order={orderKey} data-row-id={currentId} data-value={result.value.toFixed(3)} data-contributors={contributorIds.join(",")}>
        <div className={styles.stepControls}>
          <button type="button" aria-pressed={mode === "training"} onClick={() => { setPlaying(false); setMode("training"); }}>Training row</button>
          <button type="button" aria-pressed={mode === "inference"} onClick={() => { setPlaying(false); setMode("inference"); }}>New visit</button>
          <button type="button" onClick={reset}>Reset all</button>
        </div>
        <div className={styles.splitControls}>
          {mode === "training" ? (
            <>
              <label>Permutation
                <select aria-label="Permutation" value={orderKey} onChange={(event) => { setPlaying(false); setOrderKey(event.target.value as OrderKey); setPosition(0); setFocus("all"); }}>
                  <option value="default">1, 2, 3, 4, 5, 6</option>
                  <option value="alternate">4, 6, 2, 5, 1, 3</option>
                </select>
              </label>
              <label>Store focus
                <select aria-label="Store focus" value={focus} onChange={(event) => { setPlaying(false); const next = event.target.value as Store | "all"; setFocus(next); setPosition(next === "all" ? 0 : order.findIndex((id) => VISITS.find((row) => row.id === id)?.store === next)); }}>
                  <option value="all">All stores</option>
                  {STORES.map((store) => <option key={store} value={store}>Store {store}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label>New visit to
              <select aria-label="New visit store" value={query} onChange={(event) => setQuery(event.target.value as QueryStore)}>
                {[...STORES, "E"].map((store) => <option key={store} value={store}>Store {store}{store === "E" ? " · unseen" : ""}</option>)}
              </select>
            </label>
          )}
        </div>
        {mode === "training" && (
          <div className={styles.stepControls}>
            <button type="button" onClick={() => move(-1)} disabled={eligible.indexOf(position) <= 0}>Previous row</button>
            <button type="button" onClick={() => move(1)} disabled={eligible.indexOf(position) >= eligible.length - 1}>Next row</button>
            <button type="button" onClick={() => setPlaying((current) => !current)} disabled={reduced || eligible.indexOf(position) >= eligible.length - 1}>{playing ? "Pause" : "Play"}</button>
            <span>Step {eligible.indexOf(position) + 1} of {eligible.length}</span>
          </div>
        )}
        <div className={styles.orderedGrid}>
          <ol className={styles.timeline} aria-label={mode === "training" ? "Training rows in selected permutation" : "All training rows"}>
            {(mode === "training" ? order : DEFAULT_ORDER).map((id, index) => {
              const row = VISITS.find((visit) => visit.id === id)!;
              const used = contributorIds.includes(id);
              const state = used ? "used" : mode === "training" && id === currentId ? "current · blocked" : mode === "training" && index > position ? "later · blocked" : "other store";
              return (
                <li key={id} className={used ? styles.usedRow : id === currentId ? styles.currentRow : ""} data-row-id={id} data-evidence={used ? "used" : state}>
                  <span>Row {id}</span><strong>{row.store}{row.purchase}</strong><small>{state}</small>
                </li>
              );
            })}
          </ol>
          <div className={styles.calculation} aria-live="polite">
            <p>{mode === "training" ? `Encoding row ${currentId} · store ${training.row.store}` : `New store ${query} · outcome unknown`}</p>
            <strong>{formatValue(result.value)}</strong>
            <dl>
              <div><dt>Contributing row IDs</dt><dd>{contributorIds.join(", ") || "none"}</dd></div>
              <div><dt>Sum</dt><dd>{result.sum}</dd></div>
              <div><dt>Count</dt><dd>{result.count}</dd></div>
            </dl>
            <p>({result.sum} + 0.5) / ({result.count} + 1) = {formatValue(result.value)}</p>
            <p className={styles.smallNote}>{mode === "training" ? "Only earlier rows of this store contribute. This row's target and all later rows are blocked." : "All matching training rows may contribute. The new visit's outcome is not known."}</p>
          </div>
        </div>
        {reduced && <p className={styles.smallNote}>Automatic motion is off. Use Previous row and Next row.</p>}
      </div>
    </LabFrame>
  );
}
