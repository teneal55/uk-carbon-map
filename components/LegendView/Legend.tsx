import { CARBON_GRADIENT_CSS, COLOURS, HATCH_CSS } from '@/styles/colours';
import { NEGLIGIBLE_BELOW, type CarbonStop } from '@/utils/carbonScale';
import TimeControls, { type TimeControlsProps } from '@/components/TimeControlsView/TimeControls';

type LegendProps = TimeControlsProps & {
  /** The carbon scale the map is using, from carbonStops. */
  stops: CarbonStop[];
};

/** The panel over the ocean: time controls (when there's a timeline) and the colour key. */
export default function Legend({ stops, ...timeProps }: LegendProps) {
  const { periods, index } = timeProps;

  return (
    <div className="absolute bottom-6 left-6 w-72 space-y-3 rounded-lg bg-[#180048]/85 p-3 text-xs text-white ring-1 ring-white/15">
      {periods.length > 1 && periods[index] && <TimeControls {...timeProps} />}
      <div>
        <p className="font-medium">Carbon intensity</p>
        <p className="text-white/70">Grams of CO₂ per kWh, across the last and next 24 hours</p>
        <div className="mt-2 h-2.5 rounded-sm" style={{ background: CARBON_GRADIENT_CSS }} />
        <div className="mt-1 flex justify-between text-white/70 tabular-nums">
          {stops.map((s) => (
            <span key={s.value}>{s.value}</span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-white/70">
          <span className="h-3 w-6 shrink-0 rounded-sm" style={{ background: COLOURS.negligible }} />
          Negligible (below {NEGLIGIBLE_BELOW})
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-white/70">
          <span className="h-3 w-6 shrink-0 rounded-sm" style={{ background: HATCH_CSS }} />
          No data (Northern Ireland, separate grid)
        </div>
      </div>
    </div>
  );
}
