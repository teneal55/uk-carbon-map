/** Days in the chart's rolling average: each day and the 6 before it. */
export const SMOOTHING_DAYS = 7;

/**
 * The average across regions for each day: a plain mean of the regions with
 * data, not weighted by how much electricity each region uses. Null for a day
 * with no data at all.
 */
export function dailyAverage(values: (number | null)[][]): (number | null)[] {
  return values.map((row) => {
    const known = row.filter((v): v is number => v !== null);
    return known.length > 0 ? known.reduce((sum, v) => sum + v, 0) / known.length : null;
  });
}

/**
 * A trailing rolling average: each day becomes the mean of itself and the
 * `window - 1` days before it, ignoring days with no data. It only looks back,
 * so the line at a day never uses data from after it, which suits a chart
 * drawn as the year plays. The first few days average over fewer days.
 */
export function rollingAverage(series: (number | null)[], window = 7): (number | null)[] {
  return series.map((_, i) => {
    const known = series
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    return known.length > 0 ? known.reduce((sum, v) => sum + v, 0) / known.length : null;
  });
}

/** The lowest and highest value across several series, for each day. */
export function dailyRange(series: (number | null)[][]): { low: (number | null)[]; high: (number | null)[] } {
  const days = series[0]?.length ?? 0;
  const low: (number | null)[] = [];
  const high: (number | null)[] = [];
  for (let day = 0; day < days; day++) {
    const known = series.map((s) => s[day]).filter((v): v is number => v !== null);
    low.push(known.length > 0 ? Math.min(...known) : null);
    high.push(known.length > 0 ? Math.max(...known) : null);
  }
  return { low, high };
}

/** A series' value at a fractional day, blended between the days either side. */
export function seriesAt(series: (number | null)[], position: number): number | null {
  if (series.length === 0) return null;
  const clamped = Math.min(Math.max(position, 0), series.length - 1);
  const before = Math.floor(clamped);
  const after = Math.min(before + 1, series.length - 1);
  const a = series[before];
  const b = series[after];
  if (a === null) return b;
  if (b === null) return a;
  return a + (b - a) * (clamped - before);
}

/**
 * The mean of a series over each stretch of days (inclusive `start` to `end`
 * indexes), ignoring days with no data. Null for a stretch with none.
 */
export function spanAverages(series: (number | null)[], spans: { start: number; end: number }[]): (number | null)[] {
  return spans.map(({ start, end }) => {
    const known = series.slice(start, end + 1).filter((v): v is number => v !== null);
    return known.length > 0 ? known.reduce((sum, v) => sum + v, 0) / known.length : null;
  });
}

/** One region's value for every day, from the values[day][region] table. */
export function regionSeries(values: (number | null)[][], region: number): (number | null)[] {
  return values.map((row) => row[region] ?? null);
}

/** The top of the chart's y-axis: the highest value rounded up to a whole `step`. */
export function niceMax(values: (number | null)[], step = 100): number {
  const highest = values.reduce<number>((max, v) => (v !== null && v > max ? v : max), 0);
  return Math.max(step, Math.ceil(highest / step) * step);
}

/**
 * An SVG path for a line through one value per day, in chart units: x is the
 * day index and y counts down from `yMax` (SVG's y grows downwards). A day
 * with no data breaks the line rather than joining across the gap.
 */
export function linePath(series: (number | null)[], yMax: number): string {
  let path = '';
  let drawing = false;
  series.forEach((v, x) => {
    if (v === null) {
      drawing = false;
      return;
    }
    path += `${drawing ? 'L' : 'M'}${x} ${+(yMax - v).toFixed(2)}`;
    drawing = true;
  });
  return path;
}

/**
 * An SVG path for a filled band between two lines, in the same units as
 * linePath. Days missing either edge split the band into separate pieces.
 */
export function bandPath(low: (number | null)[], high: (number | null)[], yMax: number): string {
  const y = (v: number) => +(yMax - v).toFixed(2);
  let path = '';
  let run: number[] = [];

  // Each run of days with both edges becomes one closed shape: along the top
  // edge left to right, then back along the bottom edge.
  const close = () => {
    if (run.length > 0) {
      const top = run.map((x, i) => `${i === 0 ? 'M' : 'L'}${x} ${y(high[x]!)}`).join('');
      const bottom = [...run].reverse().map((x) => `L${x} ${y(low[x]!)}`).join('');
      path += `${top}${bottom}Z`;
    }
    run = [];
  };

  low.forEach((l, x) => {
    if (l === null || high[x] === null || high[x] === undefined) close();
    else run.push(x);
  });
  close();
  return path;
}
