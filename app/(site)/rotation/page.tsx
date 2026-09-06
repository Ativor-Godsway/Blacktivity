import type { Metadata } from "next";
import VolumeView, { RotationComingSoon } from "@/components/rotation/VolumeView";
import { getCurrentVolume, getVolumeNeighbours } from "@/lib/rotation-queries";
import { volumeLabel } from "@/lib/rotation";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 300;

/**
 * CANONICALS.
 *
 * `/rotation` and `/rotation/vol-07` render identical HTML while 07 is the
 * latest, so this page canonicals to the VOLUME'S OWN URL — not to itself — and
 * only `/rotation/[slug]` appears in the sitemap. Two URLs serving one page
 * with no canonical is a self-inflicted SEO problem.
 */
export async function generateMetadata(): Promise<Metadata> {
  const volume = await getCurrentVolume();

  if (!volume) {
    return {
      title: "Rotation",
      description: "A bi-weekly record of what is playing — new music, the chart, one guest curator.",
      alternates: { canonical: "/rotation" },
    };
  }

  const label = volumeLabel(volume.number);
  const og = absoluteUrl(`/api/og/rotation?volume=${volume.number}`);

  return {
    title: `Rotation ${label}`,
    description: volume.intro || "New music, the Blacktivity Chart, and one guest curator.",
    alternates: { canonical: absoluteUrl(`/rotation/${volume.slug}`) },
    openGraph: {
      title: `Rotation ${label} — Blacktivity`,
      description: volume.intro,
      url: absoluteUrl(`/rotation/${volume.slug}`),
      images: [{ url: og, width: 1200, height: 630, alt: `Rotation ${label}` }],
    },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function RotationPage() {
  const volume = await getCurrentVolume();
  if (!volume) return <RotationComingSoon />;

  const { previousSlug } = await getVolumeNeighbours(volume.number);
  return <VolumeView volume={volume} previousSlug={previousSlug} />;
}
