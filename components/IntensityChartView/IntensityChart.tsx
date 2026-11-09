import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { COLOURS } from '@/styles/colours';
import { SLIDER_THUMB_PX } from '@/styles/layout';
import type { TimelinePeriod } from '@/types/timeline';
import {
  bandPath,
  dailyAverage,
  dailyRange,
  linePath,
  niceMax,
  regionSeries,
  rollingAverage,
  SMOOTHING_DAYS,
  seriesAt,
  spanAverages,
} from '@/utils/chart/chart';
import { ordinalDate, seasonSpans } from '@/utils/dates/dates';

const Y_STEP = 50; // the top of the chart is the highest value rounded up to this
const AVERAGE_COLOUR = COLOURS.border; // the map's pink
const BAND_COLOUR = 'rgb(255 255 255 / 0.12)';
const HIGHLIGHT_COLOUR = '#ffffff';
const HANDLE_PX = 10; // the pink handle at the end of the line
// Shorter stretches (a part season at the ends) are too narrow to label, and
// too short for a fair season average.
const MIN_SEASON_LABEL_DAYS = 30;
// Winter and summer are tinted so the seasons alternate behind the chart.
const SEASON_TINT: Record<string, string> = {
  Winter: 'rgb(255 255 255 / 0.05)',
  Summer: 'rgb(255 255 255 / 0.05)',
};

export type IntensityChartProps = {
  periods: TimelinePeriod[];
  /** values[day][region], as in the timeline. */
  values: (number | null)[][];
  /** Day index; fractional while playing. The chart is drawn up to here. */
  position: number;
  /** The region hovered on the map, whose line is drawn in white. */
  highlight: { index: number; name: string } | null;
  /** Called with a whole day when the line's handle is dragged, clicked or moved with the keys. */
  onPositionChange: (day: number) => void;
};

// Keys that move the handle, and by how many days.
const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowDown: -1,
  ArrowRight: 1,
  ArrowUp: 1,
  PageDown: -7,
  PageUp: 7,
};

/**
 * A chart of carbon intensity above the slider, sharing its x-axis. Daily
 * values swing a lot with the weather, so everything is a 7-day rolling
 * average: a pink line for the average of the regions, a shaded band from the
 * cleanest to the dirtiest region, and a white line for the region hovered on
 * the map. It's drawn up to the selected day, so it extends as the year
 * plays. The map itself still shows the true daily values.
 *
 * The chart is also the day slider: the pink line's end is the handle, so it
 * rides up and down with the average as it moves. Dragging or clicking
 * anywhere in the plot picks a day, and the handle takes the arrow keys.
 */
