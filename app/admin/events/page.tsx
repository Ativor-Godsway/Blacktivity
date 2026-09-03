import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import EventModel from "@/models/Event";
import AdminShell from "@/components/admin/AdminShell";
import EventsList, { type EventListItem } from "@/components/admin/EventsList";
import { getAdminContext } from "@/lib/admin-context";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ when?: string }>;
}) {
  const { when } = await searchParams;
  const active = when === "upcoming" || when === "past" ? when : "all";

  const ctx = await getAdminContext();
  await dbConnect();

  const now = new Date();
  // Upcoming vs past is always derived from startDate, never stored.
  const filter: Record<string, unknown> =
    active === "upcoming"
      ? { startDate: { $gte: now } }
      : active === "past"
        ? { startDate: { $lt: now } }
        : {};

  const [docs, all, upcoming] = await Promise.all([
    EventModel.find(filter).sort({ startDate: -1 }).limit(200).lean(),
    EventModel.countDocuments({}),
    EventModel.countDocuments({ startDate: { $gte: now } }),
  ]);

  const items: EventListItem[] = docs.map((e) => ({
    id: String(e._id),
    title: e.title,
    slug: e.slug,
    venue: e.venue,
    city: e.city ?? "",
    starts: new Date(e.startDate as Date).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    }),
    isUpcoming: new Date(e.startDate as Date) >= now,
    description: e.description ?? "",
    ticketUrl: e.ticketUrl ?? "",
  }));

  return (
    <AdminShell
      {...ctx}
      title="Events"
      subtitle={`${all} in total · ${upcoming} upcoming`}
      actions={
        <Link href="/admin/events/new" className="a-btn a-btn-primary">
          New event
        </Link>
      }
    >
      <EventsList
        items={items}
        counts={{ all, upcoming, past: all - upcoming }}
        activeFilter={active}
      />
    </AdminShell>
  );
}
