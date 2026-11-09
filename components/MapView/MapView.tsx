'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

import type { Timeline } from '@/types/timeline';
import Legend from '@/components/LegendView/Legend';
import RegionMap from '@/components/RegionMapView/RegionMap';
import TimelinePlayback from '@/components/TimelinePlaybackView/TimelinePlayback';
import { COLOURS, OCEAN } from '@/styles/colours';
import { reveal } from '@/styles/reveal';
import { carbonFillColour, carbonStops } from '@/utils/carbonScale/carbonScale';
import type { HoveredRegion } from '@/types/map';

// The shortest time the loading screen shows for, in milliseconds.
const MIN_LOADING_MS = 1000;

/**
 * The page: the map, the loading screen, the legend, and the timeline
 * playback. The selected day lives in TimelinePlayback, so this only
 * re-renders while the map loads and when the hovered region changes, not on
 * every frame as the year plays.
 */
export default function MapView({ timeline }: { timeline: Timeline }) {
  const { values } = timeline;
  const [hovered, setHovered] = useState<HoveredRegion | null>(null);
  // The hatch layer can only be added once its pattern image exists.
  const [hatchReady, setHatchReady] = useState(false);
  // Feature state can only be set once the regions source has loaded.
  const [regionsReady, setRegionsReady] = useState(false);
  // Until the map has drawn everything once (fitted, coloured and hatched),
  // a loading screen covers it, so it doesn't appear in pieces.
  const [mapReady, setMapReady] = useState(false);
  // The loading screen also stays up for at least MIN_LOADING_MS, so a fast
  // load still feels deliberate rather than a flicker.
  const [minTimeDone, setMinTimeDone] = useState(false);
  const loaded = mapReady && minTimeDone;

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);
  const mapRef = useRef<MapRef>(null);

  // Handlers for RegionMap. useCallback keeps them the same function between
  // renders, so the memoised map isn't re-rendered when MapView is.
  const handleLoad = useCallback(() => setHatchReady(true), []);
  const handleRegionsLoaded = useCallback(() => setRegionsReady(true), []);
  // Mapbox goes idle when it has nothing left to load or draw. Once the
  // regions and hatching are in, the next idle means the finished map is on
  // screen. (Setting the regions' values triggers a redraw, then another idle.)
  const handleIdle = useCallback(() => {
    if (regionsReady && hatchReady) setMapReady(true);
  }, [regionsReady, hatchReady]);

  // One scale for the whole timeline, so a colour means the same value at every
  // point on the slider.
  const stops = useMemo(
    () => carbonStops(values.flat().filter((v): v is number => v !== null)),
    [values],
  );
  const fillColour = useMemo(() => carbonFillColour(stops, COLOURS.noData), [stops]);

  return (
    <div className="relative">
      <RegionMap
        mapRef={mapRef}
        fillColour={fillColour}
        hatchReady={hatchReady}
        onLoad={handleLoad}
        onRegionsLoaded={handleRegionsLoaded}
        onIdle={handleIdle}
        onHover={setHovered}
      />

      {/* The loading screen: the ocean's colour over the map, with a spinner.
          The date and value above it show straight away, and everything else
          fades in with the map. */}
      <div
        role="status"
        aria-label="Loading the map"
        className={`absolute inset-0 grid place-items-center transition-opacity duration-500 ${loaded ? 'pointer-events-none opacity-0' : ''}`}
        style={{ background: OCEAN }}
      >
        {!loaded && (
          <span className="h-16 w-16 animate-spin rounded-full border-[6px] border-white/15 border-t-[#ff71cf]" />
        )}
      </div>

      <TimelinePlayback
        timeline={timeline}
        mapRef={mapRef}
        regionsReady={regionsReady}
        loaded={loaded}
        hovered={hovered}
      />

      <div className={reveal(loaded)}>
        <Legend stops={stops} />
      </div>
    </div>
  );
}