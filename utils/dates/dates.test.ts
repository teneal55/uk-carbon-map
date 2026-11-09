import { describe, expect, it } from 'vitest';
import type { TimelinePeriod } from '@/types/timeline';
import { monthLabels, ordinalDate, seasonSpans } from './dates';

describe('ordinalDate', () => {
  it.each([
    ['2025-11-01T00:00Z', '1st November 2025'],
    ['2025-11-02T00:00Z', '2nd November 2025'],
    ['2025-11-03T00:00Z', '3rd November 2025'],
    ['2025-11-04T00:00Z', '4th November 2025'],
    ['2025-11-11T00:00Z', '11th November 2025'],
    ['2025-11-12T00:00Z', '12th November 2025'],
    ['2025-11-13T00:00Z', '13th November 2025'],
    ['2025-11-21T00:00Z', '21st November 2025'],
    ['2025-11-22T00:00Z', '22nd November 2025'],
    ['2025-12-31T00:00Z', '31st December 2025'],
  ])('formats %s as %s', (iso, expected) => {
    expect(ordinalDate(new Date(iso))).toBe(expected);
  });

  it('uses the UK date during British Summer Time', () => {
    // UK midnight on 1 June is 23:00 UTC on 31 May.
    expect(ordinalDate(new Date('2026-05-31T23:00Z'))).toBe('1st June 2026');
  });
});

/** One period per UTC day from `start`, for `count` days. */
function days(start: string, count: number): TimelinePeriod[] {
  return Array.from({ length: count }, (_, i) => {
    const from = new Date(Date.parse(start) + i * 86_400_000);
    const to = new Date(from.getTime() + 86_400_000);
    return { from: from.toISOString(), to: to.toISOString() };
  });
}

describe('monthLabels', () => {
  it('labels each month under its middle day', () => {
    // 1 Dec 2025 to 31 Jan 2026: 62 days, indexes 0-61.
    expect(monthLabels(days('2025-12-01T00:00Z', 62))).toEqual([
      { label: 'Dec', position: 15 / 61 },
      { label: 'Jan', position: 46 / 61 },
    ]);
  });

  it('skips part months at the ends that are too short to label', () => {
    // 25 Dec 2025 to 3 Feb 2026: 7 days of Dec, all of Jan, 3 days of Feb.
    const labels = monthLabels(days('2025-12-25T00:00Z', 41));
    expect(labels.map((l) => l.label)).toEqual(['Jan']);
  });

  it('labels a year of days with every month once, plus the longer part month', () => {
    // 8 Nov 2025 to 7 Nov 2026, like the app's data: 23 days of Nov 2025 get a
    // label, the 7 days of Nov 2026 don't.
    const labels = monthLabels(days('2025-11-08T00:00Z', 365)).map((l) => l.label);
    expect(labels).toEqual(['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
  });

  it('returns nothing for a timeline too short for a slider', () => {
    expect(monthLabels(days('2025-11-08T00:00Z', 1))).toEqual([]);
  });
});

describe('seasonSpans', () => {
  it('splits a year of days into meteorological seasons, with autumn at both ends', () => {
    // 8 Nov 2025 to 7 Nov 2026, like the app's data.
    const spans = seasonSpans(days('2025-11-08T00:00Z', 365));
    expect(spans.map((s) => s.season)).toEqual(['Autumn', 'Winter', 'Spring', 'Summer', 'Autumn']);
    // Winter starts on 1 December, 23 days in, and the spans cover every day.
    expect(spans[1].start).toBe(23);
    expect(spans[0].start).toBe(0);
    expect(spans.at(-1)?.end).toBe(364);
    spans.slice(1).forEach((s, i) => expect(s.start).toBe(spans[i].end + 1));
  });
});
