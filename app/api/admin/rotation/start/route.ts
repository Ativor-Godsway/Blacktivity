import dbConnect from "@/lib/db";
import { withAuth } from "@/lib/guard";
import { ok, serverError } from "@/lib/api";
import { revalidateRotation } from "@/lib/rotation-revalidate";
import { allVolumeSlugs } from "@/lib/rotation-admin";
import { startNewRotation } from "@/lib/rotation-current";

export const runtime = "nodejs";

/** START A NEW ROTATION — archives the current lists and opens the next one. */
export async function POST() {
  return withAuth(async () => {
    try {
      await dbConnect();
      const started = await startNewRotation();
      revalidateRotation(await allVolumeSlugs());
      return ok({ ok: true, number: started.number }, { status: 201 });
    } catch {
      return serverError("Couldn't start a new rotation.");
    }
  });
}
