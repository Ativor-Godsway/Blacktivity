import type { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import Track from "@/models/Track";
import { trackSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { badRequest, notFound, ok, serverError } from "@/lib/api";
import { trackSlug } from "@/lib/rotation";
import { trackUsage, mergeTracks } from "@/lib/rotation-admin";
import { destroyAsset } from "@/lib/cloudinary";
import { revalidateRotation } from "@/lib/rotation-revalidate";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** The track plus where it is used — the panel needs both to open. */
export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();
      const doc = await Track.findById(id).lean();
      if (!doc) return notFound("Track not found.");
      const usage = await trackUsage(id);
      return ok({ track: { ...doc, id: String(doc._id) }, usage });
    } catch {
      return serverError();
    }
  });
}

/**
 * Edit a track. EDITING IT EDITS IT EVERYWHERE — see trackUsage; the panel
 * states how many volumes are affected before the owner commits.
 *
 * A rename can recompute the slug onto an existing track. That is not an error
 * to reject: it is almost always the owner fixing a duplicate, so the collision
 * is reported with a preview, and a second call with `merge: true` performs it.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return badRequest("Malformed request body.");
    }

    const { merge, ...rest } = (json ?? {}) as Record<string, unknown> & { merge?: boolean };
    const parsed = trackSchema.safeParse(rest);
    if (!parsed.success) return badRequest(parsed.error);

    try {
      await dbConnect();

      const doc = await Track.findById(id);
      if (!doc) return notFound("Track not found.");

      // Every volume showing this track is about to be wrong — collected before
      // the write, and before a merge deletes the references it is read from.
      const usageBefore = await trackUsage(id);

      const nextSlug = trackSlug(parsed.data.artist, parsed.data.title);
      const clash =
        nextSlug === doc.slug ? null : await Track.findOne({ slug: nextSlug, _id: { $ne: id } }).lean();

      if (clash) {
        if (!merge) {
          // Not a rejection — a preview of the merge on offer.
          const usage = usageBefore;
          return ok(
            {
              collision: true,
              slug: nextSlug,
              keep: {
                id: String(clash._id),
                artist: clash.artist,
                title: clash.title,
              },
              willRepoint: usage.references,
              volumes: usage.volumes.map((v) => ({ number: v.number, slug: v.slug, lists: v.lists })),
            },
            { status: 409 },
          );
        }

        const affected = usageBefore.volumes.map((v) => v.slug);
        const merged = await mergeTracks(id, String(clash._id));
        revalidateRotation(affected);
        return ok({ merged: true, keptId: String(clash._id), ...merged });
      }

      /**
       * Replacing the artwork destroys the previous Cloudinary asset. Without
       * this the account fills with orphans nobody can identify — the public id
       * is the only handle on them and it is about to be overwritten.
       *
       * Only assets we uploaded are touched: a seed placeholder has no publicId.
       */
      const previousPublicId = doc.artwork?.publicId ?? "";
      const artworkChanged = previousPublicId && previousPublicId !== parsed.data.artwork.publicId;

      doc.set({ ...parsed.data, slug: nextSlug });
      await doc.save();

      if (artworkChanged) await destroyAsset(previousPublicId);

      revalidateRotation(usageBefore.volumes.map((v) => v.slug));
      return ok({ id: String(doc._id), slug: nextSlug });
    } catch {
      return serverError("Couldn't update the track.");
    }
  });
}

/**
 * Deleting a track is BLOCKED while any volume references it, and names them.
 * A deleted track takes its chart history with it: every volume that charted it
 * loses the row, and movement in every later volume silently changes.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();

      const doc = await Track.findById(id).lean();
      if (!doc) return notFound("Track not found.");

      const usage = await trackUsage(id);
      if (usage.volumes.length > 0) {
        return badRequest(
          `Still used by ${usage.volumes.map((v) => `Vol. ${String(v.number).padStart(2, "0")}`).join(", ")}. Remove it from those volumes first.`,
        );
      }

      await Track.findByIdAndDelete(id);
      if (doc.artwork?.publicId) await destroyAsset(doc.artwork.publicId);

      return ok({ ok: true });
    } catch {
      return serverError();
    }
  });
}
