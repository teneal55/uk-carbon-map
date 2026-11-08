import type { MapEvent } from 'react-map-gl/mapbox';
import type { FillLayerSpecification, LineLayerSpecification } from 'mapbox-gl';
import { COLOURS, HATCH, hexToRgb } from '@/styles/colours';

// Fixed Mapbox layer styles for the map. The regions' fill colour depends on
// the data, so it's built in MapView with utils/carbonFillColour instead.

const BORDER_WIDTH = 1.2;

export const regionOutline: LineLayerSpecification = {
  id: 'regions-outline',
  type: 'line',
  source: 'regions',
  paint: {
    'line-color': COLOURS.border,
    'line-width': BORDER_WIDTH,
  },
};

// Northern Ireland is part of the UK but runs on a separate grid, so there's no
// carbon data for it. Draw it like the rest of the UK, but in a neutral colour
// and outside the regions source so data styling never applies to it.
export const northernIrelandFill: FillLayerSpecification = {
  id: 'northern-ireland-fill',
  type: 'fill',
  source: 'northern-ireland',
  paint: {
    'fill-color': COLOURS.noData,
    'fill-opacity': 0.9,
  },
};

export const northernIrelandOutline: LineLayerSpecification = {
  id: 'northern-ireland-outline',
  type: 'line',
  source: 'northern-ireland',
  paint: {
    'line-color': COLOURS.border,
    'line-width': BORDER_WIDTH,
    'line-opacity': HATCH.opacity, // as faint as the stripes, so NI stays in the background
  },
};

// Stripes over Northern Ireland's fill (see HATCH in styles/colours.ts). Mapbox
// draws fill patterns from an image, which addHatchPattern creates on load.
const HATCH_PATTERN_ID = 'no-data-hatch';

export const northernIrelandHatch: FillLayerSpecification = {
  id: 'northern-ireland-hatch',
  type: 'fill',
  source: 'northern-ireland',
  paint: {
    'fill-pattern': HATCH_PATTERN_ID,
  },
};

/** Adds the hatch stripe image to the map. Call on load, before showing northernIrelandHatch. */
export function addHatchPattern(map: MapEvent['target']) {
  if (map.hasImage(HATCH_PATTERN_ID)) return; // already added, e.g. after a hot reload
  const { size, lineWidth, pixelRatio } = HATCH;
  const rgba = [...hexToRgb(HATCH.colour), Math.round(HATCH.opacity * 255)];
  const data = new Uint8Array(size * size * 4); // transparent RGBA pixels
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Pixels where x + y is near a multiple of the tile size form a "/" stripe
      // that joins up seamlessly with the next tile.
      if ((x + y) % size < lineWidth) data.set(rgba, (y * size + x) * 4);
    }
  }
  map.addImage(HATCH_PATTERN_ID, { width: size, height: size, data }, { pixelRatio });
}
