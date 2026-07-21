/**
 * Visual grammar shared by the three reward-hacking labs.
 *
 * Every lab shows the same split — what the agent optimizes on the left, what
 * we actually care about on the right — so that by the third lab the reader
 * recognises the pattern without being told.
 */

import styles from "./RewardHacking.module.css";

export type RhLocale = "en" | "pt-BR";

export const isPt = (locale: RhLocale) => locale === "pt-BR";

/** Formats with a comma decimal separator in Portuguese. */
export function fmt(value: number, digits = 2, locale: RhLocale = "en"): string {
  const text = value.toFixed(digits);
  return isPt(locale) ? text.replace(".", ",") : text;
}

export interface ScoreItem {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}

/**
 * The two-column scoreboard. `optimized` is what the reward counts;
 * `human` is the outcome we judge it by. Keeping them visually separate is
 * the point of the whole article.
 */
export function Scoreboard({
  locale,
  optimized,
  human,
}: {
  locale: RhLocale;
  optimized: ScoreItem[];
  human: ScoreItem[];
}) {
  const columns: Array<{ heading: string; items: ScoreItem[] }> = [
    {
      heading: isPt(locale) ? "O agente vê" : "The agent sees",
      items: optimized,
    },
    {
      heading: isPt(locale) ? "Nós avaliamos" : "We evaluate",
      items: human,
    },
  ];

  return (
    <div className={styles.scoreboard}>
      {columns.map((column) => (
        <div className={styles.scoreColumn} key={column.heading}>
          <p className={styles.scoreHeading}>{column.heading}</p>
          {column.items.map((item) => (
            <div className={styles.scoreRow} key={item.label}>
              <span className={styles.scoreLabel}>{item.label}</span>
              <span
                className={[
                  styles.scoreValue,
                  item.tone === "good" ? styles.scoreValueGood : "",
                  item.tone === "bad" ? styles.scoreValueBad : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export interface QBar {
  label: string;
  value: number;
}

/**
 * The only training internals any lab shows: the Q-values of the competing
 * actions in one decisive state. A full Q-table would be noise.
 */
export function QBars({
  bars,
  accent,
  locale,
  tieNote,
}: {
  bars: QBar[];
  accent: string;
  locale: RhLocale;
  tieNote?: string;
}) {
  const values = bars.map((bar) => bar.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  // Q-values can be negative (the aligned traffic agent minimises delay), so
  // bars are drawn relative to the range rather than from zero.
  const span = Math.max(1e-9, max - min);
  const best = max;

  return (
    <div className={styles.qBars}>
      {bars.map((bar) => {
        const isWinner = Math.abs(bar.value - best) <= 1e-9;
        const width = 12 + ((bar.value - min) / span) * 88;
        return (
          <div className={styles.qBarRow} key={bar.label}>
            <span className={isWinner ? styles.qBarWinner : undefined}>
              {bar.label}
            </span>
            <span className={styles.qBarTrack}>
              <span
                className={styles.qBarFill}
                style={{
                  width: `${width}%`,
                  background: accent,
                  opacity: isWinner ? 1 : 0.35,
                }}
              />
            </span>
            <span className={styles.qBarValue}>{fmt(bar.value, 2, locale)}</span>
          </div>
        );
      })}
      {tieNote ? <p className={styles.caption}>{tieNote}</p> : null}
    </div>
  );
}

export function AgentTag({
  mode,
  locale,
}: {
  mode: "proxy" | "aligned";
  locale: RhLocale;
}) {
  const label =
    mode === "proxy"
      ? isPt(locale)
        ? "Recompensa proxy"
        : "Proxy reward"
      : isPt(locale)
        ? "Recompensa alinhada"
        : "Aligned reward";
  return (
    <span
      className={`${styles.agentTag} ${
        mode === "proxy" ? styles.agentTagProxy : styles.agentTagAligned
      }`}
    >
      {label}
    </span>
  );
}
