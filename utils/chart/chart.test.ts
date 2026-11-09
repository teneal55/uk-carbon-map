import { describe, expect, it } from 'vitest';
import {
  bandPath,
  dailyAverage,
  dailyRange,
  linePath,
  niceMax,
  regionSeries,
  rollingAverage,
  seriesAt,
  spanAverages,
} from './chart';

describe('spanAverages', () => {
  it('averages each stretch of days, skipping days with no data', () => {
    const series = [10, 20, null, 40, null, null];
    expect(
      spanAverages(series, [
        { start: 0, end: 1 },
        { start: 2, end: 3 },
        { start: 4, end: 5 },
      ]),
    ).toEqual([15, 40, null]);
  });
});

describe('rollingAverage', () => {
  it('averages each day with the days before it', () => {
    expect(rollingAverage([10, 20, 30, 40], 3)).toEqual([10, 15, 20, 30]);
  });

  it('skips days with no data, and stays null when the whole window is empty', () => {
    expect(rollingAverage([10, null, 30, null, null], 2)).toEqual([10, 10, 30, 30, null]);
  });
});

describe('dailyRange', () => {
  it('finds the lowest and highest series for each day', () => {
    expect(dailyRange([[1, 5, null], [3, 2, null], [2, null, null]])).toEqual({
      low: [1, 2, null],
      high: [3, 5, null],
    });
  });
});

describe('seriesAt', () => {
  it('blends between the days either side of a fractional position', () => {
    expect(seriesAt([100, 200], 0.25)).toBe(125);
    expect(seriesAt([100, 200], 5)).toBe(200);
    expect(seriesAt([null, 200], 0.5)).toBe(200);
    expect(seriesAt([], 0)).toBeNull();
  });
});

describe('bandPath', () => {
  it('goes along the top edge, back along the bottom, and closes', () => {
    expect(bandPath([10, 20], [30, 40], 100)).toBe('M0 70L1 60L1 80L0 90Z');
  });

  it('splits into separate shapes around days with no data', () => {
    expect(bandPath([10, null, 20], [30, null, 40], 100)).toBe('M0 70L0 90ZM2 60L2 80Z');
  });
});

describe('dailyAverage', () => {
  it('averages the regions with data for each day', () => {
    expect(dailyAverage([[10, 20, 30], [5, null, 15], [null, null, null]])).toEqual([20, 10, null]);
  });
});

describe('regionSeries', () => {
  it('picks out one region across every day', () => {
    expect(regionSeries([[1, 2], [3, 4], [5, null]], 1)).toEqual([2, 4, null]);
  });
});

describe('niceMax', () => {
  it('rounds the highest value up to a whole step', () => {
    expect(niceMax([12, 388.5, null])).toBe(400);
    expect(niceMax([400])).toBe(400);
  });

  it('never goes below one step', () => {
    expect(niceMax([0, null])).toBe(100);
  });
});

describe('linePath', () => {
  it('draws one point per day, with y counting down from the top', () => {
    expect(linePath([100, 250, 400], 400)).toBe('M0 300L1 150L2 0');
  });

  it('breaks the line at days with no data', () => {
    expect(linePath([100, null, 200, 300], 400)).toBe('M0 300M2 200L3 100');
  });
});
