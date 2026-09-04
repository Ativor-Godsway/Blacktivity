/**
 * THE HERO MARK.
 *
 * Geometry only — the animation lives in components/home/AdinkraMark.tsx and
 * never needs to change when this does. The client's final glyph is not to be
 * invented here; drop the real path data in and the component picks it up.
 *
 * All coordinates are in a 100x100 box. Paths are stroked, not filled, so the
 * draw-on animation has something to travel along.
 *
 * The placeholder below is a simple concentric construction — deliberately
 * generic, so nobody mistakes it for the real symbol.
 */
export type AdinkraLayer = {
  /** SVG path data, or a circle expressed as a path. */
  d: string;
  /** Stroke width in viewBox units. */
  width: number;
  /** Seconds for one full rotation. Negative turns anticlockwise. 0 = static. */
  spin?: number;
  /** Draw order — layers draw in sequence on load. */
  delay?: number;
};

export const ADINKRA_VIEWBOX = "0 0 100 100";

export const ADINKRA_LAYERS: AdinkraLayer[] = [
  // Outer ring.
  {
    d: "M50 6 A44 44 0 1 1 49.99 6",
    width: 1.5,
    spin: 96,
    delay: 0,
  },
  // Inner ring, turning the other way.
  {
    d: "M50 22 A28 28 0 1 1 49.99 22",
    width: 1.5,
    spin: -64,
    delay: 0.35,
  },
  // Four-fold cross, the recurring Adinkra armature.
  {
    d: "M50 12 L50 88 M12 50 L88 50",
    width: 1.5,
    spin: 0,
    delay: 0.7,
  },
  // Diagonal arms with hooked terminals.
  {
    d: "M27 27 L73 73 M73 27 L27 73",
    width: 1,
    spin: 0,
    delay: 0.95,
  },
  // Centre.
  {
    d: "M50 38 A12 12 0 1 1 49.99 38",
    width: 1.5,
    spin: 48,
    delay: 1.2,
  },
];
