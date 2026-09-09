import { volumeDateRange, volumeLabel, type VolumeDTO } from "@/lib/rotation";
import { formatDateMono } from "@/lib/utils";

/**
 * THE ROTATION PAGE MASTHEAD — Revision 17 §3.1.
 *
 * Replaces the poster masthead of Revision 14 §4: the tan strip, the oversized
 * serif headline and the bled photo panel all go, along with the `priority`
 * image that sat in the corner. Reference E is cream throughout and underlines
 * its title, and that underline is what anchors it.
 *
 * ROTATION here and in the homepage poster are the same face at the same role
 * — that is the whole point of giving the section its own voice (§2.1). It
 * appears in exactly these two places.
 *
 * On --sand this is --ink, not the --sand the poster uses; `.rotation-word`
 * deliberately sets no colour so the two grounds can each choose.
 */
export function RotationMasthead({ volume, trackCount }: { volume: VolumeDTO; trackCount: number }) {
  const range = volumeDateRange(volume.publishedAt, formatDateMono);

  return (
    <header className="mx-auto max-w-[1600px] px-(--gutter) pt-16 md:pt-24">
      <h1 className="rotation-word border-b border-rule pb-4 text-fg">Rotation</h1>
      <p className="mono mt-5 text-fg-dim">
        {volumeLabel(volume.number)}
        {range ? ` · ${range}` : ""}
        {` · ${trackCount} ${trackCount === 1 ? "track" : "tracks"}`}
      </p>
    </header>
  );
}

export default RotationMasthead;
