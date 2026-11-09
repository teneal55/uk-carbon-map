/**
 * Each region's value at a point between two days, for smooth playback.
 * `position` is a day index that can be fractional: 41.25 is a quarter of the
 * way from day 41 to day 42, so each value is blended 75% / 25%.
 *
 * If one of the two days has no value for a region, that region uses the
 * other day's value; if neither has one, it stays null (no data).
 */
export function valuesAt(values: (number | null)[][], position: number): (number | null)[] {
  if (values.length === 0) return [];
  const clamped = Math.min(Math.max(position, 0), values.length - 1);
  const before = Math.floor(clamped);
  const after = Math.min(before + 1, values.length - 1);
  const t = clamped - before;
  if (t === 0 || before === after) return values[before];

  return values[before].map((a, i) => {
    const b = values[after][i];
    if (a === null) return b;
    if (b === null) return a;
    return a + (b - a) * t;
  });
}
