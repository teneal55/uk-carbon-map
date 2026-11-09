import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { SLIDER_THUMB_PX as THUMB_PX } from '@/styles/layout';
import type { TimelinePeriod } from '@/types/timeline';
import { monthLabels, ordinalDate } from '@/utils/dates/dates';

// Letters vary in width, so the few longest dates by length are all measured.
const WIDEST_DATE_CANDIDATES = 8;
const MOBILE_MONTHS = 4; // month names shown on screens narrower than 1024px

export type TimeControlsProps = {
  periods: TimelinePeriod[];
  /** Day index; fractional while playing, so the handle glides between days. */
  position: number;
  playing: boolean;
  onPositionChange: (position: number) => void;
  onTogglePlay: () => void;
  /** The 7-day average carbon intensity at `position`, shown large under the date. */
  value: number | null;
  /** Shown between the date and the slider, e.g. the chart the slider is the x-axis of. */
  children?: ReactNode;
};

/** The selected date, play/pause and a slider for choosing a day. MapView positions it. */
export default function TimeControls({
  periods,
  position,
  playing,
  onPositionChange,
  onTogglePlay,
  value,
  children,
}: TimeControlsProps) {
  const lastDay = periods.length - 1;
  // The date shown is the nearest whole day.
  const day = Math.min(Math.max(Math.round(position), 0), lastDay);
  const label = ordinalDate(new Date(periods[day].from));
  // Stopped on the last day: the play button becomes a replay button.
  const atEnd = !playing && position >= lastDay;
  const months = useMemo(() => monthLabels(periods), [periods]);
  // The longest dates on the timeline. They're laid invisibly under the
  // current date to reserve the widest one's room, so the heading (and the
  // play button aligned to its right edge) doesn't move as the date changes.
  const widestDates = useMemo(() => {
    const dates = [...new Set(periods.map((p) => ordinalDate(new Date(p.from))))];
    return dates.sort((a, b) => b.length - a.length).slice(0, WIDEST_DATE_CANDIDATES);
  }, [periods]);
  // Phones and tablets only have room for about 4 month names, so they show
  // every `mobileStep`th one: every third for a year of 12 or 13 months.
  const mobileStep = Math.max(1, Math.ceil(months.length / MOBILE_MONTHS));
  // Where the pink fill ends: the centre of the handle, which travels the
  // track's width less its own.
  const share = lastDay > 0 ? position / lastDay : 0;
  const progress = {
    '--progress': `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${share})`,
  } as CSSProperties;

  return (
    // A column filling its container's height: the slider and months keep their
    // size at the bottom, and `children` (the chart) takes the space between.
    <div className="flex h-full flex-col text-xs text-white">
      {/* The heading, as wide as its widest line, so the play button can sit
          at the right of the number line, level with the end of the date. The
          date is right-aligned in room for the longest date, so the right edge
          stays put and the space before a shorter date grows instead. */}
      <div className="w-fit">
        <p className="flex justify-between gap-[0.3em] text-xl font-semibold leading-tight tracking-tight max-sm:text-base">
          <span className="text-white/70">Carbon intensity on</span>
          <span className="grid justify-items-end">
            {widestDates.map((d) => (
              <span key={d} aria-hidden className="invisible col-start-1 row-start-1">
                {d}
              </span>
            ))}
            <span className="col-start-1 row-start-1">{label}</span>
          </span>
        </p>
        {/* The big number, with the play button beside it. */}
        <div className="mt-1 flex items-center justify-between gap-8 max-sm:gap-6">
          <p className="flex items-baseline gap-2">
            <span className="text-6xl font-semibold leading-none tracking-tight tabular-nums max-sm:text-4xl">
              {value !== null ? Math.round(value) : '–'}
            </span>
            <span className="text-sm text-white/70 max-sm:text-xs">gCO₂/kWh · 7-day average</span>
          </p>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause' : atEnd ? 'Replay the year' : 'Play through the year'}
            // Same see-through purple as the legend panel. Smaller on phones,
            // like the number.
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#180048]/60 text-xl hover:bg-[#180048]/85 max-sm:h-10 max-sm:w-10 max-sm:rounded-lg max-sm:text-base"
          >
            {/* The ↻ character draws smaller and lower than ▶ and ❚❚, so it's set
                larger and nudged up to sit in the middle of the button. */}
            {playing ? (
              '❚❚'
            ) : atEnd ? (
              <span className="-translate-y-0.5 text-3xl leading-none max-sm:text-2xl">↻</span>
            ) : (
              '▶'
            )}
          </button>
        </div>
      </div>
      {children && <div className="mt-6 flex min-h-0 flex-1 flex-col">{children}</div>}
      {/* On landscape screens the chart's pink line is the slider, so this row
          is just the months. Portrait screens hide the chart, so they keep a
          plain slider above the months. */}
      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={lastDay}
          // Whole days when dragging; any value while playing, as the browser
          // would otherwise round the handle to the nearest day.
          step={playing ? 'any' : 1}
          value={position}
          onChange={(e) => onPositionChange(Number(e.target.value))}
          aria-label="Day"
          aria-valuetext={label}
          style={progress}
          className="day-slider w-full landscape:hidden"
        />
        {/* Month names under the plot (or slider). The inner box matches how
            far the handle's centre travels; IntensityChart uses the same
            insets, so the months line up with the days. */}
        <div aria-hidden className="relative mt-1 h-4 text-white/70 landscape:mt-0">
          <div className="absolute inset-y-0" style={{ left: THUMB_PX / 2, right: THUMB_PX / 2 }}>
            {months.map((m, i) => (
              <span
                key={`${m.label}-${m.position}`}
                className={`absolute -translate-x-1/2 ${i % mobileStep === 0 ? '' : 'max-lg:hidden'}`}
                style={{ left: `${m.position * 100}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
