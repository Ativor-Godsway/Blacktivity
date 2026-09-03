import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";
import ArticleForm from "@/components/admin/ArticleForm";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  const session = await getSession();
  return (
    <AdminShell name={session?.name ?? "Admin"} title="New article">
      <ArticleForm />
    </AdminShell>
  );
}
