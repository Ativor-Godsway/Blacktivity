import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import { getSession } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";
import MonoLabel from "@/components/ui/MonoLabel";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateMono } from "@/lib/utils";
import ArticleRowActions from "@/components/admin/ArticleRowActions";

export const metadata: Metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSession();
  const { q, status } = await searchParams;

  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (status === "draft" || status === "published") filter.status = status;
  if (q?.trim()) {
    filter.title = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const docs = await Article.find(filter)
    .select("title slug status category featured readingTime publishedAt updatedAt")
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  const filters = [
    { label: "All", value: undefined },
    { label: "Published", value: "published" },
    { label: "Drafts", value: "draft" },
  ];

  return (
    <AdminShell
      name={session?.name ?? "Admin"}
      title="Articles"
      actions={<ButtonLink href="/admin/articles/new">New article ↗</ButtonLink>}
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
        <nav className="flex items-center gap-5">
          {filters.map((f) => {
            const active = (f.value ?? undefined) === (status ?? undefined);
            return (
              <Link
                key={f.label}
                href={f.value ? `/admin/articles?status=${f.value}` : "/admin/articles"}
                className={`mono pb-0.5 ${active ? "border-b border-fg text-fg" : "text-fg-muted hover:text-fg"}`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        <form action="/admin/articles" className="flex items-center gap-3">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search titles…"
            className="mono border-0 border-b border-rule-strong bg-transparent px-0 py-2 text-fg placeholder:text-fg-faint focus:border-fg focus:outline-none"
          />
          <button type="submit" className="mono text-fg-muted hover:text-fg">
            Search
          </button>
        </form>
      </div>

      {docs.length === 0 ? (
        <p className="mono text-fg-muted">Nothing here yet.</p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-rule">
              {["Title", "Category", "Status", "Updated", ""].map((h) => (
                <th key={h} className="mono py-3 pr-4 font-normal text-fg-dim">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={String(doc._id)} className="border-b border-rule align-middle">
                <td className="py-4 pr-4">
                  <Link href={`/admin/articles/${String(doc._id)}`} className="hover:underline">
                    {doc.title}
                  </Link>
                  {doc.featured ? <MonoLabel dim className="ml-3">★ Featured</MonoLabel> : null}
                </td>
                <td className="py-4 pr-4">
                  <MonoLabel dim>{doc.category}</MonoLabel>
                </td>
                <td className="py-4 pr-4">
                  <MonoLabel
                    className={doc.status === "published" ? "text-fg" : "text-fg-dim"}
                  >
                    {doc.status}
                  </MonoLabel>
                </td>
                <td className="py-4 pr-4">
                  <MonoLabel dim>
                    {doc.updatedAt ? formatDateMono(doc.updatedAt) : "—"}
                  </MonoLabel>
                </td>
                <td className="py-4">
                  <ArticleRowActions
                    id={String(doc._id)}
                    slug={doc.slug}
                    status={doc.status ?? "draft"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}
