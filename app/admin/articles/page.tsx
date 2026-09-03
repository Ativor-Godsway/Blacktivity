import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import AdminShell from "@/components/admin/AdminShell";
import ArticlesList, { type ArticleListItem } from "@/components/admin/ArticlesList";
import { getAdminContext } from "@/lib/admin-context";

export const metadata: Metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

const d = (v: unknown) =>
  v ? new Date(v as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = status === "draft" || status === "published" ? status : "all";

  const ctx = await getAdminContext();
  await dbConnect();

  const filter: Record<string, unknown> = active === "all" ? {} : { status: active };

  const [docs, all, published, draft] = await Promise.all([
    Article.find(filter)
      .select("title slug status category readingTime publishedAt updatedAt excerpt")
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean(),
    Article.countDocuments({}),
    Article.countDocuments({ status: "published" }),
    Article.countDocuments({ status: "draft" }),
  ]);

  const items: ArticleListItem[] = docs.map((a) => ({
    id: String(a._id),
    title: a.title,
    slug: a.slug,
    status: a.status,
    category: a.category,
    readingTime: a.readingTime ?? 1,
    updated: d(a.updatedAt) ?? "—",
    published: d(a.publishedAt),
    excerpt: a.excerpt ?? "",
  }));

  return (
    <AdminShell
      {...ctx}
      title="Articles"
      subtitle={`${all} in total · ${draft} still in draft`}
      actions={
        <Link href="/admin/articles/new" className="a-btn a-btn-primary">
          New article
        </Link>
      }
    >
      <ArticlesList items={items} counts={{ all, published, draft }} activeFilter={active} />
    </AdminShell>
  );
}
