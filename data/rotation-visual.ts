/**
 * THE ROTATION FIGURE LIVES HERE — this is the file to edit when it changes.
 *
 * To swap the image:
 *
 *   1. Drop the new cut-out at public/rotation/figure.png (transparent PNG).
 *   2. Run `npm run build:rotation-figure`.
 *   3. Update `width` and `height` below to the file's true pixel dimensions.
 *
 * Nothing else in the codebase references the path. RotationPoster derives the
 * AVIF and WebP siblings from `src` by swapping the extension — those two files
 * are produced by the script in step 2 and are what actually get served; the
 * PNG is only the last-resort fallback.
 *
 * WHY THE SCRIPT IS NOT OPTIONAL. next.config.ts sets `loader: "custom"`, which
 * disables Next's /_next/image route completely — see lib/image-loader.ts,
 * which says so in its own header. A local file is therefore served byte for
 * byte as it sits on disk, with no format negotiation and no resizing. Skipping
 * step 2 ships a 780KB PNG to every visitor. The script refuses to write
 * anything over 400KB and re-checks the matte against the espresso ground.
 *
 * ON THE IMAGE ITSELF: if the figure is an identifiable real person, it must be
 * your own shoot or properly licensed WITH A RELEASE. This is a commercial
 * site, and a portrait is not stock the way a landscape is.
 */
export type RotationVisual = {
  /** The PNG you drop in. AVIF and WebP are derived from this path. */
  src: string;
  /** '' if the figure is decorative; a real description if it is a named person. */
  alt: string;
  /** The file's TRUE pixel dimensions — these hold CLS at zero. */
  width: number;
  height: number;
  /** Which side of the section the figure sits on. */
  align: "left" | "right";
};

export const rotationVisual: RotationVisual = {
  src: "/rotation/figure.png",
  /**
   * Empty, deliberately. The figure carries no information the surrounding
   * text does not already give — the volume, the dates, the three section
   * names and the button are all real text — so to a screen reader it is
   * decoration, and describing it would only add noise between the meta block
   * and the links. If this is ever replaced by a NAMED person whose identity
   * is part of the story, put their name here instead.
   */
  alt: "",
  width: 820,
  height: 1024,
  align: "right",
};

export default rotationVisual;
