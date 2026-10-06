import type { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import { withAuth } from "@/lib/guard";
import { badRequest, notFound, ok, serverError } from "@/lib/api";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Read-only — past rotations are not editable (Revision 27 §1.3). */
export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();
      const doc = await ChartVolume.findById(id).lean();
      if (!doc) return notFound("Not found.");
      return ok({ volume: { ...doc, id: String(doc._id) } });
    } catch {
      return serverError();
    }
  });
}
