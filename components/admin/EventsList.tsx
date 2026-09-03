"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ListTable, { type ListRow } from "./ListTable";

export type EventListItem = {
  id: string;
  title: string;
  slug: string;
  venue: string;
  city: string;
  starts: string;
  isUpcoming: boolean;
  description: string;
  ticketUrl: string;
};

export function EventsList({
  items,
  counts,
  activeFilter,
}: {
  items: EventListItem[];
  counts: { all: number; upcoming: number; past: number };
  activeFilter: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setFilter(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "all") next.delete("when");
    else next.set("when", key);
    router.push(`/admin/events?${next.toString()}`, { scroll: false });
  }

  const rows: ListRow[] = items.map((e) => ({
    id: e.id,
    title: e.title,
    subtitle: `${e.venue} · ${e.city}`,
    status: e.isUpcoming ? "upcoming" : "past",
    href: `/admin/events/${e.id}`,
    cells: { starts: e.starts, venue: e.venue, tickets: e.ticketUrl ? "Yes" : "—" },
    detail: (
      <div className="flex flex-col gap-4 text-[13px]">
        <p className="a-ink2">{e.description}</p>
        <dl className="flex flex-col gap-2">
          {[
            ["Starts", e.starts],
            ["Venue", e.venue],
            ["City", e.city],
            ["Tickets", e.ticketUrl || "None"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="a-muted">{k}</dt>
              <dd className="max-w-[60%] truncate text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2 pt-1">
          <Link href={`/admin/events/${e.id}`} className="a-btn a-btn-primary">
            Edit event
          </Link>
          <Link href={`/events/${e.slug}`} target="_blank" className="a-btn a-btn-ghost">
            View ↗
          </Link>
        </div>
      </div>
    ),
  }));

  return (
    <ListTable
      columns={[
        { key: "starts", label: "Starts", width: "18%" },
        { key: "venue", label: "Venue", width: "24%" },
        { key: "tickets", label: "Tickets", width: "10%" },
      ]}
      rows={rows}
      filters={[
        { key: "all", label: "All", count: counts.all },
        { key: "upcoming", label: "Upcoming", count: counts.upcoming },
        { key: "past", label: "Past", count: counts.past },
      ]}
      activeFilter={activeFilter}
      onFilter={setFilter}
      bulkActions={[
        {
          label: "Delete",
          destructive: true,
          confirm: "Delete the selected events permanently?",
          run: async (id) => (await fetch(`/api/admin/events/${id}`, { method: "DELETE" })).ok,
        },
      ]}
      emptyTitle={activeFilter === "past" ? "No past events" : "No events yet"}
      emptyBody="Upcoming and past are derived from the start date — you never set it by hand."
      emptyAction={
        <Link href="/admin/events/new" className="a-btn a-btn-primary">
          New event
        </Link>
      }
      detailTitle="Event"
    />
  );
}

export default EventsList;
