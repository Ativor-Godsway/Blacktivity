import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import Card from "@/components/admin/ui/Card";
import StatusPill from "@/components/admin/StatusPill";
import LogoutButton from "@/components/admin/LogoutButton";
import { getSession } from "@/lib/session";
import { getAdminContext } from "@/lib/admin-context";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/** Reports whether a secret is configured — never its value. */
function configured(value: string | undefined) {
  return Boolean(value && value.trim());
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const ctx = await getAdminContext();

  const integrations = [
    {
      name: "MongoDB Atlas",
      ok: configured(process.env.MONGODB_URI),
      note: "Articles, events, submissions and analytics",
    },
    {
      name: "Cloudinary",
      ok: configured(process.env.CLOUDINARY_API_KEY) && configured(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
      note: "Signed image uploads. Without it the uploader falls back to pasting URLs.",
    },
    {
      name: "Rollup cron",
      ok: configured(process.env.CRON_SECRET),
      note: "Runs 02:00 UTC and rejects requests without the bearer secret",
    },
    {
      name: "Analytics salt",
      ok: configured(process.env.ANALYTICS_SALT),
      note: "Rotates the visitor hash daily — no raw IP is ever stored",
    },
  ];

  return (
    <AdminShell {...ctx} title="Settings" subtitle="Account and integration status.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Account">
          <dl className="flex flex-col gap-3 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="a-muted">Name</dt>
              <dd>{ctx.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="a-muted">Email</dt>
              <dd className="truncate">{ctx.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="a-muted">Session</dt>
              <dd>Expires after 7 days</dd>
            </div>
          </dl>
          <div className="mt-5">
            <LogoutButton />
          </div>
        </Card>

        <Card title="Integrations">
          <ul className="flex flex-col gap-4">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13.5px]">{i.name}</p>
                  <p className="a-muted text-[12px]">{i.note}</p>
                </div>
                <StatusPill
                  status={i.ok ? "approved" : "pending"}
                  label={i.ok ? "Configured" : "Not set"}
                  className="flex-none"
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Site">
          <dl className="flex flex-col gap-3 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="a-muted">Public URL</dt>
              <dd className="truncate">{SITE.url}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="a-muted">Edition</dt>
              <dd>{SITE.edition}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="a-muted">Instagram</dt>
              <dd>@{SITE.ig}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Editing outside the admin">
          <p className="a-ink2 text-[13px]">
            The creative roster is not in the database — it lives in{" "}
            <code className="rounded px-1" style={{ background: "var(--admin-hover)" }}>
              data/team.ts
            </code>
            . Edit that file and redeploy to change it. The hero cover stack is the
            same:{" "}
            <code className="rounded px-1" style={{ background: "var(--admin-hover)" }}>
              data/covers.ts
            </code>
            .
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
