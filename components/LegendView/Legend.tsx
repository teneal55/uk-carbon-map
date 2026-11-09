import { memo } from 'react';
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
function Legend({ stops }: LegendProps) {
  return (
    <div className="absolute right-6 bottom-6 w-72 landscape:top-6 landscape:bottom-auto rounded-lg bg-[#180048]/60 p-3 text-xs text-white ring-1 ring-white/15 max-sm:px-3 max-sm:py-2 max-sm:text-[10px] max-sm:leading-tight">
      <div>
        <p className="font-medium max-sm:text-[11px]">Carbon intensity</p>
        <p className="text-white/70">
          {/* Shorter on phones, so it fits on one line in the smaller text. */}
          <span className="max-sm:hidden">Daily average grams of CO₂ per kWh, over the last year</span>
          <span className="sm:hidden">Daily average gCO₂/kWh over the last year</span>
        </p>
        <div className="mt-2 h-2.5 rounded-sm max-sm:h-2" style={{ background: CARBON_GRADIENT_CSS }} />
        <div className="mt-1 flex justify-between text-white/70 tabular-nums">
          {carbonTicks(stops).map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-white/70 max-sm:mt-1">
          <span className="h-3 w-6 shrink-0 rounded-sm max-sm:h-2.5 max-sm:w-5" style={{ background: HATCH_CSS }} />
          No data (Northern Ireland, separate grid)
        </div>
      </div>
    </div>
  );
}

// Memoised: its stops never change, so it isn't re-rendered on every frame of playback.
export default memo(Legend);
