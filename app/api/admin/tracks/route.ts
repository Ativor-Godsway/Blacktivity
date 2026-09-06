import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Track from "@/models/Track";
import { trackSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { badRequest, ok, serverError } from "@/lib/api";
import { trackSlug } from "@/lib/rotation";

export const runtime = "nodejs";

/** Type-ahead for the volume editor: the last tracks added, or a search. */
export async function GET(req: NextRequest) {
  return withAuth(async () => {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

    try {
      await dbConnect();
      const filter = q
        ? {
            // Escaped — a pasted "(Remix)" would otherwise be an invalid regex
            // and 500 the whole picker.
            $or: [
              { artist: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
              { title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            ],
          }
        : {};

      const docs = await Track.find(filter).sort({ releaseDate: -1 }).limit(40).lean();
      return ok({ tracks: docs.map((d) => ({ ...d, id: String(d._id) })) });
    } catch {
      return serverError();
    }
  });
}

/**
 * CREATE OR REUSE — the single most important correctness detail in the admin.
 *
 * `slug` is `normalise(artist)--normalise(title)`. If a document with that slug
 * already exists it is RETURNED, not duplicated: a second document for the same
 * song silently breaks movement (the previous volume points at the other id)
 * and puts two separate histories in the archive for one record.
 *
 * The response says which happened so the editor can tell the owner.
 */
export async function POST(req: NextRequest) {
  return withAuth(async () => {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return badRequest("Malformed request body.");
    }

    const parsed = trackSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    const slug = trackSlug(parsed.data.artist, parsed.data.title);

    try {
      await dbConnect();

      const existing = await Track.findOne({ slug }).lean();
      if (existing) {
        return ok({ id: String(existing._id), slug, reused: true, track: { ...existing, id: String(existing._id) } });
      }

      const created = await Track.create({ ...parsed.data, slug });
      return ok(
        { id: String(created._id), slug, reused: false, track: { ...created.toObject(), id: String(created._id) } },
        { status: 201 },
      );
    } catch {
      return serverError("Couldn't save the track.");
    }
  });
}
