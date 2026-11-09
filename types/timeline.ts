/** One day on the timeline: UK midnight to midnight, in UTC, e.g. "2026-11-07T00:00Z". */
export type TimelinePeriod = { from: string; to: string };

/**
 * Daily average carbon intensity for every map region, in a compact table so
 * it stays small when sent to the browser.
 */
export type Timeline = {
  periods: TimelinePeriod[];
  /** The region ids the columns of `values` belong to. */
  regionIds: number[];
  /** values[day][region]: gCO2/kWh in the same order as regionIds, or null if there's no data. */
  values: (number | null)[][];
};
