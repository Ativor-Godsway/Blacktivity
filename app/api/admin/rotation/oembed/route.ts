import type { NextRequest } from "next/server";
import cloudinary, { CLOUDINARY_FOLDER, isCloudinaryConfigured } from "@/lib/cloudinary";
import { oembedSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { badRequest, ok } from "@/lib/api";
import type { PlatformKey } from "@/lib/rotation";

export const runtime = "nodejs";

/**
 * PASTE A URL, GET A TRACK.
 *
 * Adding a track is a paste, not a six-field form. This resolves the URL
 * SERVER-SIDE against the platform's public oEmbed endpoint — never a
 * client-side fetch to a third party, which would put someone else's origin in
 * the reader's… and in this case the owner's… browser.
 *
 * IT MUST DEGRADE. If the endpoint is slow, rate-limited or down, this returns
 * `resolved: false` with a reason and a 200, and the editor drops straight to
 * the manual form. The owner is never blocked on someone else's API — which is
 * also why the timeout is 4s and not "whatever fetch decides".
 */
const TIMEOUT_MS = 4_000;

const PROVIDERS: {
  key: PlatformKey;
  match: RegExp;
  endpoint: (url: string) => string;
}[] = [
  {
    key: "audiomack",
    match: /(^|\.)audiomack\.com$/i,
    endpoint: (u) => `https://audiomack.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  },
  {
    key: "youtube",
    match: /(^|\.)(youtube\.com|youtu\.be)$/i,
    endpoint: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  },
  {
    key: "spotify",
    match: /(^|\.)spotify\.com$/i,
    endpoint: (u) => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`,
  },
];

type OEmbed = { title?: string; author_name?: string; thumbnail_url?: string };

/**
 * Platform titles are not a schema. YouTube gives "Artist - Title (Official
 * Video)", Spotify gives the track name with the artist in author_name, and
 * Audiomack gives either. This is a best guess that the owner confirms or
 * corrects — it is never saved unreviewed.
 */
function splitTitle(raw: string, author: string): { artist: string; title: string } {
  const cleaned = raw
    .replace(/\((official|lyric|audio|visualizer|music)[^)]*\)/gi, "")
    .replace(/\[(official|lyric|audio|visualizer|music)[^\]]*\]/gi, "")
    .trim();

  const parts = cleaned.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0]!.trim(), title: parts.slice(1).join(" - ").trim() };
  }

  return { artist: author.replace(/\s*-\s*Topic$/i, "").trim(), title: cleaned };
}

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return badRequest("Malformed request body.");
    }

    const parsed = oembedSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    let target: URL;
    try {
      target = new URL(parsed.data.url);
    } catch {
      return badRequest("That isn't a full URL.");
    }

    const provider = PROVIDERS.find((p) => p.match.test(target.hostname));
    if (!provider) {
      return ok({
        resolved: false,
        reason: "Paste a Spotify, YouTube or Audiomack link — or fill the fields in by hand.",
      });
    }

    let data: OEmbed;
    try {
      const res = await fetch(provider.endpoint(target.toString()), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      data = (await res.json()) as OEmbed;
    } catch {
      return ok({
        resolved: false,
        reason: `${provider.key} didn't answer in ${TIMEOUT_MS / 1000}s. Fill the fields in by hand — the link is kept.`,
        links: { [provider.key]: target.toString() },
      });
    }

    const { artist, title } = splitTitle(data.title ?? "", data.author_name ?? "");

    /**
     * The thumbnail is RE-UPLOADED to Cloudinary at 400px max edge — enough for
     * the 64px slot at 3× — never stored as a platform CDN URL. Those URLs
     * expire, and `next/image` is configured for Cloudinary and Unsplash only,
     * so a stored platform URL would throw on the public route.
     */
    let artwork: { url: string; publicId: string; width: number; height: number } | null = null;

    if (data.thumbnail_url && isCloudinaryConfigured()) {
      try {
        const upload = await cloudinary.uploader.upload(data.thumbnail_url, {
          folder: `${CLOUDINARY_FOLDER}/rotation`,
          transformation: [{ width: 400, height: 400, crop: "limit" }],
          timeout: TIMEOUT_MS,
        });
        artwork = {
          url: upload.secure_url,
          publicId: upload.public_id,
          width: upload.width,
          height: upload.height,
        };
      } catch {
        // Everything else resolved; the owner uploads the square by hand.
        artwork = null;
      }
    }

    return ok({
      resolved: true,
      artist,
      title,
      artwork,
      links: { [provider.key]: target.toString() },
      artworkNote: artwork ? null : "Couldn't fetch the artwork — upload a square yourself.",
    });
  });
}
