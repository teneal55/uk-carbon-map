import type { ExpressionSpecification } from 'mapbox-gl';
import type { RegionIntensity } from '@/services/carbon';
import { COLOURS } from '@/styles/colours';
import { NEGLIGIBLE_BELOW, type CarbonStop } from './carbonScale';

const MISSING = -1;

/**
 * Builds a Mapbox fill-color expression that colours each feature by its
 * region's forecast intensity, looked up by the feature's `region_id`:
 * - no forecast: `noDataColour`
 * - below NEGLIGIBLE_BELOW: the negligible colour
 * - otherwise: blended along `stops` (from carbonStops)
 */
export function carbonFillColour(
  regions: RegionIntensity[],
  stops: CarbonStop[],
  noDataColour: string,
): string | ExpressionSpecification {
  // One label per region: Mapbox rejects duplicate labels in a match expression.
  const forecasts = new Map(regions.map((r) => [r.regionid, r.intensity.forecast]));
  if (forecasts.size === 0) return noDataColour;

  const intensity: ExpressionSpecification = [
    'match',
    ['get', 'region_id'],
    ...[...forecasts].flat(),
    MISSING,
  ];

  return [
    'case',
    ['<', intensity, 0],
    noDataColour,
    ['<', intensity, NEGLIGIBLE_BELOW],
    COLOURS.negligible,
    ['interpolate-lab', ['linear'], intensity, ...stops.flatMap((s) => [s.value, s.colour])],
  ];
}
