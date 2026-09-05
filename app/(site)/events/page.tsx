import type { Metadata } from "next";
import PageHeader from "@/components/site/PageHeader";
import EventCard from "@/components/site/EventCard";
import MonoLabel from "@/components/ui/MonoLabel";
import Reveal from "@/components/motion/Reveal";
import { getEvents } from "@/lib/queries";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events",
  description: "Meetups, exhibitions and listening sessions from Blacktivity in Accra.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const { upcoming, past } = await getEvents();

  return (
    <>
      <PageHeader
        label="Diary"
        lines={["Where we", "gather."]}
        intro="Exhibitions, listening sessions and meetups. Everything happens in the room, in person."
      />

      <div className="mx-auto max-w-[1600px] px-(--gutter) py-20">
        <section>
          <div className="flex items-baseline justify-between border-b border-rule pb-4">
            <MonoLabel as="h2">Upcoming</MonoLabel>
            <MonoLabel dim>{String(upcoming.length).padStart(2, "0")}</MonoLabel>
          </div>

          {upcoming.length === 0 ? (
            <p className="mono mt-10 text-fg-muted">
              Nothing on the calendar right now — follow along on Instagram.
            </p>
          ) : (
            <div className="mt-14 grid grid-cols-4 gap-x-(--gutter) gap-y-16 md:grid-cols-12">
              {upcoming.map((event, i) => (
                <Reveal key={event.id} delay={(i % 3) * 0.05} className="col-span-4">
                  <EventCard event={event} />
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {past.length > 0 ? (
          <section className="mt-(--spacing-section)">
            <div className="flex items-baseline justify-between border-b border-rule pb-4">
              <MonoLabel as="h2">Past</MonoLabel>
              <MonoLabel dim>{String(past.length).padStart(2, "0")}</MonoLabel>
            </div>
            <div className="mt-14 grid grid-cols-4 gap-x-(--gutter) gap-y-16 md:grid-cols-12">
              {past.map((event, i) => (
                <Reveal key={event.id} delay={(i % 3) * 0.05} className="col-span-4">
                  <EventCard event={event} />
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
