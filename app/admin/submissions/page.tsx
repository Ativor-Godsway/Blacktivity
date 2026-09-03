import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import { getSession } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";
import SubmissionCard from "@/components/admin/SubmissionCard";
import MonoLabel from "@/components/ui/MonoLabel";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  const { status } = await searchParams;

  const active = SUBMISSION_STATUSES.includes(status as SubmissionStatus)
    ? (status as SubmissionStatus)
    : undefined;

  await dbConnect();

  const [docs, counts] = await Promise.all([
    Submission.find(active ? { status: active } : {})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    Submission.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const countFor = (s: string) => counts.find((c) => c._id === s)?.count ?? 0;

  const filters = [
    { label: "All", value: undefined, count: counts.reduce((a, c) => a + c.count, 0) },
    ...SUBMISSION_STATUSES.map((s) => ({ label: s, value: s, count: countFor(s) })),
  ];

  return (
    <AdminShell name={session?.name ?? "Admin"} title="Submissions">
      <nav className="mb-10 flex flex-wrap items-center gap-6">
        {filters.map((f) => {
          const isActive = (f.value ?? undefined) === (active ?? undefined);
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/submissions?status=${f.value}` : "/admin/submissions"}
              className={`mono pb-0.5 capitalize ${
                isActive ? "border-b border-fg text-fg" : "text-fg-muted hover:text-fg"
              }`}
            >
              {f.label} <span className="text-fg-faint">{f.count}</span>
            </Link>
          );
        })}
      </nav>

      {docs.length === 0 ? (
        <p className="mono text-fg-muted">Nothing in this queue.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => (
            <SubmissionCard
              key={String(doc._id)}
              submission={{
                id: String(doc._id),
                name: doc.name,
                email: doc.email,
                igHandle: doc.igHandle ?? "",
                discipline: doc.discipline,
                workUrl: doc.workUrl ?? "",
                imageUrl: doc.image?.url ?? "",
                note: doc.note ?? "",
                status: doc.status as SubmissionStatus,
                createdAt: new Date(doc.createdAt).toISOString(),
              }}
            />
          ))}
        </div>
      )}

      <p className="mono mt-12 text-fg-faint">
        <MonoLabel dim>Approved submissions appear publicly on /creatives.</MonoLabel>
      </p>
    </AdminShell>
  );
}
