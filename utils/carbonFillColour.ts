import type { ExpressionSpecification } from 'mapbox-gl';
import type { CarbonStop } from './carbonScale';

const MISSING = -1;

/**
 * Builds a Mapbox fill-color expression that colours each feature by its
 * region's intensity, looked up by the feature's `region_id`:
 * - no value: `noDataColour`
 * - otherwise: blended along `stops` (from carbonStops)
 *
 * `values[i]` is the intensity for `regionIds[i]`, or null if there's no data.
 */
export function carbonFillColour(
  regionIds: number[],
  values: (number | null)[],
  stops: CarbonStop[],
  noDataColour: string,
): string | ExpressionSpecification {
  // One label per region: Mapbox rejects duplicate labels in a match expression.
  const intensities = new Map<number, number>();
  regionIds.forEach((id, i) => {
    const value = values[i];
    if (value != null) intensities.set(id, value);
  });
  if (intensities.size === 0) return noDataColour;

  const intensity: ExpressionSpecification = [
    'match',
    ['get', 'region_id'],
    ...[...intensities].flat(),
    MISSING,
  ];

  return [
    'case',
    ['<', intensity, 0],
    noDataColour,
    ['interpolate-lab', ['linear'], intensity, ...stops.flatMap((s) => [s.value, s.colour])],
  ];
}
