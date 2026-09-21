import Link from "next/link";
import MonoLabel from "@/components/ui/MonoLabel";
import ActionLink from "@/components/site/ActionLink";
import RotationGrid from "./RotationGrid";
import RotationMasthead from "./RotationMasthead";
import PlaylistBlock from "./PlaylistBlock";
import type { RotationRowData } from "./RotationRow";
import {
  EAGER_ROWS,
  volumeDateRange,
  volumeLabel,
  volumeEventLabel,
  type VolumeDTO,
} from "@/lib/rotation";
import { absoluteUrl, formatDateMono } from "@/lib/utils";
import { SITE } from "@/lib/constants";

/**
 * ONE VOLUME — Revision 17.
 *
 * TWO SECTIONS, IN THIS ORDER: The Chart, then New Releases. Revision 14 §4's
 * order is reversed deliberately — everything the reader came for is above the
 * fold, and New Releases is the thing you scroll to.
 *
 * THE THIRD SECTION IS GONE FROM THE PAGE, NOT FROM THE DATA. `volume.curation`
 * is still loaded, still stored, still editable in the admin, and Vols 04-07
 * keep their seeded curations — see §6. Nothing here renders it: no heading, no
 * anchor, no MusicRecording entries from it in the JSON-LD, and no
 * `rotation:curator:*` events. If it ever comes back it comes back as its own
 * route, not as a third section on this page.
 *
 * WHAT ELSE CAME OFF, and why it is not an oversight:
 *
 *   THE STICKY SECTION NAV. It existed to navigate three sections. §1's page is
 *   two, both named on the homepage poster and both reachable by deep link, and
 *   a sticky bar offering a choice of two while eating 56px of every scroll is
 *   worse than the scroll itself.
 *
 *   THE SPINNING DISC. §2 puts the LCP on the title text and §9 budgets this
 *   page at "roughly twenty 72px images" — a 520px cover bleeding off the left
 *   edge is neither, and the two-column grid it would have sat beside is the
 *   composition now. The volume's cover still has its two jobs (the OG card,
 *   the archive index).
 *
 * Everything below is static server-rendered HTML. No client-side sorting,
 * filtering or fetching, and zero third-party iframes and zero third-party
 * scripts on every Rotation URL.
 */
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
  const range = volumeDateRange(volume.publishedAt, formatDateMono);

  const chartRows: RotationRowData[] = volume.chart.map((row) => ({
    track: row.track,
    note: row.note,
    position: row.position,
    movement: row.movement,
    peak: row.peak,
    weeks: row.weeks,
  }));

  /*
    Newest release date first (§5). The query already returns them in that
    order, and where several share a date the ADMIN ORDER decides — which is
    what Revision 14 §6.3's reorder buttons are for. So this maps, and
    deliberately does not sort: re-sorting here would silently overrule the
    only control the owner has over ties.
  */
  const releaseRows: RotationRowData[] = volume.newMusic.map((entry) => ({
    track: entry.track,
    note: entry.note,
  }));

  /**
   * MusicPlaylist JSON-LD covering the CHART ONLY. It was chart-only before and
   * it stays chart-only — §10 checks that no curator markup survives, and the
   * curation's tracks were never in here to begin with.
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

      <RotationMasthead volume={volume} />

      {/* Light band under the dark masthead — Revision 20 §2.3. */}
      <div data-theme="light" className="px-(--gutter) pt-4 pb-(--spacing-section)">
        <div className="mx-auto max-w-[1600px]">
        {volume.intro ? (
          <p className="mt-10 max-w-[56ch] text-lg text-fg-muted">{volume.intro}</p>
        ) : null}

        {/* --- THE CHART ------------------------------------------------- */}
        <div className="mt-12">
          <RotationGrid
            id="chart"
            title="The Chart"
            meta={`${volume.chart.length} ${volume.chart.length === 1 ? "TRACK" : "TRACKS"}`}
            rows={chartRows}
            slotWidth="3rem"
            /* The only grid above the fold, so the only one with a share of
               §9's eager budget. */
            eagerRows={EAGER_ROWS}
          />
          <PlaylistBlock
            playlists={volume.playlists.chart}
            list="chart"
            volumeSlug={volume.slug}
            label="Listen — the full chart"
          />
        </div>

        {/* --- NEW RELEASES ----------------------------------------------
            THE LABEL IS "NEW RELEASES" EVERYWHERE — page, homepage, admin, OG
            card (§1). `ChartVolume.newMusic` keeps its field name: renaming a
            database field to match a label is a migration for nothing. */}
        {releaseRows.length > 0 ? (
          <div className="mt-(--spacing-section)">
            <RotationGrid
              id="new-releases"
              title="New Releases"
              meta={range}
              rows={releaseRows}
              slotWidth="4.5rem"
            />
            <PlaylistBlock
              playlists={volume.playlists.newMusic}
              list="newMusic"
              volumeSlug={volume.slug}
              label="Listen — new releases"
            />
          </div>
        ) : null}

        {/*
          THE /submit FUNNEL — §6.

          It used to close the Creators Curation block, where it was that
          section's community ask. The section is gone and the ask is not, so it
          lands here as ONE MONO LINE: no panel, no display headline, no second
          call to action competing with the playlist block above it.

          The previous/next volume links share the row because they are the same
          weight of thing — foot-of-page navigation, not content.
        */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-10 gap-y-4 border-t border-rule pt-8">
          <Link
            href="/submit"
            data-track={`rotation:submit:${volume.slug}`}
            className="group mono text-fg-dim transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg focus-visible:text-fg"
          >
            Submit music · Curate a volume
            <span
              aria-hidden="true"
              className="ml-2 inline-block transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-x-1 group-focus-visible:translate-x-1"
            >
              →
            </span>
          </Link>

          {previousSlug || nextSlug ? (
            <nav className="flex flex-wrap items-center gap-8" aria-label="Volumes">
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
        </div>
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
        <h1 className="display mt-6 text-[clamp(2.75rem,9vw,7rem)] leading-[0.92]">
          The first volume
          <span className="block text-fg-dim">is being cut.</span>
        </h1>
        <p className="mt-8 max-w-[52ch] text-fg-muted">
          Rotation is a bi-weekly record of what is actually playing — a
          ten-track chart, and everything released in the fortnight around it.
          Vol. 01 drops shortly.
        </p>
        <ActionLink href="/submit" className="mt-10">
          Send us your record
        </ActionLink>
      </div>
    </header>
  );
}

export default VolumeView;
