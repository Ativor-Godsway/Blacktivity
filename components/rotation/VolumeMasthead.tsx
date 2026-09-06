import RevealImage from "@/components/ui/RevealImage";
import { volumeDateRange, volumeLabel, type VolumeDTO } from "@/lib/rotation";
import { formatDateMono } from "@/lib/utils";

/**
 * THE POSTER MASTHEAD — Revision 14 §4, adapted from Reference B.
 *
 * Its STRUCTURE is borrowed: tinted strip, oversized headline, photo panel
 * bled into the corner. Its TYPOGRAPHY is not. Reference B is set in a bold
 * condensed sans; this site is display serif and Inter Tight and stays that
 * way — copying the layout gives you a poster, copying the typeface gives you
 * a streaming-service graphic with the wrong logo on it.
 *
 * The strip is --tan carrying --ink, which with --espresso is one of only two
 * pairings that clear AA on that ground. .on-tan re-points the tokens so
 * nothing inside it can reach for --ink-2 (4.37) or --muted (3.25).
 */
/*
 * The date range moved to lib/rotation.ts in Revision 15 §5.1 — the homepage's
 * new Rotation masthead row prints the same fortnight, and two copies of this
 * arithmetic would eventually disagree about whether the span is 13 days or 14.
 */

export function VolumeMasthead({ volume }: { volume: VolumeDTO }) {
  // Cover if set, otherwise the curator's portrait, otherwise no panel at all
  // and the headline block runs full width.
  const panel = volume.coverImage ?? volume.curation?.curator.photo ?? null;

  return (
    <header className="border-b border-rule">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 md:grid-cols-12">
        <div className={panel ? "md:col-span-8" : "md:col-span-12"}>
          <div className="on-tan px-(--gutter) py-3">
            <p className="mono text-fg">
              {volumeLabel(volume.number)}
              {volume.publishedAt ? ` · ${volumeDateRange(volume.publishedAt, formatDateMono)}` : ""}
            </p>
          </div>

          <div className="px-(--gutter) pt-12 pb-12 md:pt-20 md:pb-16">
            <h1 className="display text-[clamp(4rem,11vw,9rem)] text-fg">Rotation</h1>
            <p className="mt-6 max-w-[48ch] text-lg text-fg-muted">
              {volume.intro || "The fortnight in sound."}
            </p>
          </div>
        </div>

        {panel ? (
          <div className="md:col-span-4">
            {/*
              The masthead image is the page's likely LCP element — the chart
              below it carries artwork now, but none of it is above the fold on
              any viewport this site targets. Hence `priority`.
            */}
            <RevealImage
              src={panel.url}
              alt={panel.alt || `Rotation ${volumeLabel(volume.number)}`}
              width={panel.width}
              height={panel.height}
              blurDataURL={panel.blurDataURL}
              sizes="(max-width: 768px) 100vw, 34vw"
              priority
              className="h-full min-h-[240px] w-full"
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default VolumeMasthead;
