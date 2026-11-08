import { describe, expect, it } from 'vitest';
import { CARBON_COLOURS } from '@/styles/colours';
import { NEGLIGIBLE_BELOW, carbonStops } from './carbonScale';

describe('carbonStops', () => {
  it('spreads the colours evenly from the lowest to highest non-negligible value', () => {
    const stops = carbonStops([0, 0, 1, 4, 58, 200, 393]);
    expect(stops.map((s) => s.value)).toEqual([58, 142, 226, 309, 393]);
    expect(stops.map((s) => s.colour)).toEqual([...CARBON_COLOURS]);
  });

  it('ignores values below the negligible threshold', () => {
    const withZeros = carbonStops([0, 0, 0, 100, 300]);
    const without = carbonStops([100, 300]);
    expect(withZeros).toEqual(without);
  });

  it('keeps stops strictly increasing when every value is the same', () => {
    const values = carbonStops([120, 120, 120]).map((s) => s.value);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
  });

  it('falls back to a fixed range when everything is negligible', () => {
    const values = carbonStops([0, 1, 2]).map((s) => s.value);
    expect(values[0]).toBe(NEGLIGIBLE_BELOW);
    expect(values.at(-1)).toBe(300);
  });
});
