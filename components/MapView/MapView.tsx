'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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

import type { Timeline } from '@/types/timeline';
import Legend from '@/components/LegendView/Legend';
import TimeControls from '@/components/TimeControlsView/TimeControls';
import { COLOURS } from '@/styles/colours';
import { OCEAN_SHARE } from '@/styles/layout';
import {
  addHatchPattern,
  northernIrelandFill,
  northernIrelandHatch,
  northernIrelandOutline,
  regionOutline,
} from '@/styles/mapLayers';
import { INTENSITY_STATE, carbonFillColour, carbonStops } from '@/utils/carbonScale/carbonScale';
import { valuesAt } from '@/utils/valuesAt/valuesAt';
import type { HoveredRegion } from '@/types/map';

// Constants
const UK_BOUNDS: LngLatBoundsLike = [-8.7, 49.9, 1.8, 60.9];
const UK_PADDING_PX = 60; // space between the UK and the screen edges

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
  const lastDay = Math.max(0, periods.length - 1);

  // Where we are on the timeline, as a day index. Whole numbers when paused or
  // dragging; fractional while playing, so colours and the slider glide between
  // days. Starts at the first day, a year ago.
  const [position, setPosition] = useState(0);
  // The animation loop reads and writes this directly, so it always has the
  // latest position without restarting every frame.
  const positionRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState<HoveredRegion | null>(null);
  // The hatch layer can only be added once its pattern image exists.
  const [hatchReady, setHatchReady] = useState(false);
  // Feature state can only be set once the regions source has loaded.
  const [regionsReady, setRegionsReady] = useState(false);
  const mapRef = useRef<MapRef>(null);

  // The nearest whole day, for the date label and tooltip.
  const day = Math.min(Math.round(position), lastDay);

  function moveTo(next: number) {
    positionRef.current = next;
    setPosition(next);
  }

  function handleLoad(e: MapEvent) {
    addHatchPattern(e.target);
    setHatchReady(true);
    fitUk(e);
  }

  function handleSourceData(e: MapSourceDataEvent) {
    if (e.sourceId === 'regions' && e.isSourceLoaded) setRegionsReady(true);
  }

  // While playing, move forward smoothly, PLAY_STEP_MS per day, once per
  // animation frame. Playback stops on the last day; the play button then
  // becomes a replay button.
  useEffect(() => {
    if (!playing || periods.length < 2) return;
    let frame = 0;
    let previous = performance.now();

    function tick(now: number) {
      const next = positionRef.current + (now - previous) / PLAY_STEP_MS;
      previous = now;
      if (next >= lastDay) {
        moveTo(lastDay);
        setPlaying(false);
        return;
      }
      moveTo(next);
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, periods.length, lastDay]);

  // Each region's value at the current position, blended between days.
  const blended = useMemo(() => valuesAt(values, position), [values, position]);

  // Give each region its value as feature state, which the fill colour reads.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regionsReady) return;
    regionIds.forEach((id, i) => {
      map.setFeatureState({ source: 'regions', id }, { [INTENSITY_STATE]: blended[i] ?? null });
    });
  }, [blended, regionIds, regionsReady]);

  // One scale for the whole timeline, so a colour means the same value at every
  // point on the slider.
  const stops = useMemo(
    () => carbonStops(values.flat().filter((v): v is number => v !== null)),
    [values],
  );
  const fillColour = useMemo(() => carbonFillColour(stops, COLOURS.noData), [stops]);

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

  const hoveredValue = hovered ? values[day]?.[regionIds.indexOf(hovered.id)] : undefined;

  return (
    <div className="relative">
      <Map
        ref={mapRef}
        initialViewState={{ bounds: UK_BOUNDS, fitBoundsOptions: { padding: UK_PADDING_PX } }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: '100%', height: '100vh' }}
        mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
        onLoad={handleLoad}
        onResize={fitUk}
        onSourceData={handleSourceData}
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

      {periods.length > 1 && (
        <TimeControls
          periods={periods}
          position={position}
          playing={playing}
          onPositionChange={(p) => {
            // Dragging pauses playback and snaps to a whole day.
            setPlaying(false);
            moveTo(Math.round(p));
          }}
          onTogglePlay={() => {
            if (playing) {
              // Pausing snaps to the nearest whole day.
              moveTo(Math.min(Math.round(positionRef.current), lastDay));
            } else if (positionRef.current >= lastDay) {
              // At the end, the button replays from the start.
              moveTo(0);
            }
            setPlaying(!playing);
          }}
        />
      )}

      <Legend stops={stops} />

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