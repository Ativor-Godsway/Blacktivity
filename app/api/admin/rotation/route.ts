import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import { withAuth } from "@/lib/guard";
import { ok, serverError } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Read-only. Rotation is written through exactly two routes since Revision 27:
 * PUT ./current (the Save button) and POST ./start (Start a new rotation).
 * Creating, editing or deleting an arbitrary volume is no longer offered.
 */
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
