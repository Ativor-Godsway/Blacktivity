import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import { chartVolumeSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { badRequest, ok, serverError } from "@/lib/api";
import { volumeSlug } from "@/lib/rotation";
import { revalidateRotation } from "@/lib/rotation-revalidate";
import { allVolumeSlugs } from "@/lib/rotation-admin";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async () => {
    try {
      await dbConnect();
      const docs = await ChartVolume.find().sort({ number: -1 }).limit(200).lean();
      return ok({ volumes: docs.map((d) => ({ ...d, id: String(d._id) })) });
    } catch {
      return serverError();
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return badRequest("Malformed request body.");
    }

    const parsed = chartVolumeSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    // The slug is derived, never typed: `vol-07` for number 7, always.
    const slug = volumeSlug(parsed.data.number);

    try {
      await dbConnect();
      const clash = await ChartVolume.exists({ $or: [{ number: parsed.data.number }, { slug }] });
      if (clash) return badRequest(`Volume ${parsed.data.number} already exists.`);

      const created = await ChartVolume.create({
        ...parsed.data,
        slug,
        publishedAt:
          parsed.data.status === "published" ? (parsed.data.publishedAt ?? new Date()) : null,
      });

      if (created.status === "published") revalidateRotation(await allVolumeSlugs());

      return ok({ id: String(created._id), slug }, { status: 201 });
    } catch {
      return serverError("Couldn't save the volume.");
    }
  });
}
