import type { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import { chartVolumeSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { badRequest, notFound, ok, serverError } from "@/lib/api";
import { volumeSlug } from "@/lib/rotation";
import { revalidateRotation } from "@/lib/rotation-revalidate";
import { allVolumeSlugs } from "@/lib/rotation-admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();
      const doc = await ChartVolume.findById(id).lean();
      if (!doc) return notFound("Volume not found.");
      return ok({ volume: { ...doc, id: String(doc._id) } });
    } catch {
      return serverError();
    }
  });
}

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

    const parsed = chartVolumeSchema.partial().safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    try {
      await dbConnect();
      const doc = await ChartVolume.findById(id);
      if (!doc) return notFound("Volume not found.");

      const wasPublished = doc.status === "published";

      if (parsed.data.number !== undefined && parsed.data.number !== doc.number) {
        const clash = await ChartVolume.exists({
          _id: { $ne: id },
          $or: [{ number: parsed.data.number }, { slug: volumeSlug(parsed.data.number) }],
        });
        if (clash) return badRequest(`Volume ${parsed.data.number} already exists.`);
        doc.slug = volumeSlug(parsed.data.number);
      }

      doc.set(parsed.data);

      // Stamped on first publish and then left alone — re-publishing an edit
      // must not move a volume's date.
      if (doc.status === "published" && !doc.publishedAt) doc.publishedAt = new Date();
      if (doc.status === "draft") doc.publishedAt = null;

      await doc.save();

      // Un-publishing has to revalidate too, or the volume stays visible.
      // Editing ANY volume can change movement in every volume above it, so
      // the whole set is invalidated rather than just the one that was saved.
      if (doc.status === "published" || wasPublished) revalidateRotation(await allVolumeSlugs());

      return ok({ id: String(doc._id), slug: doc.slug });
    } catch {
      return serverError("Couldn't update the volume.");
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();
      const deleted = await ChartVolume.findByIdAndDelete(id).lean();
      if (!deleted) return notFound("Volume not found.");
      // Tracks are deliberately NOT deleted: they carry chart history for every
      // other volume, and a track document outliving a volume is the point.
      revalidateRotation(await allVolumeSlugs());
      return ok({ ok: true });
    } catch {
      return serverError();
    }
  });
}
