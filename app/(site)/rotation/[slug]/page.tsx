import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VolumeView from "@/components/rotation/VolumeView";
import {
  getVolumeBySlug,
  getPublishedVolumeSlugs,
  getVolumeNeighbours,
} from "@/lib/rotation-queries";
import { volumeLabel } from "@/lib/rotation";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedVolumeSlugs();
    return slugs.map(({ slug }) => ({ slug }));
  } catch {
    // No database at build time — volumes render on demand instead.
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const volume = await getVolumeBySlug(slug);
  if (!volume) return { title: "Not found" };

  const label = volumeLabel(volume.number);
  const url = absoluteUrl(`/rotation/${volume.slug}`);
  const og = absoluteUrl(`/api/og/rotation?volume=${volume.number}`);

  return {
    title: `Rotation ${label}`,
    description: volume.intro || "New music, the Blacktivity Chart, and one guest curator.",
    alternates: { canonical: url },
    openGraph: {
      title: `Rotation ${label} — Blacktivity`,
      description: volume.intro,
      url,
      publishedTime: volume.publishedAt ?? undefined,
      images: [{ url: og, width: 1200, height: 630, alt: `Rotation ${label}` }],
    },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function VolumePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const volume = await getVolumeBySlug(slug);
  if (!volume) notFound();

  const { previousSlug, nextSlug } = await getVolumeNeighbours(volume.number);
  return <VolumeView volume={volume} previousSlug={previousSlug} nextSlug={nextSlug} />;
}
