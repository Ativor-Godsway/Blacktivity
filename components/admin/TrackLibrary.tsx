"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Card, { Empty } from "./ui/Card";
import TrackEditPanel from "./TrackEditPanel";
import { cn } from "@/lib/utils";

/**
 * THE TRACK LIBRARY.
 *
 * Every Track in one searchable list. This is where duplicates get spotted and
 * merged, and it is THE ONLY PLACE A TRACK CAN BE DELETED — the volume editor
 * only ever removes a reference.
 *
 * Deletion is blocked while any volume references the track, and the blocking
 * volumes are named. A deleted track takes its chart history with it: every
 * volume that charted it loses the row, and movement in every later volume
 * silently changes.
 */
export type LibraryTrack = {
  id: string;
  slug: string;
  artist: string;
  title: string;
  artwork: { url: string } | null;
  releaseDate: string;
  volumes: number[];
  peak: number | null;
};

type Sort = "artist" | "used";

export function TrackLibrary({ tracks }: { tracks: LibraryTrack[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("artist");
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? tracks.filter(
          (t) =>
            t.artist.toLowerCase().includes(q) ||
            t.title.toLowerCase().includes(q) ||
            t.slug.includes(q),
        )
      : tracks;

    return [...filtered].sort((a, b) =>
      sort === "used"
        ? b.volumes.length - a.volumes.length || a.artist.localeCompare(b.artist)
        : a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
    );
  }, [tracks, query, sort]);

  async function remove(track: LibraryTrack) {
    if (track.volumes.length > 0) return;
    if (!window.confirm(`Delete “${track.artist} — ${track.title}” permanently?`)) return;

    const res = await fetch(`/api/admin/tracks/${track.id}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setMessage(res.ok ? `Deleted ${track.artist} — ${track.title}.` : (body.error ?? "Couldn't delete."));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="a-input max-w-[320px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artist, title or slug…"
          aria-label="Search tracks"
        />
        <div className="flex gap-2">
          <button type="button" className="a-chip" aria-pressed={sort === "artist"} onClick={() => setSort("artist")}>
            By artist
          </button>
          <button type="button" className="a-chip" aria-pressed={sort === "used"} onClick={() => setSort("used")}>
            Most used
          </button>
        </div>
        <span className="a-muted text-[12.5px]">
          {rows.length} of {tracks.length}
        </span>
      </div>

      {message ? (
        <p className="a-ink2 text-[13px]" role="status">
          {message}
        </p>
      ) : null}

      {editing ? (
        <TrackEditPanel
          trackId={editing}
          onClose={() => setEditing(null)}
          onSaved={({ merged }) => {
            setMessage(merged ? "Merged into the existing track." : "Track updated everywhere it appears.");
            router.refresh();
          }}
        />
      ) : null}

      <Card padded={false}>
        {rows.length === 0 ? (
          <Empty
            title={tracks.length === 0 ? "No tracks yet" : "Nothing matches that search"}
            body={
              tracks.length === 0
                ? "Tracks are created from the volume editor — paste a platform link and they appear here."
                : "Try the artist's name, or part of the title."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th className="w-12">
                    <span className="sr-only">Artwork</span>
                  </th>
                  <th>Track</th>
                  <th className="w-[20%]">Volumes</th>
                  <th className="w-[10%]">Peak</th>
                  <th className="w-[16%] text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.artwork?.url ? (
                        <Image src={t.artwork.url} alt="" width={32} height={32} className="size-8 object-cover" />
                      ) : (
                        <span className="a-bg-rule block size-8" aria-hidden="true" />
                      )}
                    </td>
                    <td className="max-w-0">
                      <span className="block truncate text-[13.5px]">{t.artist}</span>
                      <span className="a-muted block truncate text-[11.5px]">{t.title}</span>
                    </td>
                    <td className="a-ink2 text-[13px]">
                      {t.volumes.length === 0
                        ? "—"
                        : t.volumes.map((n) => `Vol. ${String(n).padStart(2, "0")}`).join(", ")}
                    </td>
                    <td className="a-num a-ink2 text-[13px]">
                      {t.peak === null ? "—" : String(t.peak).padStart(2, "0")}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="a-btn a-btn-ghost" onClick={() => setEditing(t.id)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={cn("a-btn", t.volumes.length > 0 ? "a-btn-ghost" : "a-btn-danger")}
                          disabled={t.volumes.length > 0}
                          onClick={() => remove(t)}
                          title={
                            t.volumes.length > 0
                              ? `Used by ${t.volumes.map((n) => `Vol. ${String(n).padStart(2, "0")}`).join(", ")} — remove it from those volumes first.`
                              : undefined
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="a-muted text-[12px]">
        Deleting is blocked while a volume still references the track — a deleted track takes its
        chart history with it, and movement in every later volume would change.{" "}
        <Link href="/admin/rotation" className="underline">
          Back to volumes
        </Link>
      </p>
    </div>
  );
}

export default TrackLibrary;
