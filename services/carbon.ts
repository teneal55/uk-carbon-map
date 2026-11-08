import { cacheLife } from 'next/cache';

export type IntensityIndex = 'very low' | 'low' | 'moderate' | 'high' | 'very high';

export interface Region {
  regionid: number;
  shortname: string;
  intensity: { forecast: number; index: IntensityIndex };
  generationmix: { fuel: string; perc: number }[];
}


export async function getRegionalIntensity(): Promise<Region[]> {
  const res = await fetch('https://api.carbonintensity.org.uk/regional', {
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`Carbon Intensity API: ${res.status}`);
  const json = await res.json();
  console.log('repsonse: ', json)
  // IDs 15–18 are England/Scotland/Wales/GB totals, not map regions
  return json.data[0].regions.filter((r: Region) => r.regionid <= 14);
}

const API_URL = 'https://api.carbonintensity.org.uk';
const LAST_MAP_REGION_ID = 14; // 15–18 are England/Scotland/Wales/GB totals

/** Just what the map needs per region, to keep the data sent to the browser small. */
export type RegionIntensity = Pick<Region, 'regionid' | 'intensity'>;

/** One half-hour period. `from` and `to` are UTC, e.g. "2026-11-08T11:00Z". */
export interface Period {
  from: string;
  to: string;
  regions: RegionIntensity[];
}

export interface RegionalTimeline {
  periods: Period[];
  /** Index of the period that was current when the data was fetched. */
  nowIndex: number;
}

async function fetchPeriods(path: string): Promise<Period[]> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`Carbon Intensity API ${path}: ${res.status}`);
  const json: { data: { from: string; to: string; regions: Region[] }[] } = await res.json();
  return json.data.map((p) => ({
    from: p.from,
    to: p.to,
    regions: p.regions
      .filter((r) => r.regionid <= LAST_MAP_REGION_ID)
      .map((r) => ({ regionid: r.regionid, intensity: r.intensity })),
  }));
}

/**
 * Regional forecasts for every half-hour from 24 hours ago to 24 hours ahead.
 * Cached for everyone and refreshed every 30 minutes, so "now" can lag by up to
 * that long.
 */
export async function getRegionalTimeline(): Promise<RegionalTimeline> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });

  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 16)}Z`; // the API wants YYYY-MM-DDTHH:mmZ
  const [past, next] = await Promise.all([
    fetchPeriods(`/regional/intensity/${stamp}/pt24h`),
    fetchPeriods(`/regional/intensity/${stamp}/fw24h`),
  ]);

  // The two ranges meet at the current half-hour; drop any period that appears twice.
  const byStart = new Map([...past, ...next].map((p) => [p.from, p]));
  const periods = [...byStart.values()].sort((a, b) => a.from.localeCompare(b.from));

  const current = periods.findIndex((p) => new Date(p.from) <= now && now < new Date(p.to));
  const nowIndex = current >= 0 ? current : Math.min(past.length, periods.length - 1);
  return { periods, nowIndex: Math.max(0, nowIndex) };
}