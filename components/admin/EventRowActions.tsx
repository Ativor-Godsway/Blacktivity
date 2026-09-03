"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventRowActions({ id, slug }: { id: string; slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this event permanently?")) return;

    setBusy(true);
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    setBusy(false);

    if (res.ok) router.refresh();
    else window.alert("Couldn't delete that event.");
  }

  return (
    <div className="flex items-center justify-end gap-4">
      <Link href={`/events/${slug}`} target="_blank" className="mono text-fg-muted hover:text-fg">
        View ↗
      </Link>
      <Link href={`/admin/events/${id}`} className="mono text-fg-muted hover:text-fg">
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

export default EventRowActions;
