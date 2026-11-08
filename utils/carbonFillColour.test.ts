import { describe, expect, it } from 'vitest';
import { carbonFillColour } from './carbonFillColour';
import { carbonStops } from './carbonScale';

describe('carbonFillColour', () => {
  const stops = carbonStops([60, 400]);

  it('uses the no-data colour when there are no values', () => {
    expect(carbonFillColour([], [], stops, '#000000')).toBe('#000000');
    expect(carbonFillColour([1, 2], [null, null], stops, '#000000')).toBe('#000000');
  });

  it('blends every value, including near zero, along the scale', () => {
    const expr = carbonFillColour([1, 13], [2, 250], stops, '#000000') as unknown[];
    const intensity = ['match', ['get', 'region_id'], 1, 2, 13, 250, -1];

    expect(expr).toEqual([
      'case',
      ['<', intensity, 0],
      '#000000',
      ['interpolate-lab', ['linear'], intensity, ...stops.flatMap((s) => [s.value, s.colour])],
    ]);
  });

  it('leaves regions with no value out, so they fall back to no data', () => {
    const expr = carbonFillColour([1, 2], [20, null], stops, '#000000') as unknown[];
    const intensity = (expr[1] as unknown[])[1];
    expect(intensity).toEqual(['match', ['get', 'region_id'], 1, 20, -1]);
  });

  it('keeps one entry per region when a region id repeats', () => {
    const expr = carbonFillColour([1, 1], [20, 30], stops, '#000000') as unknown[];
    const intensity = (expr[1] as unknown[])[1];
    expect(intensity).toEqual(['match', ['get', 'region_id'], 1, 30, -1]);
  });
});
