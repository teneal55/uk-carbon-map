import type { TimelinePeriod } from '@/types/timeline';

// Everything here uses UK time, so the server and the browser format a date the
// same way (no hydration mismatch), and each day lands in the right month (a
// day's `from` is UK midnight).
const dateParts = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/London',
});
const ordinalRules = new Intl.PluralRules('en-GB', { type: 'ordinal' });
const SUFFIXES: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'st', two: 'nd', few: 'rd' };

/** A date as it reads in the UK, e.g. "2nd November 2025". */
export function ordinalDate(date: Date): string {
  const parts = Object.fromEntries(dateParts.formatToParts(date).map((p) => [p.type, p.value]));
  const day = Number(parts.day);
  return `${day}${SUFFIXES[ordinalRules.select(day)] ?? 'th'} ${parts.month} ${parts.year}`;
}

const monthKey = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/London',
});
const monthNumber = new Intl.DateTimeFormat('en-GB', { month: 'numeric', timeZone: 'Europe/London' });
// Fixed three-letter names: en-GB's short format gives "Sept" for September.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Months with fewer days than this in the timeline (a part month at either end)
// get no label, as there isn't room under the slider.
const MIN_DAYS = 10;

export type MonthLabel = {
  /** Short month name, e.g. "Nov". */
  label: string;
  /** Where the label goes along the slider, 0 (first day) to 1 (last day): the middle of the month. */
  position: number;
};

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Autumn';

// Meteorological seasons, by month (1-12): winter is December to February, and so on.
const SEASON_BY_MONTH: Season[] = [
  'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer',
  'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter',
];

export type SeasonSpan = {
  season: Season;
  /** Index of the first day in this stretch of the season. */
  start: number;
  /** Index of the last day. */
  end: number;
};

/**
 * Each stretch of consecutive days in the same meteorological season. A year
 * that doesn't start on a season boundary has the same season at both ends
 * (e.g. autumn), as two separate stretches.
 */
export function seasonSpans(periods: TimelinePeriod[]): SeasonSpan[] {
  const spans: SeasonSpan[] = [];
  periods.forEach((p, i) => {
    const season = SEASON_BY_MONTH[Number(monthNumber.format(new Date(p.from))) - 1];
    const span = spans.at(-1);
    if (span?.season === season) span.end = i;
    else spans.push({ season, start: i, end: i });
  });
  return spans;
}

/** A label for each month on a timeline of days, placed under the middle of that month. */
export function monthLabels(periods: TimelinePeriod[], minDays = MIN_DAYS): MonthLabel[] {
  if (periods.length < 2) return [];
  const last = periods.length - 1;

  // Runs of consecutive days in the same month: [first index, last index].
  const runs: { key: string; date: Date; start: number; end: number }[] = [];
  periods.forEach((p, i) => {
    const date = new Date(p.from);
    const key = monthKey.format(date);
    const run = runs.at(-1);
    if (run?.key === key) run.end = i;
    else runs.push({ key, date, start: i, end: i });
  });

  return runs
    .filter((r) => r.end - r.start + 1 >= minDays)
    .map((r) => ({
      label: MONTHS[Number(monthNumber.format(r.date)) - 1],
      position: (r.start + r.end) / 2 / last,
    }));
}
