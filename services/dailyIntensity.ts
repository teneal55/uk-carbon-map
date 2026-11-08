import daily from '@/data/daily-intensity.json';
import type { Timeline } from '@/types/timeline';

/**
 * Daily average carbon intensity per region for the year up to yesterday, from
 * data/daily-intensity.json. Regenerate that file with
 * scripts/prepare_daily_intensity.py; it's read at build time.
 */
export function getDailyTimeline(): Timeline {
  return {
    periods: daily.periods.map(({ from, to }) => ({ from, to })),
    regionIds: daily.regionIds,
    values: daily.values,
  };
}
