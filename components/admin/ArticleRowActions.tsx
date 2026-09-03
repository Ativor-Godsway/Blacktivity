"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArticleRowActions({
  id,
  slug,
  status,
}: {
  id: string;
  slug: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this article permanently? This cannot be undone.")) return;

    setBusy(true);
    const res = await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
    setBusy(false);

    if (res.ok) router.refresh();
    else window.alert("Couldn't delete that article.");
  }

  return (
    <div className="flex items-center justify-end gap-4">
      {status === "published" ? (
        <Link
          href={`/articles/${slug}`}
          target="_blank"
          className="mono text-fg-muted hover:text-fg"
        >
          View ↗
        </Link>
      ) : null}
      <Link href={`/admin/articles/${id}`} className="mono text-fg-muted hover:text-fg">
        Edit
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="mono text-fg-dim hover:text-fg disabled:opacity-40"
      >
        {busy ? "…" : "Delete"}
      </button>
    </div>
  );
}

export default ArticleRowActions;
