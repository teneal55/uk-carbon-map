import type { ExpressionSpecification } from 'mapbox-gl';
import { CARBON_SCALE } from '@/styles/colours';

export type CarbonStop = { value: number; colour: string };

// Used when there are no positive values to fit to.
const FALLBACK_HIGH = 300;
// How many evenly spaced numbers the legend shows under the scale.
const TICK_COUNT = 5;

/**
 * Places the scale colours from zero to the highest value, at the positions
 * set in CARBON_SCALE. Fit it to the whole timeline, not one period, so a
 * colour means the same value at every point on the slider.
 */
export function carbonStops(values: number[]): CarbonStop[] {
  const highest = values.reduce((max, v) => (Number.isFinite(v) && v > max ? v : max), 0);
  const high = highest > 0 ? highest : FALLBACK_HIGH;
  return CARBON_SCALE.map(({ colour, at }) => ({ value: at * high, colour }));
}

/** Evenly spaced, rounded values from the bottom to the top of the scale, for the legend. */
export function carbonTicks(stops: CarbonStop[]): number[] {
  const low = stops[0]?.value ?? 0;
  const high = stops.at(-1)?.value ?? FALLBACK_HIGH;
  return Array.from({ length: TICK_COUNT }, (_, i) =>
    Math.round(low + ((high - low) * i) / (TICK_COUNT - 1)),
  );
}

/** The feature-state key each region's current intensity is stored under. */
export const INTENSITY_STATE = 'intensity';

/**
 * Builds a Mapbox fill-color expression that colours each region by the
 * intensity in its feature state (set with map.setFeatureState):
 * - no value: `noDataColour`
 * - otherwise: blended along `stops` (from carbonStops)
 *
 * Reading from feature state means playback only updates 14 numbers each
 * frame, rather than replacing the whole expression.
 */
export function carbonFillColour(stops: CarbonStop[], noDataColour: string): ExpressionSpecification {
  const intensity: ExpressionSpecification = ['coalesce', ['feature-state', INTENSITY_STATE], -1];
  return [
    'case',
    ['<', intensity, 0],
    noDataColour,
    ['interpolate-lab', ['linear'], intensity, ...stops.flatMap((s) => [s.value, s.colour])],
  ];
}
