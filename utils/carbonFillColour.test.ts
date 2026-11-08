import { describe, expect, it } from 'vitest';
import type { Region } from '@/services/carbon';
import { COLOURS } from '@/styles/colours';
import { carbonFillColour } from './carbonFillColour';
import { NEGLIGIBLE_BELOW, carbonStops } from './carbonScale';

const region = (regionid: number, forecast: number): Region => ({
  regionid,
  shortname: `Region ${regionid}`,
  intensity: { forecast, index: 'moderate' },
  generationmix: [],
});

describe('carbonFillColour', () => {
  const stops = carbonStops([60, 400]);

  it('uses the no-data colour when there are no regions', () => {
    expect(carbonFillColour([], stops, '#000000')).toBe('#000000');
  });

  it('shows negligible values in one colour and the rest on the scale', () => {
    const expr = carbonFillColour([region(1, 2), region(13, 250)], stops, '#000000') as unknown[];
    const intensity = ['match', ['get', 'region_id'], 1, 2, 13, 250, -1];

    expect(expr).toEqual([
      'case',
      ['<', intensity, 0],
      '#000000',
      ['<', intensity, NEGLIGIBLE_BELOW],
      COLOURS.negligible,
      ['interpolate-lab', ['linear'], intensity, ...stops.flatMap((s) => [s.value, s.colour])],
    ]);
  });

  it('keeps one entry per region when the API repeats a region', () => {
    const expr = carbonFillColour([region(1, 20), region(1, 30)], stops, '#000000') as unknown[];
    const intensity = (expr[1] as unknown[])[1];
    expect(intensity).toEqual(['match', ['get', 'region_id'], 1, 30, -1]);
  });
});
