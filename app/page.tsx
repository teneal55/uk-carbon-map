import MapView from "@/components/MapView/MapView";
import { getDailyTimeline } from '@/services/dailyIntensity';

export default function Home() {
  // A year of daily averages, from data/daily-intensity.json.
  const timeline = getDailyTimeline();

  return (
    <main className="flex-1">
      <MapView timeline={timeline} />
    </main>
  );
}
