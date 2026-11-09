export const COLOURS = {
  backdrop: '#180048',
  border: '#ff71cf',
  noData: '#34246e',
} as const;

// Carbon intensity scale (gCO2/kWh): from the map's original region purple at
// zero to a saturated hot "danger" pink for the most carbon-heavy regions. Each
// step is a little lighter and more saturated. The top pink is slightly deeper
// and redder than the border pink, so region borders stay visible even between
// two carbon-heavy regions.
//
// `at` is where each colour sits, from 0 (zero carbon) to 1 (the highest value
// in the data). The purples cover most of the range and the pinks are kept for
// the top end, so pink means genuinely high carbon.
// utils/carbonScale.ts turns these into values.
export const CARBON_SCALE = [
  { colour: '#5b3fb4', at: 0 },
  { colour: '#7760d4', at: 0.18 },
  { colour: '#9b57d6', at: 0.38 },
  { colour: '#be4bcb', at: 0.6 },
  { colour: '#df3db4', at: 0.8 },
  { colour: '#fe2992', at: 1 },
] as const;

/** The carbon scale as a CSS gradient, for the legend. */
export const CARBON_GRADIENT_CSS = `linear-gradient(to right, ${CARBON_SCALE.map(
  ({ colour, at }) => `${colour} ${at * 100}%`,
).join(', ')})`;

// Faint pink diagonal stripes over Northern Ireland, so it's obvious there's no
// data there without drawing attention to it. Its outline uses the same opacity.
export const HATCH = {
  colour: COLOURS.border,
  opacity: 0.25,
  size: 10, // pattern tile size in image pixels
  lineWidth: 3, // stripe width in image pixels
  pixelRatio: 2, // image pixels per screen pixel, so the tile is 5px on screen
} as const;

/** Splits a "#rrggbb" colour into [red, green, blue], each 0–255. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// The same stripes in CSS, for the legend sample. CSS measures across the
// stripes rather than along the tile edge, hence the division by √2.
const stripeGap = HATCH.size / HATCH.pixelRatio / Math.SQRT2;
const stripeWidth = HATCH.lineWidth / HATCH.pixelRatio / Math.SQRT2;
export const HATCH_CSS = `repeating-linear-gradient(-45deg, rgba(${hexToRgb(HATCH.colour).join(', ')}, ${HATCH.opacity}) 0 ${stripeWidth.toFixed(2)}px, transparent ${stripeWidth.toFixed(2)}px ${stripeGap.toFixed(2)}px), ${COLOURS.noData}`;
