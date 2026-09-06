import Link from "next/link";
import MonoLabel from "@/components/ui/MonoLabel";
import ActionLink from "@/components/site/ActionLink";
import NewMusicList from "./NewMusicList";
import ChartGrid from "./ChartGrid";
import CurationBlock from "./CurationBlock";
import VolumeMasthead from "./VolumeMasthead";
import PlaylistBlock from "./PlaylistBlock";
import { volumeLabel, volumeEventLabel, type VolumeDTO } from "@/lib/rotation";
import { absoluteUrl } from "@/lib/utils";
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
 * arrival. NOTE: this site's header is `relative`, not sticky — it scrolls
 * away — so the margin is one gutter plus breathing room rather than the
 * header height the brief assumed. If the header ever becomes sticky, this is
 * the one value that needs to grow with it.
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
      className="flex scroll-mt-[calc(var(--gutter)+2rem)] items-baseline justify-between border-b border-rule pb-4"
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

      <VolumeMasthead volume={volume} />

      <nav
        className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-6 px-(--gutter) py-6"
        aria-label="Volumes"
      >
        <Link
          href="/rotation/archive"
          className="mono text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg"
        >
          All volumes
        </Link>
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

      <div className="mx-auto max-w-[1600px] px-(--gutter) py-20">
        {volume.newMusic.length > 0 ? (
          <section>
            <SectionHeading id="new-music" label="Out now" count={volume.newMusic.length}>
              New Music
            </SectionHeading>
            <div className="mt-14">
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
            <div className="mt-14">
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
            <div className="mt-14">
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
