import Link from "next/link";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import { formatDateMono, isUpcoming, cn } from "@/lib/utils";
import type { EventDTO } from "@/lib/types";

export function EventCard({
  event,
  className,
  headingLevel = 3,
}: {
  event: EventDTO;
  className?: string;
  /** See ArticleCell — 2 on the index page, 3 under a section heading. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const upcoming = isUpcoming(event.startDate);
  const date = new Date(event.startDate);

  return (
    // Same `.card-hover` trio as the article and creatives grids — ground,
    // title, 4px arrow. The whole card is one link, so the ground lift is
    // honest about what is clickable.
    <article className={cn("card-hover -m-4 p-4", className)}>
      <Link href={`/events/${event.slug}`} className="block">
        <div className="mb-4 flex items-baseline justify-between border-b border-rule pb-3">
          <MonoLabel dim>{upcoming ? "UPCOMING" : "PAST"}</MonoLabel>
          <MonoLabel>{event.city}</MonoLabel>
        </div>

        <RevealImage
          src={event.poster.url}
          alt={event.poster.alt || event.title}
          width={event.poster.width}
          height={event.poster.height}
          sizes="(max-width: 768px) 80vw, 30vw"
          className={cn("aspect-3/4 w-full", !upcoming && "opacity-60")}
        />

        <p className="display mt-5 text-[clamp(2.5rem,4vw,3.5rem)] tabular-nums">
          {String(date.getUTCDate()).padStart(2, "0")}
          <span className="text-fg-dim">.</span>
          {String(date.getUTCMonth() + 1).padStart(2, "0")}
        </p>

        <Heading className="card-title mt-2 text-lg leading-snug">{event.title}</Heading>

        <p className="mono mt-3 flex items-center gap-2 text-fg-muted">
          {formatDateMono(event.startDate)} — {event.venue}
          <span aria-hidden="true" className="card-arrow inline-block">→</span>
        </p>
      </Link>
    </article>
  );
}

export default EventCard;
