'use client';

import { memo, useMemo, type RefObject } from 'react';

import Map, {
  Layer,
  Source,
  type MapEvent,
  type MapMouseEvent,
  type MapRef,
  type MapSourceDataEvent,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FillLayerSpecification, LngLatBoundsLike, PaddingOptions } from 'mapbox-gl';

import { COLOURS, MASK_OPACITY } from '@/styles/colours';
import { OCEAN_SHARE, UK_PADDING_PX } from '@/styles/layout';
import {
  addHatchPattern,
  northernIrelandFill,
  northernIrelandHatch,
  northernIrelandOutline,
  regionOutline,
} from '@/styles/mapLayers';
import type { HoveredRegion } from '@/types/map';
import type { carbonFillColour } from '@/utils/carbonScale/carbonScale';

// Constants
const UK_BOUNDS: LngLatBoundsLike = [-8.7, 49.9, 1.8, 60.9];

// Large phones held upright (from this width up to 640px) leave more space
// under the UK. The UK fills a phone's width, so the map centres it in the
// height left over: it only rises by half of the extra space added here.
const LARGE_PHONE_MIN_WIDTH_PX = 360;
const LARGE_PHONE_BOTTOM_PX = 130;

// Props that never change, made once rather than on every render.
const INITIAL_VIEW = { bounds: UK_BOUNDS, fitBoundsOptions: { padding: UK_PADDING_PX } };
const MAP_STYLE = { width: '100%', height: '100vh' };
const INTERACTIVE_LAYERS = ['regions-fill'];
const MASK_PAINT = { 'fill-color': COLOURS.backdrop, 'fill-opacity': MASK_OPACITY };

// Space to leave around the UK. On landscape screens a wide left margin pushes
// the UK to the right, leaving ocean on the left. Portrait screens are too
// narrow for that, so the UK stays centred.
function ukPadding(width: number, height: number): PaddingOptions {
  const left = width > height ? Math.max(UK_PADDING_PX, width * OCEAN_SHARE) : UK_PADDING_PX;
  const largePhone = height > width && width >= LARGE_PHONE_MIN_WIDTH_PX && width < 640;
  const bottom = largePhone ? LARGE_PHONE_BOTTOM_PX : UK_PADDING_PX;
  return { top: UK_PADDING_PX, bottom, right: UK_PADDING_PX, left };
}

// The map can't be moved, so refit the UK whenever the screen size changes.
function fitUk(e: MapEvent) {
  const map = e.target;
  const { clientWidth, clientHeight } = map.getContainer();
  map.fitBounds(UK_BOUNDS, { padding: ukPadding(clientWidth, clientHeight), animate: false });
}

export type RegionMapProps = {
  mapRef: RefObject<MapRef | null>;
  /** The fill colour expression for the regions, from carbonFillColour. */
  fillColour: ReturnType<typeof carbonFillColour>;
  /** Whether the hatch pattern image exists yet, so its layer can be added. */
  hatchReady: boolean;
  /** Called once the map has loaded, after the hatch pattern is added and the UK fitted. */
  onLoad: () => void;
  /** Called once the regions source has loaded, so feature state can be set. */
  onRegionsLoaded: () => void;
  onIdle: () => void;
  onHover: (region: HoveredRegion | null) => void;
};

/**
 * The Mapbox map with its layers. Memoised: while the year plays, MapView
 * re-renders every frame, but none of these props change, so this doesn't.
 * Region colours change through feature state, which MapView sets directly
 * on the map, not through props.
 */
function RegionMap({ mapRef, fillColour, hatchReady, onLoad, onRegionsLoaded, onIdle, onHover }: RegionMapProps) {
  const regionFill = useMemo<FillLayerSpecification>(
    () => ({
      id: 'regions-fill',
      type: 'fill',
      source: 'regions',
      paint: { 'fill-color': fillColour, 'fill-opacity': 0.9 },
    }),
    [fillColour],
  );

  function handleLoad(e: MapEvent) {
    addHatchPattern(e.target);
    fitUk(e);
    onLoad();
  }

  function handleSourceData(e: MapSourceDataEvent) {
    if (e.sourceId === 'regions' && e.isSourceLoaded) onRegionsLoaded();
  }

  function handleMouseMove(e: MapMouseEvent) {
    // Mapbox's feature type relies on @types/geojson, which mapbox-gl doesn't
    // install for us, so describe the properties regions.geojson actually has.
    const feature = e.features?.[0] as { properties?: { region_id?: unknown; name?: unknown } } | undefined;
    const props = feature?.properties;
    const id = props?.region_id;
    onHover(typeof id === 'number' ? { id, name: String(props?.name), x: e.point.x, y: e.point.y } : null);
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      style={MAP_STYLE}
      mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
      onLoad={handleLoad}
      onResize={fitUk}
      onSourceData={handleSourceData}
      onIdle={onIdle}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
      // Fixed view: turn off every way of panning, zooming or rotating.
      scrollZoom={false}
      dragPan={false}
      dragRotate={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
      touchPitch={false}
      boxZoom={false}
      keyboard={false}
      cursor="default"
      projection="mercator"
    >
      {/* Each Source has a key matching its id. react-map-gl can't change a
          source's id, so without keys, adding or reordering sources during a
          hot reload makes React reuse the wrong one ("source id changed"). */}
      <Source key="uk-mask" id="uk-mask" type="geojson" data="/uk-mask.geojson">
        <Layer id="uk-mask-fill" type="fill" paint={MASK_PAINT} />
      </Source>
      <Source key="northern-ireland" id="northern-ireland" type="geojson" data="/northern-ireland.geojson">
        <Layer {...northernIrelandFill} />
        {/* beforeId keeps the stripes under the pink outline, as this layer is added later. */}
        {hatchReady && <Layer {...northernIrelandHatch} beforeId={northernIrelandOutline.id} />}
        <Layer {...northernIrelandOutline} />
      </Source>
      <Source key="regions" id="regions" type="geojson" data="/regions.geojson" promoteId="region_id">
        <Layer {...regionFill} />
        <Layer {...regionOutline} />
      </Source>
    </Map>
  );
}

export default memo(RegionMap);
