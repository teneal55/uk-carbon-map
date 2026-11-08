import type { TimelinePeriod } from '@/types/timeline';

// Dates are shown in UK time. A fixed time zone also means the server and the
// browser format them the same way, so hydration doesn't mismatch. A day's
// `from` is UK midnight, so it formats as that day.
const fullDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/London',
});
const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/London',
});

export type TimeControlsProps = {
  periods: TimelinePeriod[];
  index: number;
  playing: boolean;
  onIndexChange: (index: number) => void;
  onTogglePlay: () => void;
};

/** Date label, play/pause and slider for choosing a day. */
export default function TimeControls({
  periods,
  index,
  playing,
  onIndexChange,
  onTogglePlay,
}: TimeControlsProps) {
  const label = fullDate.format(new Date(periods[index].from));
  const first = periods[0];
  const last = periods[periods.length - 1];

  return (
    <div>
      <p className="text-sm font-medium tabular-nums">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Play through the year'}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={periods.length - 1}
          value={index}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          aria-label="Day"
          aria-valuetext={label}
          className="flex-1 accent-[#ff71cf]"
        />
      </div>
      <div className="mt-1 flex justify-between text-white/70">
        <span>{shortDate.format(new Date(first.from))}</span>
        <span>{shortDate.format(new Date(last.from))}</span>
      </div>
    </div>
  );
}
