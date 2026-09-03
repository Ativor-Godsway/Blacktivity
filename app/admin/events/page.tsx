import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import EventModel from "@/models/Event";
import { getSession } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";
import MonoLabel from "@/components/ui/MonoLabel";
import { ButtonLink } from "@/components/ui/Button";
import EventRowActions from "@/components/admin/EventRowActions";
import { formatDateMono, isUpcoming } from "@/lib/utils";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const session = await getSession();

  await dbConnect();
  const docs = await EventModel.find().sort({ startDate: -1 }).limit(200).lean();

  return (
    <AdminShell
      name={session?.name ?? "Admin"}
      title="Events"
      actions={<ButtonLink href="/admin/events/new">New event ↗</ButtonLink>}
    >
      {docs.length === 0 ? (
        <p className="mono text-fg-muted">No events yet.</p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-rule">
              {["Title", "Date", "Venue", "State", ""].map((h) => (
                <th key={h} className="mono py-3 pr-4 font-normal text-fg-dim">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={String(doc._id)} className="border-b border-rule">
                <td className="py-4 pr-4">
                  {doc.title}
                  {doc.featured ? <MonoLabel dim className="ml-3">★</MonoLabel> : null}
                </td>
                <td className="py-4 pr-4">
                  <MonoLabel dim>{formatDateMono(doc.startDate)}</MonoLabel>
                </td>
                <td className="py-4 pr-4">
                  <MonoLabel dim>
                    {doc.venue}, {doc.city}
                  </MonoLabel>
                </td>
                <td className="py-4 pr-4">
                  <MonoLabel className={isUpcoming(doc.startDate) ? "text-fg" : "text-fg-dim"}>
                    {isUpcoming(doc.startDate) ? "Upcoming" : "Past"}
                  </MonoLabel>
                </td>
                <td className="py-4">
                  <EventRowActions id={String(doc._id)} slug={doc.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}
