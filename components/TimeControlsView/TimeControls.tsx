import { useMemo, type CSSProperties } from 'react';
import type { TimelinePeriod } from '@/types/timeline';
import { monthLabels, ordinalDate } from '@/utils/dates/dates';

const THUMB_PX = 16; // matches the handle size of .day-slider in app/globals.css

export type TimeControlsProps = {
  periods: TimelinePeriod[];
  /** Day index; fractional while playing, so the handle glides between days. */
  position: number;
  playing: boolean;
  onPositionChange: (position: number) => void;
  onTogglePlay: () => void;
};

/** The selected date, play/pause and a slider for choosing a day, across the top left. */
export default function TimeControls({
  periods,
  position,
  playing,
  onPositionChange,
  onTogglePlay,
}: TimeControlsProps) {
  const lastDay = periods.length - 1;
  // The date shown is the nearest whole day.
  const day = Math.min(Math.max(Math.round(position), 0), lastDay);
  const label = ordinalDate(new Date(periods[day].from));
  // Stopped on the last day: the play button becomes a replay button.
  const atEnd = !playing && position >= lastDay;
  const months = useMemo(() => monthLabels(periods), [periods]);
  // Where the pink fill ends: the centre of the handle, which travels the
  // track's width less its own.
  const share = lastDay > 0 ? position / lastDay : 0;
  const progress = {
    '--progress': `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${share})`,
  } as CSSProperties;

  return (
    // On landscape screens it reaches 60% of the way across. The UK is fitted to
    // the right, and its northern tip (Orkney and Shetland) starts at about
    // 61-72% across on laptop-sized screens, so this stays clear of land.
    <div className="absolute top-6 right-6 left-6 text-xs text-white landscape:right-auto landscape:w-[calc(60vw-3rem)]">
      <p className="text-3xl font-semibold leading-tight tracking-tight">
        {label}
      </p>
      <div className="mt-3 flex items-center gap-5">
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
          className="day-slider flex-1"
        />
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : atEnd ? 'Replay the year' : 'Play through the year'}
          // Same see-through purple as the legend panel.
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#180048]/60 text-base hover:bg-[#180048]/85"
        >
          {/* The ↻ character draws smaller and lower than ▶ and ❚❚, so it's set
              larger and nudged up to sit in the middle of the button. */}
          {playing ? '❚❚' : atEnd ? <span className="-translate-y-0.5 text-2xl leading-none">↻</span> : '▶'}
        </button>
      </div>
      {/* Month names under the slider. mr-15 skips the play button (40px) and
          its gap (20px); the inner box matches how far the handle's centre travels. */}
      <div aria-hidden className="relative mt-1 mr-15 h-4 text-white/70">
        <div className="absolute inset-y-0" style={{ left: THUMB_PX / 2, right: THUMB_PX / 2 }}>
          {months.map((m) => (
            <span
              key={`${m.label}-${m.position}`}
              className="absolute -translate-x-1/2"
              style={{ left: `${m.position * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