export default function IntensityChart({
  periods,
  values,
  position,
  highlight,
  onPositionChange,
}: IntensityChartProps) {
  const lastDay = Math.max(1, periods.length - 1);
  // An id for the clip path; useId's characters aren't all valid inside url(#...).
  const clipId = `chart-reveal-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Everything drawn only depends on the data, so it's built once. Playback
  // just widens the clip rectangle that reveals it.
  const smoothed = useMemo(() => {
    const regions = (values[0] ?? []).map((_, i) => rollingAverage(regionSeries(values, i), SMOOTHING_DAYS));
    const average = rollingAverage(dailyAverage(values), SMOOTHING_DAYS);
    const range = dailyRange(regions);
    return { regions, average, range };
  }, [values]);
  const yMax = useMemo(() => niceMax(smoothed.range.high, Y_STEP), [smoothed]);
  const paths = useMemo(
    () => ({
      band: bandPath(smoothed.range.low, smoothed.range.high, yMax),
      average: linePath(smoothed.average, yMax),
      regions: smoothed.regions.map((r) => linePath(r, yMax)),
    }),
    [smoothed, yMax],
  );

  const seasons = useMemo(() => seasonSpans(periods), [periods]);
  // Each season's average of the regions, from the true daily values rather
  // than the 7-day smoothing, so it's that season's real average.
  const seasonAverages = useMemo(() => spanAverages(dailyAverage(values), seasons), [values, seasons]);

  const highlightSeries = highlight ? smoothed.regions[highlight.index] : undefined;
  // Where the lines end right now, for the dots.
  const currentAverage = seriesAt(smoothed.average, position);
  const currentHighlight = highlightSeries ? seriesAt(highlightSeries, position) : null;

  // Percentages for placing HTML (dots, tooltip) over the stretched SVG.
  const xPercent = (day: number) => (day / lastDay) * 100;
  const yPercent = (value: number) => (1 - value / yMax) * 100;

  /** The nearest day to the pointer, across the plot's width. */
  function dayAt(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const share = Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1);
    return Math.round(share * lastDay);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    // Capturing keeps the drag going when the pointer leaves the plot.
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setHoverDay(null);
    onPositionChange(dayAt(e));
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const day = dayAt(e);
    if (dragging) {
      if (day !== Math.round(position)) onPositionChange(day);
      return;
    }
    // Only days already drawn can be inspected. Touch has no hover.
    setHoverDay(e.pointerType !== 'touch' && day <= position ? day : null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLSpanElement>) {
    const current = Math.round(position);
    let day: number;
    if (e.key === 'Home') day = 0;
    else if (e.key === 'End') day = lastDay;
    else if (e.key in KEY_STEPS) day = current + KEY_STEPS[e.key];
    else return;
    e.preventDefault();
    onPositionChange(Math.min(Math.max(day, 0), lastDay));
  }

  const hover =
    hoverDay === null
      ? null
      : {
          average: smoothed.average[hoverDay],
          low: smoothed.range.low[hoverDay],
          high: smoothed.range.high[hoverDay],
          highlight: highlightSeries?.[hoverDay] ?? null,
        };

  return (
    <div className="flex min-h-0 flex-1 flex-col text-xs text-white">
      {/* The key, on one line. The current value is in TimeControls' heading.
          The last item gives way if the line runs out of room. */}
      <div className="flex items-center gap-x-4 overflow-hidden whitespace-nowrap text-white/70">
        <KeyItem colour={AVERAGE_COLOUR} label="7-day avg" />
        <KeyItem colour={BAND_COLOUR} label="Range" band />
        <KeyItem colour={AVERAGE_COLOUR} label="Season avg" dashed />
        {highlight ? (
          <KeyItem
            colour={HIGHLIGHT_COLOUR}
            label={`${highlight.name} ${formatNumber(currentHighlight)}`}
            className="min-w-0"
          />
        ) : (
          <span className="min-w-0 truncate text-white/50">Hover a region</span>
        )}
      </div>

      {/* The plot. Inset like the slider, so day N sits under the handle at day N.
          Takes all the height left in the column, so the slider below ends level
          with the bottom of the UK. */}
      <div className="relative mt-4 min-h-0 flex-1">
        <div
          // touch-none stops a drag on a touch screen from scrolling the page,
          // and select-none stops a drag with the mouse selecting the labels.
          className={`absolute inset-y-0 touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
          style={{ left: SLIDER_THUMB_PX / 2, right: SLIDER_THUMB_PX / 2 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onPointerLeave={() => setHoverDay(null)}
        >
          {/* Season stripes behind everything, across the whole year, each named
              at its start. A stretch runs from half a day before its first day to
              half a day after its last, so neighbouring stretches meet between days. */}
          {seasons.map((s) => {
            const left = Math.max(0, xPercent(s.start - 0.5));
            const right = Math.min(100, xPercent(s.end + 0.5));
            return (
              <div
                key={`${s.season}-${s.start}`}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 overflow-hidden"
                style={{ left: `${left}%`, width: `${right - left}%`, background: SEASON_TINT[s.season] }}
              >
                {s.end - s.start + 1 >= MIN_SEASON_LABEL_DAYS && (
                  <span className="absolute top-1.5 left-2 text-[11px] tracking-wide text-white/45 uppercase">
                    {s.season}
                  </span>
                )}
              </div>
            );
          })}

          {/* x is the day index and y is gCO2/kWh, stretched to fit the box;
              non-scaling strokes keep the lines an even width anyway. */}
          <svg
            viewBox={`0 0 ${lastDay} ${yMax}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            role="img"
            aria-label="Chart of the 7-day average carbon intensity across the regions, with the range from the cleanest to the dirtiest region, up to the selected day"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={-yMax} width={Math.max(position, 0)} height={yMax * 3} />
              </clipPath>
            </defs>

            <g clipPath={`url(#${clipId})`} strokeLinejoin="round" strokeLinecap="round">
              <path d={paths.band} fill={BAND_COLOUR} />
              <path
                d={paths.average}
                fill="none"
                stroke={AVERAGE_COLOUR}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {highlight && paths.regions[highlight.index] && (
                <path
                  d={paths.regions[highlight.index]}
                  fill="none"
                  stroke={HIGHLIGHT_COLOUR}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          </svg>

          {/* Each season's average, as a dashed line across its stripe with the
              number above. It appears once the slider has played through the
              season, so the summary builds as the year plays. */}
          {seasons.map((s, i) => {
            const average = seasonAverages[i];
            const longEnough = s.end - s.start + 1 >= MIN_SEASON_LABEL_DAYS;
            if (average === null || !longEnough || position < s.end) return null;
            const left = Math.max(0, xPercent(s.start - 0.5));
            const right = Math.min(100, xPercent(s.end + 0.5));
            return (
              <div
                key={`average-${s.season}-${s.start}`}
                aria-hidden
                className="pointer-events-none absolute border-t-[1.5px] border-dashed"
                style={{
                  left: `${left}%`,
                  width: `${right - left}%`,
                  top: `${yPercent(average)}%`,
                  borderColor: AVERAGE_COLOUR,
                }}
              >
                {/* A dark backing keeps the number readable where the line crosses it. */}
                <span className="absolute bottom-full left-2 mb-1 rounded-sm bg-[#180048]/90 px-1 text-[11px] text-white/90 tabular-nums">
                  avg {Math.round(average)}
                </span>
              </div>
            );
          })}

          {/* A dot where the hovered region's line currently ends */}
          {currentHighlight !== null && (
            <Dot x={xPercent(position)} y={yPercent(currentHighlight)} colour={HIGHLIGHT_COLOUR} />
          )}

          {/* The day slider's handle, at the end of the pink line. With no data
              for the day it rests on the x-axis. Drawn last so it's on top. */}
          <span
            role="slider"
            tabIndex={0}
            aria-label="Day"
            aria-valuemin={0}
            aria-valuemax={lastDay}
            aria-valuenow={Math.round(position)}
            aria-valuetext={ordinalDate(new Date(periods[Math.min(Math.max(Math.round(position), 0), lastDay)].from))}
            onKeyDown={handleKeyDown}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:shadow-[0_0_0_4px_rgb(255_113_207/0.35)] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
              left: `${xPercent(position)}%`,
              top: `${yPercent(currentAverage ?? 0)}%`,
              width: HANDLE_PX,
              height: HANDLE_PX,
              background: AVERAGE_COLOUR,
            }}
          />

          {/* Hover: a crosshair and the values for that day. */}
          {hoverDay !== null && hover && (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-px bg-white/60"
                style={{ left: `${xPercent(hoverDay)}%` }}
              />
              <div
                className="pointer-events-none absolute top-2 z-10 rounded-md bg-[#180048]/95 px-3 py-2 whitespace-nowrap shadow-lg ring-1 ring-white/15"
                style={
                  // Keep the tooltip inside the chart: right of the crosshair on
                  // the left half, left of it on the right half.
                  hoverDay / lastDay < 0.5
                    ? { left: `calc(${xPercent(hoverDay)}% + 10px)` }
                    : { right: `calc(${100 - xPercent(hoverDay)}% + 10px)` }
                }
              >
                <p className="font-medium">7 days to {ordinalDate(new Date(periods[hoverDay].from))}</p>
                <TooltipRow colour={AVERAGE_COLOUR} label="Average" value={formatValue(hover.average)} />
                <TooltipRow
                  colour={BAND_COLOUR}
                  label="Range"
                  value={
                    hover.low !== null && hover.high !== null
                      ? `${Math.round(hover.low)}–${Math.round(hover.high)} gCO₂/kWh`
                      : 'No data'
                  }
                  band
                />
                {highlight && (
                  <TooltipRow colour={HIGHLIGHT_COLOUR} label={highlight.name} value={formatValue(hover.highlight)} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatValue(value: number | null | undefined) {
  return value != null ? `${Math.round(value)} gCO₂/kWh` : 'No data';
}

/** A whole number, or a dash with no data. */
function formatNumber(value: number | null | undefined) {
  return value != null ? String(Math.round(value)) : '–';
}

/** A key swatch: a short line, a small block for the band, or a dashed line. */
function Swatch({ colour, band = false, dashed = false }: { colour: string; band?: boolean; dashed?: boolean }) {
  if (dashed) {
    return <span className="w-4 shrink-0 border-t-[1.5px] border-dashed" style={{ borderColor: colour }} />;
  }
  return <span className={`${band ? 'h-2.5' : 'h-0.5'} w-4 shrink-0 rounded-full`} style={{ background: colour }} />;
}

function KeyItem({
  colour,
  label,
  band,
  dashed,
  className = 'shrink-0',
}: {
  colour: string;
  label: string;
  band?: boolean;
  dashed?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <Swatch colour={colour} band={band} dashed={dashed} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function Dot({ x, y, colour }: { x: number; y: number; colour: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        background: colour,
      }}
    />
  );
}

function TooltipRow({ colour, label, value, band }: { colour: string; label: string; value: string; band?: boolean }) {
  return (
    <p className="mt-0.5 flex items-center gap-1.5 text-white/80">
      <Swatch colour={colour} band={band} />
      {label}: <span className="text-white tabular-nums">{value}</span>
    </p>
  );
}
