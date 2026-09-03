/**
 * Fixed film grain across the viewport — what makes the site read as printed
 * rather than webby.
 *
 * Deliberately a plain <div> with a tiling background at flat opacity. The
 * previous SVG + mix-blend-mode version forced a full-viewport re-composite on
 * every scroll frame and was the single largest cause of scroll jank.
 */
export function Grain() {
  return <div className="grain" aria-hidden="true" />;
}

export default Grain;
