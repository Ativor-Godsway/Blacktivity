"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ImageUploader from "./ImageUploader";
import type { TrackLite } from "./rotation-types";
import { PLATFORMS, type PlatformKey } from "@/lib/rotation";

/**
 * ADDING A TRACK IS A PASTE, NOT A FORM.
 *
 * Paste a Spotify, YouTube or Audiomack URL, the server resolves it through
 * that platform's public oEmbed endpoint, and the fields come back filled for
 * the owner to confirm or correct.
 *
 * The manual form is always underneath, already open. That is deliberate: if
 * the endpoint is slow, rate-limited, blocked or the machine is offline, the
 * resolve returns `resolved: false` and the owner just keeps typing. Nobody is
 * ever blocked on someone else's API.
 *
 * SAVING REUSES AN EXISTING TRACK. `/api/admin/tracks` matches on
 * `artist--title` and returns the existing document rather than creating a
 * second one — a duplicate would break movement and split the archive history
 * for one song across two records.
 */
type Resolved = {
  resolved: boolean;
  reason?: string;
  artist?: string;
  title?: string;
  artwork?: { url: string; publicId: string; width: number; height: number } | null;
  links?: Partial<Record<PlatformKey, string>>;
  artworkNote?: string | null;
};

const BLANK = {
  artist: "",
  title: "",
  featuring: "",
  releaseDate: "",
  origin: "",
  links: {} as Partial<Record<PlatformKey, string>>,
};

export function TrackPicker({
  onAdd,
  onClose,
}: {
  onAdd: (track: TrackLite, reused: boolean) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"add" | "existing">("add");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState(BLANK);
  const [artwork, setArtwork] = useState<TrackLite["artwork"]>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackLite[]>([]);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab !== "existing") return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/tracks?q=${encodeURIComponent(query)}`);
        const body = (await res.json()) as { tracks?: TrackLite[] };
        setResults(body.tracks ?? []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, tab]);

  async function resolve() {
    if (!url.trim()) return;
    setPending(true);
    setStatus("Resolving…");

    try {
      const res = await fetch("/api/admin/rotation/oembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = (await res.json()) as Resolved & { error?: string };

      if (!res.ok) {
        setStatus(body.error ?? "Couldn't resolve that link — fill the fields in below.");
        return;
      }

      setFields((f) => ({
        ...f,
        artist: body.artist || f.artist,
        title: body.title || f.title,
        links: { ...f.links, ...(body.links ?? {}) },
      }));

      if (body.artwork) {
        setArtwork({
          url: body.artwork.url,
          width: body.artwork.width,
          height: body.artwork.height,
          alt: `${body.artist ?? ""} — ${body.title ?? ""}`.trim(),
        });
      }

      setStatus(
        body.resolved
          ? body.artworkNote ?? "Matched — check the fields before saving."
          : body.reason ?? "No match. Fill the fields in below.",
      );
      firstField.current?.focus();
    } catch {
      // Offline, or the request never left the machine.
      setStatus("Couldn't reach the resolver. Fill the fields in below — nothing is lost.");
    } finally {
      setPending(false);
    }
  }

  async function save() {
    if (!fields.artist.trim() || !fields.title.trim()) {
      setStatus("Artist and title are required.");
      return;
    }
    if (!artwork?.url) {
      setStatus("Artwork is required — upload a square if the resolver couldn't fetch one.");
      return;
    }
    if (!fields.releaseDate) {
      setStatus("A release date is required — New Music groups by it.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/admin/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist: fields.artist.trim(),
          title: fields.title.trim(),
          featuring: fields.featuring
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          artwork: {
            url: artwork.url,
            publicId: "",
            alt: artwork.alt || `${fields.artist} — ${fields.title}`,
            width: artwork.width,
            height: artwork.height,
            blurDataURL: artwork.blurDataURL ?? "",
          },
          releaseDate: fields.releaseDate,
          origin: fields.origin.trim(),
          links: fields.links,
        }),
      });

      const body = (await res.json()) as {
        id?: string;
        reused?: boolean;
        track?: TrackLite & { _id?: string };
        error?: string;
      };

      if (!res.ok || !body.id || !body.track) {
        setStatus(body.error ?? "Couldn't save the track.");
        return;
      }

      onAdd({ ...body.track, id: body.id }, Boolean(body.reused));
      setFields(BLANK);
      setArtwork(null);
      setUrl("");
      setStatus(body.reused ? "That track already existed — reused it." : "");
    } catch {
      setStatus("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="a-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" className="a-chip" aria-pressed={tab === "add"} onClick={() => setTab("add")}>
            Paste a link
          </button>
          <button
            type="button"
            className="a-chip"
            aria-pressed={tab === "existing"}
            onClick={() => setTab("existing")}
          >
            Existing track
          </button>
        </div>
        <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
          Done
        </button>
      </div>

      {tab === "existing" ? (
        <div>
          <label className="a-meta" htmlFor="track-search">
            Search by artist or title
          </label>
          <input
            id="track-search"
            className="a-input mt-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kwabena…"
          />
          <ul className="mt-3 max-h-64 overflow-y-auto">
            {results.length === 0 ? (
              <li className="a-muted py-3 text-[13px]">Nothing matches yet.</li>
            ) : (
              results.map((track) => (
                <li key={track.id} className="border-b a-border last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-2 text-left hover:a-bg-hover"
                    onClick={() => onAdd(track, true)}
                  >
                    {track.artwork?.url ? (
                      <Image
                        src={track.artwork.url}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 flex-none object-cover"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]">{track.artist}</span>
                      <span className="a-muted block truncate text-[12px]">{track.title}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label className="a-meta" htmlFor="paste-url">
              Spotify, YouTube or Audiomack link
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="paste-url"
                className="a-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://audiomack.com/…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void resolve();
                  }
                }}
              />
              <button type="button" className="a-btn a-btn-ghost" disabled={pending} onClick={resolve}>
                {pending ? "…" : "Resolve"}
              </button>
            </div>
          </div>

          {status ? (
            <p className="a-ink2 text-[12.5px]" role="status">
              {status}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="a-meta">Artist</span>
              <input
                ref={firstField}
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
                placeholder="Accra"
                onChange={(e) => setFields((f) => ({ ...f, origin: e.target.value }))}
              />
            </label>
          </div>

          <fieldset className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <legend className="a-meta mb-2">Links</legend>
            {PLATFORMS.map((platform) => (
              <label key={platform.key} className="flex flex-col gap-1.5">
                <span className="a-meta">{platform.label}</span>
                <input
                  className="a-input"
                  value={fields.links[platform.key] ?? ""}
                  placeholder="https://"
                  onChange={(e) =>
                    setFields((f) => ({ ...f, links: { ...f.links, [platform.key]: e.target.value } }))
                  }
                />
              </label>
            ))}
          </fieldset>

          {/* Re-hosted through Cloudinary at small dimensions — a platform CDN
              URL would break and bypass the image pipeline. */}
          <ImageUploader
            label="Artwork (square)"
            value={
              artwork
                ? {
                    url: artwork.url,
                    publicId: "",
                    alt: artwork.alt,
                    width: artwork.width,
                    height: artwork.height,
                    blurDataURL: artwork.blurDataURL ?? "",
                  }
                : null
            }
            onChange={(image) =>
              setArtwork(
                image
                  ? {
                      url: image.url,
                      alt: image.alt,
                      width: image.width,
                      height: image.height,
                      blurDataURL: image.blurDataURL,
                    }
                  : null,
              )
            }
          />

          <div>
            <button type="button" className="a-btn a-btn-primary" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Add track"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackPicker;
