import { useEffect, useId, useMemo, useState } from "react";
import { AutocorrelationPlayground, type TimeSeriesPoint } from "./AutocorrelationPlayground";
import { PartialAutocorrelationPlayground } from "./PartialAutocorrelationPlayground";
import styles from "./SyntheticArPlaygrounds.module.css";

interface SyntheticPoint extends TimeSeriesPoint {
  innovation: number;
}

const PHI = 0.8;
const INNOVATION_SCALE = 0.65;
const POINT_COUNT = 160;
const PLOT = { width: 960, height: 300, left: 52, right: 20, top: 22, bottom: 52 };

export function generateAr1Series(count = POINT_COUNT, seed = 2): SyntheticPoint[] {
  let state = seed >>> 0;
  let spareGaussian: number | null = null;
  const uniform = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };
  const gaussian = () => {
    if (spareGaussian !== null) {
      const value = spareGaussian;
      spareGaussian = null;
      return value;
    }
    const first = Math.max(uniform(), 1e-12);
    const second = uniform();
    const magnitude = Math.sqrt(-2 * Math.log(first));
    spareGaussian = magnitude * Math.sin(2 * Math.PI * second);
    return magnitude * Math.cos(2 * Math.PI * second);
  };

  const points: SyntheticPoint[] = [{ date: "1", value: 1, innovation: 0 }];
  for (let index = 1; index < count; index += 1) {
    const innovation = INNOVATION_SCALE * gaussian();
    points.push({
      date: String(index + 1),
      value: PHI * points[index - 1].value + innovation,
      innovation,
    });
  }
  return points;
}

function format(value: number): string {
  return value.toFixed(2).replace("-", "−");
}

function subscriptNumber(value: number): string {
  const digits = "₀₁₂₃₄₅₆₇₈₉";
  return String(value).replace(/\d/g, (digit) => digits[Number(digit)]);
}

function SyntheticSeriesChart({ points, revealed }: { points: SyntheticPoint[]; revealed: number }) {
  const plotRight = PLOT.width - PLOT.right;
  const plotBottom = PLOT.height - PLOT.bottom;
  const limit = Math.ceil(Math.max(1, ...points.map((point) => Math.abs(point.value))) * 2) / 2;
  const x = (index: number) => PLOT.left + index / (points.length - 1) * (plotRight - PLOT.left);
  const y = (value: number) => PLOT.top + (limit - value) / (2 * limit) * (plotBottom - PLOT.top);
  const visible = points.slice(0, revealed);
  const path = visible
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(point.value).toFixed(2)}`)
    .join(" ");
  const currentIndex = revealed - 1;
  const previousIndex = Math.max(0, currentIndex - 1);

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
      role="img"
      aria-label={`${revealed} of ${points.length} values constructed from the recurrence X t plus one equals zero point eight X t plus a Gaussian error.`}
    >
      <title>A synthetic AR(1) series being constructed</title>
      <desc>Each new point uses the preceding point and a new independent Gaussian error. The current transition is highlighted.</desc>
      {[-limit, 0, limit].map((tick) => (
        <g key={tick}>
          <line className={tick === 0 ? styles.zeroLine : styles.gridline} x1={PLOT.left} x2={plotRight} y1={y(tick)} y2={y(tick)} />
          <text className={styles.tick} x={PLOT.left - 10} y={y(tick) + 4} textAnchor="end">{format(tick)}</text>
        </g>
      ))}
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((index) => (
        <text className={styles.tick} x={x(index)} y={plotBottom + 24} textAnchor="middle" key={index}>{index + 1}</text>
      ))}
      <path className={styles.series} d={path} />
      {revealed > 1 && (
        <line
          className={styles.currentStep}
          x1={x(previousIndex)}
          y1={y(points[previousIndex].value)}
          x2={x(currentIndex)}
          y2={y(points[currentIndex].value)}
        />
      )}
      <circle className={styles.currentPoint} cx={x(currentIndex)} cy={y(points[currentIndex].value)} r="5" />
      <text className={styles.axisLabel} x={(PLOT.left + plotRight) / 2} y={PLOT.height - 7} textAnchor="middle">Time t</text>
    </svg>
  );
}

export function SyntheticSeriesBuilder() {
  const points = useMemo(() => generateAr1Series(), []);
  const [revealed, setRevealed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const liveId = useId();
  const current = points[revealed - 1];
  const previous = points[Math.max(0, revealed - 2)];

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setTimeout(() => {
      setRevealed((count) => {
        const next = Math.min(points.length, count + 1);
        if (next === points.length) setIsPlaying(false);
        return next;
      });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [isPlaying, points.length, revealed]);

  const toggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(points.length);
      return;
    }
    if (revealed === points.length) setRevealed(1);
    setIsPlaying(true);
  };

  return (
    <section className={styles.builder} aria-label="Construct a synthetic AR(1) time series">
      <div className={styles.header}>
        <strong>Build the series</strong>
        <span>{revealed} of {points.length} observations</span>
      </div>
      <SyntheticSeriesChart points={points} revealed={revealed} />
      <div className={styles.footer}>
        <p className={styles.step}>
          {revealed === 1
            ? <>X{subscriptNumber(1)} = 1</>
            : <>X{subscriptNumber(revealed)} = 0.8 × {format(previous.value)} + {format(current.innovation)} = <strong>{format(current.value)}</strong></>}
        </p>
        <button type="button" className={styles.playButton} onClick={toggle} aria-describedby={liveId}>
          {isPlaying ? "Pause" : revealed === points.length ? "Replay" : "Build series"}
        </button>
      </div>
      <p id={liveId} className={styles.srOnly} aria-live="polite">
        Observation {revealed} of {points.length}. Current value {format(current.value)}.
      </p>
    </section>
  );
}

export function SyntheticAutocorrelationPlayground() {
  const points = useMemo(() => generateAr1Series(), []);
  return <AutocorrelationPlayground points={points} seriesKind="synthetic" />;
}

export function SyntheticPartialAutocorrelationPlayground() {
  const points = useMemo(() => generateAr1Series(), []);
  return <PartialAutocorrelationPlayground points={points} />;
}
