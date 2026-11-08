import MapView from "@/components/MapView/MapView";
import { getRegionalTimeline } from '@/services/carbon';

export default async function Home() {
  const timeline = await getRegionalTimeline();

  return (
    <main className="flex-1">
      <MapView timeline={timeline} />
    </main>
  );
}
