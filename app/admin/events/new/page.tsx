import type { Metadata } from "next";
import { getAdminContext } from "@/lib/admin-context";
import AdminShell from "@/components/admin/AdminShell";
import EventForm from "@/components/admin/EventForm";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  const ctx = await getAdminContext();
  return (
    <AdminShell {...ctx} title="New event" collapsedRail>
      <EventForm />
    </AdminShell>
  );
}
