import { z } from "zod";
import { isAllowedImageUrl } from "@/lib/image-hosts";
import { ARTICLE_CATEGORIES, ARTICLE_STATUSES, DISCIPLINES, SUBMISSION_STATUSES } from "./constants";

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((v) => v ?? "");

export const submissionSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.string().trim().email("That email doesn't look right"),
  igHandle: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ?? "").replace(/^@/, "")),
  discipline: z.enum(DISCIPLINES, { message: "Pick a discipline" }),
  workUrl: optionalUrl,
  image: z
    .object({ url: z.string().url(), publicId: z.string() })
    .optional(),
  note: z.string().trim().max(500, "Keep it under 500 characters").optional().default(""),
  /**
   * Honeypot — real people never fill this in. Deliberately permissive so a
   * filled value passes validation and can be discarded silently in the route;
   * a 400 here would tell the bot its submission failed.
   */
  website: z.string().max(200).optional(),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const imageSchema = z.object({
  // Only hosts next/image is configured for — anything else throws on the
  // public route, which is how a pasted Pinterest URL took an article down.
  url: z
    .string()
    .url()
    .refine((u) => isAllowedImageUrl(u), {
      message: "That image host isn't allowed. Upload the file instead.",
    }),
  publicId: z.string().default(""),
  alt: z.string().default(""),
  width: z.number().int().positive().default(1200),
  height: z.number().int().positive().default(1600),
  blurDataURL: z.string().default(""),
  focalX: z.number().min(0).max(100).default(50),
  focalY: z.number().min(0).max(100).default(50),
});

export const articleSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  excerpt: z.string().trim().min(10).max(200),
  content: z.unknown().refine((v) => !!v && typeof v === "object", "Content is required"),
  coverImage: imageSchema,
  category: z.enum(ARTICLE_CATEGORIES),
  tags: z.array(z.string().trim().max(40)).max(12).default([]),
  author: z.object({
    name: z.string().trim().min(2).max(80),
    igHandle: z.string().trim().max(40).default(""),
  }),
  status: z.enum(ARTICLE_STATUSES).default("draft"),
  featured: z.boolean().default(false),
});

export const eventSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10).max(4000),
  poster: imageSchema.omit({ blurDataURL: true }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  venue: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).default("Accra"),
  ticketUrl: optionalUrl,
  featured: z.boolean().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "At least 8 characters"),
});

export const submissionStatusSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES),
});

/** The Core Web Vitals collected from real readers. */
export const WEB_VITALS = ["LCP", "INP", "CLS", "TTFB", "FCP"] as const;
export type WebVitalName = (typeof WEB_VITALS)[number];

export const trackEventSchema = z.object({
  type: z.enum(["pageview", "heartbeat", "click", "vital"]),
  sessionId: z.string().min(8).max(64),
  path: z.string().min(1).max(300),
  referrer: z.string().max(300).optional().default(""),
  meta: z
    .object({
      label: z.string().max(80).optional(),
      seconds: z.number().int().min(0).max(3600).optional(),
      // Vitals. `value` is milliseconds for every metric except CLS, which is
      // a unitless score — hence the generous upper bound rather than an int.
      name: z.enum(WEB_VITALS).optional(),
      value: z.number().min(0).max(600_000).optional(),
      rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
    })
    .optional()
    .default({}),
  ts: z.number().int().optional(),
});

/**
 * Events are validated INDIVIDUALLY, not as an all-or-nothing batch. A single
 * malformed event used to fail the whole payload, silently discarding every
 * valid pageview alongside it — which is exactly what happened the first time a
 * vital fired before the path was known.
 */
export const trackBatchSchema = z.object({
  events: z.array(z.unknown()).min(1).max(50),
});

export function parseTrackEvents(input: unknown) {
  const batch = trackBatchSchema.safeParse(input);
  if (!batch.success) return [];

  const ok: z.infer<typeof trackEventSchema>[] = [];
  for (const raw of batch.data.events) {
    const parsed = trackEventSchema.safeParse(raw);
    if (parsed.success) ok.push(parsed.data);
  }
  return ok;
}

/* --- ROTATION ------------------------------------------------------------ */

/**
 * Artwork is re-hosted through Cloudinary at small dimensions — never a
 * platform CDN URL, which breaks and bypasses the image pipeline entirely.
 * `isAllowedImageUrl` is what enforces that here.
 */
export const artworkSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => isAllowedImageUrl(u), {
      message: "Artwork must be served from Cloudinary — re-upload it.",
    }),
  publicId: z.string().default(""),
  alt: z.string().default(""),
  width: z.number().int().positive().default(400),
  height: z.number().int().positive().default(400),
  blurDataURL: z.string().default(""),
});

const platformLinks = z.object({
  audiomack: optionalUrl,
  youtube: optionalUrl,
  spotify: optionalUrl,
  boomplay: optionalUrl,
  appleMusic: optionalUrl,
  soundcloud: optionalUrl,
});

export const trackSchema = z.object({
  title: z.string().trim().min(1).max(160),
  artist: z.string().trim().min(1).max(120),
  featuring: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
  artwork: artworkSchema,
  releaseDate: z.coerce.date(),
  origin: z.string().trim().max(60).default(""),
  // prefault, not default: the empty object is parsed so every platform key
  // comes out present-and-empty rather than undefined.
  links: platformLinks.prefault({}),
});

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Not a valid id");

const listEntry = z.object({
  track: objectId,
  note: z.string().trim().max(120).default(""),
});

const playlistSet = z.object({
  spotify: optionalUrl,
  audiomack: optionalUrl,
  youtube: optionalUrl,
});

export const chartVolumeSchema = z.object({
  number: z.number().int().min(1).max(999),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.coerce.date().nullable().optional(),
  intro: z.string().trim().max(240).default(""),
  coverImage: artworkSchema.nullable().optional(),

  newMusic: z.array(listEntry).max(30).default([]),
  chart: z
    .array(listEntry.extend({ position: z.number().int().min(1).max(10) }))
    .max(10)
    .default([])
    // A duplicated position silently reorders the page and breaks movement in
    // the NEXT volume too, so it is rejected at the boundary.
    .refine(
      (rows) => new Set(rows.map((r) => r.position)).size === rows.length,
      "Two entries share a chart position.",
    ),

  curation: z
    .object({
      curator: z.object({
        name: z.string().trim().min(1).max(80),
        igHandle: z.string().trim().max(40).default(""),
        discipline: z.string().trim().max(60).default(""),
        photo: artworkSchema.nullable().optional(),
        statement: z.string().trim().max(400).default(""),
      }),
      tracks: z.array(listEntry).max(30).default([]),
    })
    .nullable()
    .optional(),

  playlists: z
    .object({
      newMusic: playlistSet.prefault({}),
      chart: playlistSet.prefault({}),
      curation: playlistSet.prefault({}),
    })
    .prefault({ newMusic: {}, chart: {}, curation: {} }),
});

/** The paste field: one URL, resolved server-side. */
export const oembedSchema = z.object({
  url: z.string().url("Paste a full track URL."),
});
