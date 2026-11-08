'use client';

import { useEffect, useMemo, useState } from 'react';

import Map, { Layer, Source, type MapEvent, type MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FillLayerSpecification, LngLatBoundsLike, PaddingOptions } from 'mapbox-gl';

import type { Timeline } from '@/types/timeline';
import Legend from '@/components/LegendView/Legend';
import { COLOURS } from '@/styles/colours';
import {
  addHatchPattern,
  northernIrelandFill,
  northernIrelandHatch,
  northernIrelandOutline,
  regionOutline,
} from '@/styles/mapLayers';
import { carbonFillColour } from '@/utils/carbonFillColour';
import { carbonStops } from '@/utils/carbonScale';
import type { HoveredRegion } from '@/types/map';

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

// Time per day when playing: a year plays through in about 45 seconds.
const PLAY_STEP_MS = 120;

export default function MapView({ timeline }: { timeline: Timeline }) {
  const { periods, regionIds, values } = timeline;
  // Start at the first day, a year ago.
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState<HoveredRegion | null>(null);
  // The hatch layer can only be added once its pattern image exists.
  const [hatchReady, setHatchReady] = useState(false);

  function handleLoad(e: MapEvent) {
    addHatchPattern(e.target);
    setHatchReady(true);
    fitUk(e);
  }

  // While playing, step forward one day at a time. After the last day, stop and
  // go back to the start rather than looping.
  useEffect(() => {
    if (!playing || periods.length < 2) return;
    const timer = setTimeout(() => {
      if (index >= periods.length - 1) {
        setPlaying(false);
        setIndex(0);
      } else {
        setIndex(index + 1);
      }
    }, PLAY_STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, index, periods.length]);

  const row = useMemo(() => values[index] ?? [], [values, index]);
  // One scale for the whole timeline, so a colour means the same value at every
  // point on the slider.
  const stops = useMemo(
    () => carbonStops(values.flat().filter((v): v is number => v !== null)),
    [values],
  );
  const fillColour = useMemo(
    () => carbonFillColour(regionIds, row, stops, COLOURS.noData),
    [regionIds, row, stops],
  );

  const regionFill: FillLayerSpecification = {
    id: 'regions-fill',
    type: 'fill',
    source: 'regions',
    paint: {
      'fill-color': fillColour,
      'fill-opacity': 0.9,
    },
  };

  function handleMouseMove(e: MapMouseEvent) {
    // Mapbox's feature type relies on @types/geojson, which mapbox-gl doesn't
    // install for us, so describe the properties regions.geojson actually has.
    const feature = e.features?.[0] as { properties?: { region_id?: unknown; name?: unknown } } | undefined;
    const props = feature?.properties;
    const id = props?.region_id;
    setHovered(
      typeof id === 'number' ? { id, name: String(props?.name), x: e.point.x, y: e.point.y } : null,
    );
  }

  const hoveredValue = hovered ? row[regionIds.indexOf(hovered.id)] : undefined;

  return (
    <div className="relative">
      <Map
        initialViewState={{ bounds: UK_BOUNDS, fitBoundsOptions: { padding: UK_PADDING_PX } }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: '100%', height: '100vh' }}
        mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
        onLoad={handleLoad}
        onResize={fitUk}
        interactiveLayerIds={['regions-fill']}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
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
        {/* Each Source has a key matching its id. react-map-gl can't change a
            source's id, so without keys, adding or reordering sources during a
            hot reload makes React reuse the wrong one ("source id changed"). */}
        <Source key="uk-mask" id="uk-mask" type="geojson" data="/uk-mask.geojson">
          <Layer
            id="uk-mask-fill"
            type="fill"
            paint={{ 'fill-color': COLOURS.backdrop, 'fill-opacity': 0.85 }}
          />
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

      <Legend
        stops={stops}
        periods={periods}
        index={index}
        playing={playing}
        onIndexChange={(i) => {
          setPlaying(false);
          setIndex(i);
        }}
        onTogglePlay={() => setPlaying((p) => !p)}
      />

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-[#180048]/95 px-3 py-2 text-sm text-white shadow-lg ring-1 ring-white/15"
          style={{ left: hovered.x + 14, top: hovered.y + 14 }}
        >
          <p className="font-medium">{hovered.name}</p>
          {hoveredValue != null ? (
            <p className="text-white/80">
              {hoveredValue} gCO₂/kWh · daily average
            </p>
          ) : (
            <p className="text-white/80">No data</p>
          )}
        </div>
      )}
    </div>
  );
}