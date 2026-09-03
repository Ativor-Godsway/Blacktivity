import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import AdminShell from "@/components/admin/AdminShell";
import SubmissionsView, { type SubmissionItem } from "@/components/admin/SubmissionsView";
import { getAdminContext } from "@/lib/admin-context";

export const metadata: Metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = ["pending", "approved", "rejected"].includes(status ?? "") ? status! : "all";

  const ctx = await getAdminContext();
  await dbConnect();

  const filter: Record<string, unknown> = active === "all" ? {} : { status: active };

  const [docs, all, pending, approved, rejected] = await Promise.all([
    Submission.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
    Submission.countDocuments({}),
    Submission.countDocuments({ status: "pending" }),
    Submission.countDocuments({ status: "approved" }),
    Submission.countDocuments({ status: "rejected" }),
  ]);

  const items: SubmissionItem[] = docs.map((s) => ({
    id: String(s._id),
    name: s.name,
    email: s.email,
    igHandle: s.igHandle ?? "",
    discipline: s.discipline,
    workUrl: s.workUrl ?? "",
    imageUrl: s.image?.url ?? "",
    note: s.note ?? "",
    status: s.status,
    received: new Date(s.createdAt as Date).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    }),
  }));

  return (
    <AdminShell
      {...ctx}
      title="Submissions"
      subtitle={`${all} received · ${pending} awaiting review`}
    >
      <SubmissionsView
        items={items}
        counts={{ all, pending, approved, rejected }}
        activeFilter={active}
      />
    </AdminShell>
  );
}
