import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import EventModel from "@/models/Event";
import { getAdminContext } from "@/lib/admin-context";
import AdminShell from "@/components/admin/AdminShell";
import EventForm from "@/components/admin/EventForm";

export const metadata: Metadata = { title: "Edit event" };
export const dynamic = "force-dynamic";

/** datetime-local wants YYYY-MM-DDTHH:mm with no timezone suffix. */
function toLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 16);
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const ctx = await getAdminContext();

  await dbConnect();
  const doc = await EventModel.findById(id).lean();
  if (!doc) notFound();

  return (
    <AdminShell {...ctx} title="Edit event" collapsedRail>
      <EventForm
        id={id}
        initial={{
          title: doc.title,
          slug: doc.slug,
          description: doc.description,
          poster: {
            url: doc.poster.url,
            publicId: doc.poster.publicId ?? "",
            alt: doc.poster.alt ?? "",
            width: doc.poster.width ?? 1200,
            height: doc.poster.height ?? 1600,
            blurDataURL: "",
          },
          startDate: toLocalInput(doc.startDate),
          endDate: toLocalInput(doc.endDate),
          venue: doc.venue,
          city: doc.city ?? "Accra",
          ticketUrl: doc.ticketUrl ?? "",
          featured: Boolean(doc.featured),
        }}
      />
    </AdminShell>
  );
}
