import Link from "next/link";
import MonoLabel from "@/components/ui/MonoLabel";
import ActionLink from "@/components/site/ActionLink";
import NewMusicList from "./NewMusicList";
import ChartGrid from "./ChartGrid";
import CurationBlock from "./CurationBlock";
import RotationMasthead from "./RotationMasthead";
import SectionNav from "./SectionNav";
import Disc from "./Disc";
import PlaylistBlock from "./PlaylistBlock";
import { volumeLabel, volumeEventLabel, type VolumeDTO } from "@/lib/rotation";
import { absoluteUrl, cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

/**
 * One volume, rendered identically at `/rotation` and `/rotation/vol-07`. The
 * two URLs serve the same HTML while 07 is the latest, which is why `/rotation`
 * canonicals to the volume's own URL and only the slug pages are in the
 * sitemap — see the route files.
 *
 * Everything below is static server-rendered HTML. No client-side sorting,
 * filtering or fetching, and zero third-party iframes or scripts.
 */
/**
 * SECTION ANCHORS — Revision 14 §3.
 *
 * A real `id` on a real element, reachable by a real `<a href="#...">`. The
 * native jump has to work with JavaScript disabled; everything Lenis does on
 * arrival (see SmoothScroll) is enhancement layered on top of that baseline.
 *
 * scroll-margin-top keeps the heading clear of the top of the viewport on
 * arrival. Revision 17 §3.2 puts a STICKY section nav above these headings, so
 * the margin now has to clear that nav as well as leave breathing room —
 * otherwise a deep link from the homepage lands with its heading tucked behind
 * the very nav that is meant to show you where you are.
 */
function SectionHeading({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count?: number;
  children: string;
}) {
  return (
    <div
      id={id}
      className="flex scroll-mt-[7rem] items-baseline justify-between border-b border-rule pb-4"
    >
      <div>
        <MonoLabel dim>{label}</MonoLabel>
        <h2 className="display mt-4 text-[clamp(2rem,5vw,3.5rem)]">{children}</h2>
      </div>
      {count === undefined ? null : (
        <MonoLabel dim>{String(count).padStart(2, "0")}</MonoLabel>
      )}
    </div>
  );
}

export function VolumeView({
  volume,
  previousSlug,
  nextSlug,
}: {
  volume: VolumeDTO;
  previousSlug?: string | null;
  nextSlug?: string | null;
}) {
  const label = volumeLabel(volume.number);

  /** Distinct tracks across the three lists — the masthead's count. */
  const trackIds = new Set<string>();
  for (const e of volume.newMusic) trackIds.add(e.track.id);
  for (const r of volume.chart) trackIds.add(r.track.id);
  for (const e of volume.curation?.tracks ?? []) trackIds.add(e.track.id);

  /*
   * THE DISC IS OPTIONAL, AND THE LAYOUT HAS TO KNOW.
   *
   * It renders the VOLUME'S OWN cover, and a volume without one gets no disc —
   * there is no placeholder here, the same way there is no "curator TBA".
   * But the grid must then collapse to a single column: reserving an 18rem
   * left column for an element that is not there leaves the whole page
   * indented past a strip of empty sand, which is worse than not having the
   * disc at all.
   *
   * Worth knowing: as of this revision NO seeded volume sets coverImage, so
   * this is the live path, not the edge case.
   */
  const disc = volume.coverImage;

  const present = [
    volume.newMusic.length > 0 ? "new-music" : null,
    volume.chart.length > 0 ? "chart" : null,
    volume.curation ? "curation" : null,
  ].filter((v): v is string => v !== null);

  /**
   * MusicPlaylist JSON-LD covering the chart, with byArtist and url on every
   * track. The chart is the list worth describing to a search engine; the other
   * two are editorial context around it.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: `Rotation ${label} — ${SITE.name}`,
    description: volume.intro || undefined,
    url: absoluteUrl(`/rotation/${volume.slug}`),
    numTracks: volume.chart.length,
    track: volume.chart.map((row) => ({
      "@type": "MusicRecording",
      name: row.track.title,
      byArtist: { "@type": "MusicGroup", name: row.track.artist },
      url: Object.values(row.track.links).find(Boolean) ?? undefined,
      position: row.position,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <RotationMasthead volume={volume} trackCount={trackIds.size} />

      {volume.intro ? (
        <div className="mx-auto max-w-[1600px] px-(--gutter) pt-8">
          <p className="max-w-[56ch] text-lg text-fg-muted">{volume.intro}</p>
        </div>
      ) : null}

      <div className="mt-12">
        <SectionNav present={present} />
      </div>

      {/*
        THE DISC COLUMN — Revision 17 §3.3.

        A two-column grid from lg up: the record on the left, every section's
        cards on the right. The disc is `sticky` inside its own cell, so it
        holds while the cards scroll past rather than scrolling away with them.

        `overflow-x-clip` on the wrapper, not `hidden`: the disc bleeds 40% off
        its own left edge and would otherwise widen the document and produce a
        horizontal scrollbar. `clip` does the same job without creating a
        scroll container, which `hidden` would — and a scroll container here
        would break the `sticky` inside it.
      */}
      <div className="overflow-x-clip">
        <div
          className={cn(
            "mx-auto grid max-w-[1600px] grid-cols-1 gap-(--gutter) px-(--gutter) py-16",
            disc ? "lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12" : "lg:grid-cols-1",
          )}
        >
          {disc ? (
            <div className="hidden lg:block">
              <Disc image={disc} />
            </div>
          ) : null}

          <div>
            {volume.newMusic.length > 0 ? (
              <section>
                <SectionHeading id="new-music" label="Out now" count={volume.newMusic.length}>
                  New Music
                </SectionHeading>
                <div className="mt-8">
                  <NewMusicList entries={volume.newMusic} />
                </div>
                <PlaylistBlock
                  playlists={volume.playlists.newMusic}
                  list="newMusic"
                  volumeSlug={volume.slug}
                  label="Listen — new music"
                />
              </section>
            ) : null}

            {volume.chart.length > 0 ? (
              <section className="mt-(--spacing-section)">
                <SectionHeading id="chart" label="What's moving" count={volume.chart.length}>
                  The Blacktivity Chart
                </SectionHeading>
                <div className="mt-8">
                  <ChartGrid rows={volume.chart} />
                </div>
                <PlaylistBlock
                  playlists={volume.playlists.chart}
                  list="chart"
                  volumeSlug={volume.slug}
                  label="Listen — the full chart"
                />
              </section>
            ) : null}

            {volume.curation ? (
              <section className="mt-(--spacing-section)">
                <SectionHeading id="curation" label="Guest selector">Creators Curation</SectionHeading>
                <div className="mt-8">
                  <CurationBlock curation={volume.curation} volumeSlug={volume.slug} />
                </div>
                <PlaylistBlock
                  playlists={volume.playlists.curation}
                  list="curation"
                  volumeSlug={volume.slug}
                  label={`Listen — ${volume.curation.curator.name}'s selection`}
                />
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {/*
        FOOT OF THE PAGE — Revision 17 §3.5. Reference E ends on a search pill;
        this ends on the archive, which is the thing a reader who has got this
        far actually wants. The previous/next volume links live here too rather
        than in a nav strip near the top, where they competed with the section
        nav for the same glance.
      */}
      <div className="mx-auto max-w-[1600px] px-(--gutter) pb-(--spacing-section)">
        <Link
          href="/rotation/archive"
          className="group flex items-center justify-between gap-6 border-y border-rule py-10 transition-colors duration-300 ease-[var(--ease-expo)] hover:bg-bg-raised"
        >
          <span className="rotation-word text-[clamp(2rem,6vw,4rem)] text-fg">All volumes</span>
          <span
            aria-hidden="true"
            className="mono inline-block text-fg-dim transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-x-1"
          >
            →
          </span>
        </Link>

        {previousSlug || nextSlug ? (
          <nav className="mt-8 flex flex-wrap items-center gap-8" aria-label="Volumes">
            {previousSlug ? (
              <Link
                href={`/rotation/${previousSlug}`}
                data-track={volumeEventLabel(previousSlug)}
                className="mono text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg"
              >
                ← Previous volume
              </Link>
            ) : null}
            {nextSlug ? (
              <Link
                href={`/rotation/${nextSlug}`}
                data-track={volumeEventLabel(nextSlug)}
                className="mono text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg"
              >
                Next volume →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </>
  );
}

/** Before Vol. 01 exists. A designed state, never a 404 from a visible nav item. */
export function RotationComingSoon() {
  return (
    <header className="px-(--gutter) pt-16 pb-(--spacing-section) md:pt-28">
      <div className="mx-auto max-w-[1600px]">
        <MonoLabel dim>Rotation / Vol. 01</MonoLabel>
        <h1 className="display mt-6 text-[clamp(2.75rem,9vw,7rem)]">
          The first volume
          <span className="block text-fg-dim">is being cut.</span>
        </h1>
        <p className="mt-8 max-w-[52ch] text-fg-muted">
          Rotation is a bi-weekly record of what is actually playing — new music,
          a ten-track chart, and one guest curator per volume. Vol. 01 drops
          shortly.
        </p>
        <ActionLink href="/submit" className="mt-10">
          Send us your record
        </ActionLink>
      </div>
    </header>
  );
}

export default VolumeView;
