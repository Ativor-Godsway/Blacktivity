import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import { getEventBySlug, getAllEventSlugs } from "@/lib/queries";
import { formatDateMono, isUpcoming, absoluteUrl } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await getAllEventSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Not found" };

  const url = absoluteUrl(`/events/${event.slug}`);
  const og = absoluteUrl(
    `/api/og?title=${encodeURIComponent(event.title)}&label=${encodeURIComponent(formatDateMono(event.startDate))}`,
  );

  return {
    title: event.title,
    description: event.description.slice(0, 200),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: event.title,
      description: event.description.slice(0, 200),
      url,
      images: [{ url: og, width: 1200, height: 630, alt: event.title }],
    },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const upcoming = isUpcoming(event.startDate);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    image: [event.poster.url],
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue,
      address: { "@type": "PostalAddress", addressLocality: event.city, addressCountry: "GH" },
    },
    organizer: { "@type": "Organization", name: SITE.name, url: SITE.url },
    ...(event.ticketUrl ? { offers: { "@type": "Offer", url: event.ticketUrl } } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-[1600px] px-(--gutter) py-16 md:py-24">
        <div className="flex items-baseline justify-between border-b border-rule pb-4">
          <MonoLabel>{upcoming ? "Upcoming" : "Past"}</MonoLabel>
          <MonoLabel dim>
            {event.venue} — {event.city}
          </MonoLabel>
        </div>

        <div className="mt-14 grid grid-cols-4 gap-x-(--gutter) gap-y-12 md:grid-cols-12">
          <div className="col-span-4 md:col-span-5">
            <RevealImage
              src={event.poster.url}
              alt={event.poster.alt || event.title}
              width={event.poster.width}
              height={event.poster.height}
              sizes="(max-width: 768px) 100vw, 40vw"
              priority
              className="aspect-3/4 w-full"
            />
          </div>

          <div className="col-span-4 md:col-span-6 md:col-start-7">
            <h1 className="display text-[clamp(2.5rem,7vw,5.5rem)]">{event.title}</h1>

            <dl className="mt-12 border-t border-rule">
              {[
                ["Date", formatDateMono(event.startDate)],
                ...(event.endDate ? [["Ends", formatDateMono(event.endDate)]] : []),
                ["Venue", event.venue],
                ["City", event.city],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="flex items-baseline justify-between border-b border-rule py-4"
                >
                  <dt className="mono text-fg-dim">{term}</dt>
                  <dd className="mono text-fg">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-10 max-w-[54ch] whitespace-pre-line text-fg-muted">
              {event.description}
            </p>

            {event.ticketUrl && upcoming ? (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noreferrer noopener"
                data-track="event-tickets"
                className="mono mt-12 inline-flex border border-fg bg-fg px-8 py-5 text-bg transition-colors duration-300 ease-[var(--ease-expo)] hover:bg-transparent hover:text-fg"
              >
                Get tickets ↗
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
