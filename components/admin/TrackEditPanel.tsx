"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ImageUploader from "./ImageUploader";
import type { TrackLite } from "./rotation-types";
import { PLATFORMS, type PlatformKey } from "@/lib/rotation";

/**
 * EDIT A TRACK.
 *
 * A track could previously be added and removed but never corrected: a wrong
 * artist name, a typo'd title, or artwork that resolved badly from oEmbed was
 * permanent. This is the fix.
 *
 * TWO THINGS THIS PANEL EXISTS TO MAKE VISIBLE.
 *
 * 1. Tracks are ONE SHARED COLLECTION — that is what makes movement and
 *    weeks-on-chart work. So fixing a typo while editing Vol. 07 also rewrites
 *    Vol. 04. That is correct behaviour, and the panel says so up front with
 *    the volumes named and linked. Deliberately NO confirmation dialog: a clear
 *    statement is enough, and a dialog on every edit is worse than the problem.
 *
 * 2. A rename can land on an existing track's slug. That is not an error — it
 *    is almost always the owner fixing a duplicate oEmbed created under a
 *    slightly different artist string. The panel offers a MERGE and shows what
 *    will be repointed before it runs.
 */
type Usage = {
  volumes: { id: string; number: number; slug: string; status: string; lists: string[] }[];
  peak: number | null;
  references: number;
};

type Collision = {
  slug: string;
  keep: { id: string; artist: string; title: string };
  willRepoint: number;
  volumes: { number: number; slug: string; lists: string[] }[];
};

const volLabel = (n: number) => `Vol. ${String(n).padStart(2, "0")}`;

