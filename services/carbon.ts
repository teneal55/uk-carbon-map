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
  
  // IDs 15–18 are England/Scotland/Wales/GB totals, not map regions
  return json.data[0].regions.filter((r: Region) => r.regionid <= 14);
}
