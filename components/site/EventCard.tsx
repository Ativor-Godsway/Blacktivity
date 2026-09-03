import Link from "next/link";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import { formatDateMono, isUpcoming, cn } from "@/lib/utils";
import type { EventDTO } from "@/lib/types";

export function EventCard({
  event,
  className,
}: {
  event: EventDTO;
  className?: string;
}) {
  const upcoming = isUpcoming(event.startDate);
  const date = new Date(event.startDate);

  return (
    <article className={cn("group", className)}>
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

        <h3 className="mt-2 text-lg leading-snug">{event.title}</h3>

        <p className="mono mt-3 text-fg-muted">
          {formatDateMono(event.startDate)} — {event.venue}
        </p>
      </Link>
    </article>
  );
}

export default EventCard;
