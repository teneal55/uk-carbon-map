import { describe, expect, it } from 'vitest';
import { CARBON_SCALE } from '@/styles/colours';
import { INTENSITY_STATE, carbonFillColour, carbonStops, carbonTicks } from './carbonScale';

describe('carbonStops', () => {
  it('places the colours from zero to the highest value', () => {
    const stops = carbonStops([0, 1, 58, 200, 400]);
    expect(stops.map((s) => s.value)).toEqual(CARBON_SCALE.map((s) => s.at * 400));
    expect(stops.map((s) => s.colour)).toEqual(CARBON_SCALE.map((s) => s.colour));
  });

  it('keeps stops strictly increasing', () => {
    const values = carbonStops([0, 3]).map((s) => s.value);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
  });

  it('falls back to a fixed range when there are no positive values', () => {
    const values = carbonStops([0, 0]).map((s) => s.value);
    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBe(300);
  });
});

describe('carbonTicks', () => {
  it('spaces rounded values evenly across the scale', () => {
    expect(carbonTicks(carbonStops([388.5]))).toEqual([0, 97, 194, 291, 389]);
  });
});

describe('carbonFillColour', () => {
  const stops = carbonStops([60, 400]);

  it('colours regions by the intensity in their feature state', () => {
    const intensity = ['coalesce', ['feature-state', INTENSITY_STATE], -1];

    expect(carbonFillColour(stops, '#000000')).toEqual([
      'case',
      ['<', intensity, 0],
      '#000000',
      ['interpolate-lab', ['linear'], intensity, ...stops.flatMap((s) => [s.value, s.colour])],
    ]);
  });
});
