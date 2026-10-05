import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import { getAdminContext } from "@/lib/admin-context";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const ctx = await getAdminContext();

  return (
    <AdminShell {...ctx} title="Account" subtitle={ctx.email}>
      <div className="a-auth-card max-w-[520px] p-6 sm:p-8">
        <h2 className="a-auth-mono mb-6 font-semibold" style={{ color: "var(--a-ink)" }}>
          Change password
        </h2>
        <ChangePasswordForm email={ctx.email} />
      </div>
    </AdminShell>
  );
}
