'use client';

import Map, { Layer, NavigationControl, Source } from 'react-map-gl/mapbox';
import type { LngLatBoundsLike } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Constants
const INITIAL_ZOOM = 4.6;
// TODO: maxBounds raises the minimum zoom based on the width of these bounds, so
// on wide screens scrolling may jump the map in (about zoom 6.6 at 1440px) and
// the whole UK may not fit. Wider bounds would fix this, but allow panning
// further from the UK when zoomed in.
const UK_BOUNDS: LngLatBoundsLike = [-8.7, 49.9, 1.8, 60.9]


export default function MapView() {
  return (
    <Map
      initialViewState={{ longitude: -3.5, latitude: 55, zoom: INITIAL_ZOOM }}
      maxBounds={UK_BOUNDS}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      minZoom={INITIAL_ZOOM}
      style={{ width: '100%', height: '100vh' }}
      mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
    >
      <Source id="uk-mask" type="geojson" data="/uk-mask.geojson">
        <Layer
          id="uk-mask-fill"
          type="fill"
          paint={{ 'fill-color': '#6b7280', 'fill-opacity': 0.6 }}
        />
      </Source>
      <NavigationControl position="top-right" showCompass={false} />
    </Map>
  );
}