import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";
import EventForm from "@/components/admin/EventForm";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  const session = await getSession();
  return (
    <AdminShell name={session?.name ?? "Admin"} title="New event">
      <EventForm />
    </AdminShell>
  );
}
