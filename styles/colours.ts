export const COLOURS = {
  backdrop: '#180048',
  border: '#ff71cf',
  noData: '#34246e',
  // The map's original region purple, for negligible carbon (see
  // NEGLIGIBLE_BELOW in utils/carbonScale.ts).
  negligible: '#5b3fb4',
} as const;

// Carbon intensity scale (gCO2/kWh): from purple, one step above the negligible
// purple (so the two never look alike), to a saturated hot "danger" pink for the
// most carbon-heavy regions. Each step is a little lighter and more saturated.
// The top pink is slightly deeper and redder than the border pink, so region
// borders stay visible even between two carbon-heavy regions.
// utils/carbonScale.ts spreads the colours over the data's range.
export const CARBON_COLOURS = ['#7760d4', '#9b57d6', '#be4bcb', '#df3db4', '#fe2992'] as const;

/** The carbon scale as a CSS gradient, for the legend. */
export const CARBON_GRADIENT_CSS = `linear-gradient(to right, ${CARBON_COLOURS.map(
  (colour, i) => `${colour} ${(i / (CARBON_COLOURS.length - 1)) * 100}%`,
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
