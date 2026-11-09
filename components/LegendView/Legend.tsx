import { CARBON_GRADIENT_CSS, HATCH_CSS } from '@/styles/colours';
import { carbonTicks, type CarbonStop } from '@/utils/carbonScale/carbonScale';

type LegendProps = {
  /** The carbon scale the map is using, from carbonStops. */
  stops: CarbonStop[];
};

/**
 * The colour key, in the top right. On portrait screens the time panel spans
 * the top, so the key moves to the bottom right.
 */
export default function Legend({ stops }: LegendProps) {
  return (
    <div className="absolute right-6 bottom-6 w-72 landscape:top-6 landscape:bottom-auto rounded-lg bg-[#180048]/60 p-3 text-xs text-white ring-1 ring-white/15">
      <div>
        <p className="font-medium">Carbon intensity</p>
        <p className="text-white/70">Daily average grams of CO₂ per kWh, over the last year</p>
        <div className="mt-2 h-2.5 rounded-sm" style={{ background: CARBON_GRADIENT_CSS }} />
        <div className="mt-1 flex justify-between text-white/70 tabular-nums">
          {carbonTicks(stops).map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-white/70">
          <span className="h-3 w-6 shrink-0 rounded-sm" style={{ background: HATCH_CSS }} />
          No data (Northern Ireland, separate grid)
        </div>
      </div>
    </div>
  );
}
