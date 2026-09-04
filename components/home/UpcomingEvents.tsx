import ActionLink from "@/components/site/ActionLink";
import EventCard from "@/components/site/EventCard";
import MonoLabel from "@/components/ui/MonoLabel";
import type { EventDTO } from "@/lib/types";

/** Horizontal scroll of posters — native overflow, no scroll-jacking. */
export function UpcomingEvents({ events }: { events: EventDTO[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mt-(--spacing-section-lg)">
      <div className="mx-auto max-w-[1600px] px-(--gutter)">
        <div className="flex items-baseline justify-between border-b border-rule pb-4">
          <MonoLabel>Upcoming</MonoLabel>
          <ActionLink href="/events">All events</ActionLink>
        </div>
      </div>

      <div className="mt-12 flex snap-x snap-mandatory gap-(--gutter) overflow-x-auto px-(--gutter) pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            className="w-[72vw] shrink-0 snap-start md:w-[26vw]"
          />
        ))}
      </div>
    </section>
  );
}

export default UpcomingEvents;
