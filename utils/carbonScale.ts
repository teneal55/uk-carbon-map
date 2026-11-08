import { CARBON_COLOURS } from '@/styles/colours';

/**
 * Values below this (gCO2/kWh) are shown as "negligible" in one fixed colour,
 * not on the scale. Regions running almost entirely on wind or nuclear sit at
 * or near zero, and including them would stretch the scale so far that the
 * differences between every other region look small.
 */
export const NEGLIGIBLE_BELOW = 5;

export type CarbonStop = { value: number; colour: string };

// Used when there are no values at or above NEGLIGIBLE_BELOW to fit to.
const FALLBACK_RANGE: [number, number] = [NEGLIGIBLE_BELOW, 300];
// Mapbox needs strictly increasing stops, so the range is at least this wide.
const MIN_SPAN = CARBON_COLOURS.length - 1;

/**
 * Spreads the scale colours evenly from the lowest to the highest value at or
 * above NEGLIGIBLE_BELOW. Fit it to the whole timeline, not one half-hour, so
 * a colour means the same value at every point on the slider.
 */
export function carbonStops(values: number[]): CarbonStop[] {
  const counted = values.filter((v) => Number.isFinite(v) && v >= NEGLIGIBLE_BELOW);
  const [low, highest] =
    counted.length > 0 ? [Math.min(...counted), Math.max(...counted)] : FALLBACK_RANGE;
  const high = Math.max(highest, low + MIN_SPAN);

  const last = CARBON_COLOURS.length - 1;
  return CARBON_COLOURS.map((colour, i) => ({
    value: Math.round(low + ((high - low) * i) / last),
    colour,
  }));
}
