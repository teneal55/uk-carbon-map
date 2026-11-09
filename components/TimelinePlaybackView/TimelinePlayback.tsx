'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

import type { Timeline } from '@/types/timeline';
import type { HoveredRegion } from '@/types/map';
import TimeControls from '@/components/TimeControlsView/TimeControls';
import IntensityChart from '@/components/IntensityChartView/IntensityChart';
import { UK_PADDING_PX } from '@/styles/layout';
import { INTENSITY_STATE } from '@/utils/carbonScale/carbonScale';
import { valuesAt } from '@/utils/valuesAt/valuesAt';
import { SMOOTHING_DAYS, dailyAverage, rollingAverage, seriesAt } from '@/utils/chart/chart';

// Time per day when playing: a year plays through in about 45 seconds.
const PLAY_STEP_MS = 120;

export type TimelinePlaybackProps = {
  timeline: Timeline;
  /** The map, whose regions are coloured directly through feature state. */
  mapRef: RefObject<MapRef | null>;
  /** Whether the regions source has loaded, so feature state can be set. */
  regionsReady: boolean;
  /** Whether the loading screen has gone; until then only the date and value show. */
  loaded: boolean;
  /** The region under the mouse, for the tooltip and the chart's white line. */
  hovered: HoveredRegion | null;
};

/**
 * Everything that changes as the year plays: the selected day, playback, the
 * date and value heading, the chart, the hover tooltip's value, and the
 * regions' colours on the map.
 *
 * The position lives here rather than in MapView, so while playing only this
 * re-renders each frame. MapView, the map and the legend don't.
 */
export default function TimelinePlayback({ timeline, mapRef, regionsReady, loaded, hovered }: TimelinePlaybackProps) {
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

  // The nearest whole day, for the date label and tooltip.
  const day = Math.min(Math.round(position), lastDay);

  function moveTo(next: number) {
    positionRef.current = next;
    setPosition(next);
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
  // The 7-day average across regions, as the chart's pink line, for the heading.
  const averageSeries = useMemo(() => rollingAverage(dailyAverage(values), SMOOTHING_DAYS), [values]);

  // Give each region its value as feature state, which the fill colour reads.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regionsReady) return;
    regionIds.forEach((id, i) => {
      map.setFeatureState({ source: 'regions', id }, { [INTENSITY_STATE]: blended[i] ?? null });
    });
  }, [blended, regionIds, regionsReady, mapRef]);

  const hoveredIndex = hovered ? regionIds.indexOf(hovered.id) : -1;
  const hoveredValue = hoveredIndex >= 0 ? values[day]?.[hoveredIndex] : undefined;
  // The region hovered on the map, picked out in the chart.
  const highlightedRegion = hovered && hoveredIndex >= 0 ? { index: hoveredIndex, name: hovered.name } : null;

  // Picking a day, on the chart or the portrait slider, pauses playback and
  // snaps to a whole day.
  function pickDay(p: number) {
    setPlaying(false);
    moveTo(Math.round(p));
  }

  return (
    <>
      {periods.length > 1 && (
        // The time controls and chart share a column over the ocean, so the
        // slider is the chart's x-axis. On landscape screens it reaches 50% of
        // the way across (the UK is fitted to the right, and below the top
        // band its west coast starts at about 53% on laptop-sized screens),
        // and stretches down to the UK's southern tip, the chart taking up
        // whatever height is left.
        <div
          style={{ '--uk-padding': `${UK_PADDING_PX}px` } as CSSProperties}
          className="absolute top-6 right-6 left-6 landscape:right-auto landscape:bottom-(--uk-padding) landscape:w-[calc(50vw-3rem)]"
        >
          <TimeControls
            periods={periods}
            position={position}
            playing={playing}
            value={seriesAt(averageSeries, position)}
            loading={!loaded}
            onPositionChange={pickDay}
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
          >
            {/* The chart sits between the date and the slider. Portrait screens
                have no ocean beside the UK to put it in. */}
            <div className="hidden min-h-0 flex-1 landscape:flex">
              <IntensityChart
                periods={periods}
                values={values}
                position={position}
                highlight={highlightedRegion}
                onPositionChange={pickDay}
              />
            </div>
          </TimeControls>
        </div>
      )}

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-[#180048]/95 px-3 py-2 text-sm text-white shadow-lg ring-1 ring-white/15"
          style={{ left: hovered.x + 14, top: hovered.y + 14 }}
        >
          <p className="font-medium">{hovered.name}</p>
          {hoveredValue != null ? (
            <p className="text-white/80">{hoveredValue} gCO₂/kWh · daily average</p>
          ) : (
            <p className="text-white/80">No data</p>
          )}
        </div>
      )}
    </>
  );
}
