'use client';

import Map, { Layer, Source, type MapEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type {
  FillLayerSpecification,
  LineLayerSpecification,
  LngLatBoundsLike,
  PaddingOptions,
} from 'mapbox-gl';

const regionFill: FillLayerSpecification = {
  id: 'regions-fill',
  type: 'fill',
  source: 'regions',
  paint: {
    'fill-color': '#9ca3af',
    'fill-opacity': 0.9,
  },
};

const regionOutline: LineLayerSpecification = {
  id: 'regions-outline',
  type: 'line',
  source: 'regions',
  paint: {
    'line-color': '#ffffff',
    'line-width': 1,
  },
};

// Constants
const UK_BOUNDS: LngLatBoundsLike = [-8.7, 49.9, 1.8, 60.9];
const UK_PADDING_PX = 60; // space between the UK and the screen edges
const OCEAN_SHARE = 0.4; // share of a landscape screen kept as ocean on the left

// Space to leave around the UK. On landscape screens a wide left margin pushes
// the UK to the right, leaving ocean on the left. Portrait screens are too
// narrow for that, so the UK stays centred.
function ukPadding(width: number, height: number): PaddingOptions {
  const left = width > height ? Math.max(UK_PADDING_PX, width * OCEAN_SHARE) : UK_PADDING_PX;
  return { top: UK_PADDING_PX, bottom: UK_PADDING_PX, right: UK_PADDING_PX, left };
}

// The map can't be moved, so refit the UK whenever the screen size changes.
function fitUk(e: MapEvent) {
  const map = e.target;
  const { clientWidth, clientHeight } = map.getContainer();
  map.fitBounds(UK_BOUNDS, { padding: ukPadding(clientWidth, clientHeight), animate: false });
}

export default function MapView() {
  return (
    <Map
      initialViewState={{ bounds: UK_BOUNDS, fitBoundsOptions: { padding: UK_PADDING_PX } }}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      style={{ width: '100%', height: '100vh' }}
      mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
      onLoad={fitUk}
      onResize={fitUk}
      // Fixed view: turn off every way of panning, zooming or rotating.
      scrollZoom={false}
      dragPan={false}
      dragRotate={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
      touchPitch={false}
      boxZoom={false}
      keyboard={false}
      projection="mercator"
    >
      <Source id="uk-mask" type="geojson" data="/uk-mask.geojson">
        <Layer
          id="uk-mask-fill"
          type="fill"
          paint={{ 'fill-color': '#6b7280', 'fill-opacity': 0.6 }}
        />
      </Source>
      <Source id="regions" type="geojson" data="/regions.geojson" promoteId="region_id">
        <Layer {...regionFill} />
        <Layer {...regionOutline} />
      </Source>
    </Map>
  );
}