"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ListTable, { type ListRow } from "./ListTable";

export type ArticleListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  readingTime: number;
  updated: string;
  published: string | null;
  excerpt: string;
};

export function ArticlesList({
  items,
  counts,
  activeFilter,
}: {
  items: ArticleListItem[];
  counts: { all: number; published: number; draft: number };
  activeFilter: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setFilter(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "all") next.delete("status");
    else next.set("status", key);
    router.push(`/admin/articles?${next.toString()}`, { scroll: false });
  }

  const rows: ListRow[] = items.map((a) => ({
    id: a.id,
    title: a.title,
    subtitle: `/articles/${a.slug}`,
    status: a.status,
    href: `/admin/articles/${a.id}`,
    cells: {
      category: a.category,
      reading: `${a.readingTime} min`,
      updated: a.updated,
      published: a.published ?? "—",
    },
    detail: (
      <div className="flex flex-col gap-4 text-[13px]">
        <p className="a-ink2">{a.excerpt}</p>
        <dl className="flex flex-col gap-2">
          {[
            ["Category", a.category],
            ["Reading time", `${a.readingTime} min`],
            ["Last edited", a.updated],
            ["Published", a.published ?? "Not published"],
            ["Slug", a.slug],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="a-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2 pt-1">
          <Link href={`/admin/articles/${a.id}`} className="a-btn a-btn-primary">
            Edit article
          </Link>
          {a.status === "published" ? (
            <Link href={`/articles/${a.slug}`} target="_blank" className="a-btn a-btn-ghost">
              View ↗
            </Link>
          ) : null}
        </div>
      </div>
    ),
  }));

  async function patchStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  }

  return (
    <ListTable
      columns={[
        { key: "category", label: "Category", width: "14%" },
        { key: "reading", label: "Read", width: "9%" },
        { key: "updated", label: "Edited", width: "14%" },
        { key: "published", label: "Published", width: "14%" },
      ]}
      rows={rows}
      filters={[
        { key: "all", label: "All", count: counts.all },
        { key: "published", label: "Published", count: counts.published },
        { key: "draft", label: "Drafts", count: counts.draft },
      ]}
      activeFilter={activeFilter}
      onFilter={setFilter}
      bulkActions={[
        { label: "Publish", run: (id) => patchStatus(id, "published") },
        { label: "Move to draft", run: (id) => patchStatus(id, "draft") },
        {
          label: "Delete",
          destructive: true,
          confirm: "Delete the selected articles permanently? This cannot be undone.",
          run: async (id) => (await fetch(`/api/admin/articles/${id}`, { method: "DELETE" })).ok,
        },
      ]}
      emptyTitle={activeFilter === "draft" ? "No drafts" : "No articles yet"}
      emptyBody={
        activeFilter === "draft"
          ? "Everything you've started is published."
          : "Write the first one — it'll appear here and on the public site once published."
      }
      emptyAction={
        <Link href="/admin/articles/new" className="a-btn a-btn-primary">
          New article
        </Link>
      }
      detailTitle="Article"
    />
  );
}

export default ArticlesList;