export function TrackEditPanel({
  trackId,
  onClose,
  onSaved,
}: {
  trackId: string;
  onClose: () => void;
  /** Fired after a save or a merge, so the caller can refresh its rows. */
  onSaved: (result: { merged: boolean; keptId: string }) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [collision, setCollision] = useState<Collision | null>(null);

  const [fields, setFields] = useState({
    artist: "",
    title: "",
    featuring: "",
    releaseDate: "",
    origin: "",
    links: {} as Partial<Record<PlatformKey, string>>,
  });
  const [artwork, setArtwork] = useState<{
    url: string;
    publicId: string;
    alt: string;
    width: number;
    height: number;
    blurDataURL: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/admin/tracks/${trackId}`);
        const body = (await res.json()) as { track?: TrackLite & { artwork: any }; usage?: Usage };
        if (cancelled || !body.track) return;

        const t = body.track;
        setFields({
          artist: t.artist,
          title: t.title,
          featuring: (t.featuring ?? []).join(", "),
          releaseDate: t.releaseDate ? String(t.releaseDate).slice(0, 10) : "",
          origin: t.origin ?? "",
          links: t.links ?? {},
        });
        setArtwork(
          t.artwork
            ? {
                url: t.artwork.url,
                publicId: t.artwork.publicId ?? "",
                alt: t.artwork.alt ?? "",
                width: t.artwork.width ?? 400,
                height: t.artwork.height ?? 400,
                blurDataURL: t.artwork.blurDataURL ?? "",
              }
            : null,
        );
        setUsage(body.usage ?? null);
      } catch {
        if (!cancelled) setStatus("Couldn't load the track.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trackId]);

  async function save(merge = false) {
    if (!fields.artist.trim() || !fields.title.trim()) {
      setStatus("Artist and title are required.");
      return;
    }
    if (!artwork?.url) {
      setStatus("Artwork is required.");
      return;
    }

    setPending(true);
    setStatus("");

    try {
      const res = await fetch(`/api/admin/tracks/${trackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merge,
          artist: fields.artist.trim(),
          title: fields.title.trim(),
          featuring: fields.featuring.split(",").map((s) => s.trim()).filter(Boolean),
          releaseDate: fields.releaseDate,
          origin: fields.origin.trim(),
          links: fields.links,
          artwork,
        }),
      });

      const body = (await res.json()) as Record<string, any>;

      if (res.status === 409 && body.collision) {
        setCollision({
          slug: body.slug,
          keep: body.keep,
          willRepoint: body.willRepoint,
          volumes: body.volumes ?? [],
        });
        return;
      }

      if (!res.ok) {
        setStatus(body.error ?? "Couldn't save the track.");
        return;
      }

      onSaved({ merged: Boolean(body.merged), keptId: body.keptId ?? trackId });
      onClose();
    } catch {
      setStatus("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="a-card p-5">
        <p className="a-muted text-[13px]">Loading track…</p>
      </div>
    );
  }

  return (
    <div className="a-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="a-meta">Edit track</p>
          <p className="text-[14px] font-medium">
            {fields.artist} — {fields.title}
          </p>
        </div>
        <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Close</span>
        </button>
      </div>

      {/* The shared-collection consequence, stated before the edit. */}
      {usage && usage.volumes.length > 0 ? (
        <p className="a-ink2 mb-5 border-l-2 a-border-ink pl-3 text-[13px]">
          This track appears in {usage.volumes.length}{" "}
          {usage.volumes.length === 1 ? "volume" : "volumes"}. Changes apply to all of them.{" "}
          {usage.volumes.map((v, i) => (
            <span key={v.id}>
              {i > 0 ? ", " : ""}
              <Link href={`/admin/rotation/${v.id}`} className="underline">
                {volLabel(v.number)}
              </Link>
            </span>
          ))}
          {usage.peak !== null ? ` · peak ${String(usage.peak).padStart(2, "0")}` : ""}
        </p>
      ) : (
        <p className="a-muted mb-5 text-[13px]">This track is not used by any volume yet.</p>
      )}

      {/* The merge offer, shown instead of an error. */}
      {collision ? (
        <div className="mb-5 border a-border p-4">
          <p className="text-[13.5px] font-medium">
            That name already belongs to another track.
          </p>
          <p className="a-ink2 mt-1.5 text-[13px]">
            <span className="a-num">{collision.keep.artist}</span> — {collision.keep.title} already
            uses the slug <code>{collision.slug}</code>. This is almost always the same song saved
            twice.
          </p>
          <p className="a-ink2 mt-2 text-[13px]">
            Merging repoints <strong>{collision.willRepoint}</strong>{" "}
            {collision.willRepoint === 1 ? "reference" : "references"} onto the existing track and
            deletes this one
            {collision.volumes.length > 0
              ? `: ${collision.volumes.map((v) => `${volLabel(v.number)} (${v.lists.join(", ")})`).join(", ")}`
              : ""}
            . Chart positions are renumbered so no gap is left behind.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="a-btn a-btn-primary"
              disabled={pending}
              onClick={() => save(true)}
            >
              Merge into the existing track
            </button>
            <button type="button" className="a-btn a-btn-ghost" onClick={() => setCollision(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="a-meta">Artist</span>
          <input
            className="a-input"
            value={fields.artist}
            onChange={(e) => setFields((f) => ({ ...f, artist: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="a-meta">Title</span>
          <input
            className="a-input"
            value={fields.title}
            onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="a-meta">Featuring (comma separated)</span>
          <input
            className="a-input"
            value={fields.featuring}
            onChange={(e) => setFields((f) => ({ ...f, featuring: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="a-meta">Release date</span>
          <input
            type="date"
            className="a-input"
            value={fields.releaseDate}
            onChange={(e) => setFields((f) => ({ ...f, releaseDate: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="a-meta">Origin</span>
          <input
            className="a-input"
            value={fields.origin}
            onChange={(e) => setFields((f) => ({ ...f, origin: e.target.value }))}
          />
        </label>
      </div>

      <fieldset className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <legend className="a-meta mb-2">Links</legend>
        {PLATFORMS.map((platform) => (
          <label key={platform.key} className="flex flex-col gap-1.5">
            <span className="a-meta">{platform.label}</span>
            <input
              className="a-input"
              placeholder="https://"
              value={fields.links[platform.key] ?? ""}
              onChange={(e) =>
                setFields((f) => ({ ...f, links: { ...f.links, [platform.key]: e.target.value } }))
              }
            />
          </label>
        ))}
      </fieldset>

      <div className="mt-4">
        {/* Replacing this destroys the previous Cloudinary asset server-side. */}
        <ImageUploader
          label="Artwork (square)"
          value={
            artwork
              ? {
                  url: artwork.url,
                  publicId: artwork.publicId,
                  alt: artwork.alt,
                  width: artwork.width,
                  height: artwork.height,
                  blurDataURL: artwork.blurDataURL,
                }
              : null
          }
          onChange={(image) =>
            setArtwork(
              image
                ? {
                    url: image.url,
                    publicId: image.publicId ?? "",
                    alt: image.alt,
                    width: image.width,
                    height: image.height,
                    blurDataURL: image.blurDataURL ?? "",
                  }
                : null,
            )
          }
        />
        <p className="a-muted mt-2 text-[12px]">
          Replacing the artwork deletes the previous file from Cloudinary.
        </p>
      </div>

      {status ? (
        <p className="a-ink2 mt-4 text-[13px]" role="alert">
          ↳ {status}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2 border-t a-border pt-4">
        <button
          type="button"
          className="a-btn a-btn-primary"
          disabled={pending}
          onClick={() => save(false)}
        >
          {pending ? "Saving…" : "Save track"}
        </button>
        <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default TrackEditPanel;
