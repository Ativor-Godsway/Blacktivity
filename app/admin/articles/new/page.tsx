import type { Metadata } from "next";
import { getAdminContext } from "@/lib/admin-context";
import AdminShell from "@/components/admin/AdminShell";
import ArticleForm from "@/components/admin/ArticleForm";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  const ctx = await getAdminContext();
  return (
    <AdminShell
      {...ctx}
      title="New article"
      subtitle="Autosaved locally as you type."
      collapsedRail
    >
      <ArticleForm />
    </AdminShell>
  );
}
