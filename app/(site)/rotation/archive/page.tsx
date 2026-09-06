import Link from "next/link";
import type { Metadata } from "next";
import PageHeader from "@/components/site/PageHeader";
import MonoLabel from "@/components/ui/MonoLabel";
import Reveal from "@/components/motion/Reveal";
import ActionLink from "@/components/site/ActionLink";
import { getVolumeArchive } from "@/lib/rotation-queries";
import { staggerDelay, volumeLabel, volumeEventLabel } from "@/lib/rotation";
import { formatDateMono } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Rotation — archive",
  description: "Every volume of Rotation, the bi-weekly Blacktivity music record.",
  alternates: { canonical: "/rotation/archive" },
};

export default async function RotationArchivePage() {
  const volumes = await getVolumeArchive();

  return (
    <>
      <PageHeader
        label="Rotation / Archive"
        lines={["Every", "volume."]}
        intro="Rotation publishes bi-weekly. Past volumes stay exactly as they were published — the chart is a page in an issue, not a feed."
      />

      <div className="mx-auto max-w-[1600px] px-(--gutter) py-20">
        {volumes.length === 0 ? (
          <div className="max-w-[52ch]">
            <p className="mono text-fg-muted">
              No volumes have been published yet — Vol. 01 is on its way.
            </p>
            <ActionLink href="/submit" className="mt-8">
              Send us your record
            </ActionLink>
          </div>
        ) : (
          <ol className="border-t border-rule">
            {volumes.map((volume, i) => (
              <Reveal as="li" key={volume.slug} delay={staggerDelay(i)}>
                {/* Same card-hover trio as every other index on the site:
                    ground lifts, title darkens, arrow travels 4px. */}
                <Link
                  href={`/rotation/${volume.slug}`}
                  data-track={volumeEventLabel(volume.slug)}
                  className="card-hover block border-b border-rule px-4 py-8 md:px-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <MonoLabel dim>{volumeLabel(volume.number)}</MonoLabel>
                    <MonoLabel dim>
                      {volume.publishedAt ? formatDateMono(volume.publishedAt) : ""}
                    </MonoLabel>
                  </div>

                  <p className="card-title display mt-4 text-[clamp(1.75rem,4vw,3rem)]">
                    {volume.leading.length > 0 ? volume.leading.join(" · ") : "Volume"}
                  </p>

                  {volume.intro ? (
                    <p className="mt-3 max-w-[60ch] text-fg-muted">{volume.intro}</p>
                  ) : null}

                  <p className="mono mt-5 flex items-center gap-2 text-fg-dim">
                    Open the volume
                    <span aria-hidden="true" className="card-arrow inline-block">→</span>
                  </p>
                </Link>
              </Reveal>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
