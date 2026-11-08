import { describe, expect, it } from 'vitest';
import { valuesAt } from './valuesAt';

const values = [
  [100, 0, null],
  [200, 40, 50],
  [300, 80, null],
];

describe('valuesAt', () => {
  it('returns a whole day unchanged', () => {
    expect(valuesAt(values, 1)).toBe(values[1]);
  });

  it('blends between the days either side of a fractional position', () => {
    expect(valuesAt(values, 0.25)).toEqual([125, 10, 50]);
    expect(valuesAt(values, 1.5)).toEqual([250, 60, 50]);
  });

  it('uses the other day when one side has no data, and keeps null when neither does', () => {
    expect(valuesAt([[null], [20]], 0.5)).toEqual([20]);
    expect(valuesAt([[null], [null]], 0.5)).toEqual([null]);
  });

  it('clamps positions outside the timeline to the first or last day', () => {
    expect(valuesAt(values, -3)).toBe(values[0]);
    expect(valuesAt(values, 9)).toBe(values[2]);
  });

  it('returns nothing for an empty timeline', () => {
    expect(valuesAt([], 0)).toEqual([]);
  });
});
