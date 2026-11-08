import type { Period } from '@/services/carbon';

// Times are shown in UK time. A fixed time zone also means the server and the
// browser format them the same way, so hydration doesn't mismatch.
const dayAndTime = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
});
const timeOnly = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
});

function periodLabel(period: Period) {
  return `${dayAndTime.format(new Date(period.from))}–${timeOnly.format(new Date(period.to))}`;
}

export type TimeControlsProps = {
  periods: Period[];
  index: number;
  nowIndex: number;
  playing: boolean;
  onIndexChange: (index: number) => void;
  onTogglePlay: () => void;
};

/** Time label, play/pause, slider and a "Now" button for choosing a half-hour. */
export default function TimeControls({
  periods,
  index,
  nowIndex,
  playing,
  onIndexChange,
  onTogglePlay,
}: TimeControlsProps) {
  const label = periodLabel(periods[index]);
  const when = index === nowIndex ? 'Now' : index < nowIndex ? 'Past' : 'Forecast';
  const nowPercent = (nowIndex / (periods.length - 1)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium tabular-nums">{label}</p>
        <p className="text-white/70">{when}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Play through the day'}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={periods.length - 1}
            value={index}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            aria-label="Half-hour period"
            aria-valuetext={`${label} (${when.toLowerCase()})`}
            className="w-full accent-[#ff71cf]"
          />
          {/* A small tick under the slider marks the current half-hour. */}
          <span
            aria-hidden
            className="absolute -bottom-1 h-1.5 w-px bg-white/70"
            style={{ left: `${nowPercent}%` }}
          />
        </div>
      </div>
      <div className="mt-1 flex justify-between text-white/70">
        <span>−24h</span>
        <button type="button" onClick={() => onIndexChange(nowIndex)} className="underline-offset-2 hover:underline">
          Now
        </button>
        <span>+24h</span>
      </div>
    </div>
  );
}
