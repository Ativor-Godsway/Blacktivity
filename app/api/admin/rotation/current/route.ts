import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { currentRotationSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { badRequest, ok, serverError } from "@/lib/api";
import { revalidateRotation } from "@/lib/rotation-revalidate";
import { allVolumeSlugs } from "@/lib/rotation-admin";
import { rotationProblem, saveCurrentRotation } from "@/lib/rotation-current";

export const runtime = "nodejs";

/** SAVE CHANGES on /admin/rotation. Saving publishes; there is no draft. */
export async function PUT(req: NextRequest) {
  return withAuth(async () => {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return badRequest("Malformed request body.");
    }

    const parsed = currentRotationSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    const problem = rotationProblem(parsed.data);
    if (problem) return badRequest(problem);

    try {
      await dbConnect();
      const saved = await saveCurrentRotation(parsed.data);
      // Every volume page, not just this one: movement is derived across them.
      revalidateRotation(await allVolumeSlugs());
      return ok({ ok: true, created: saved.created });
    } catch {
      return serverError("Couldn't save the rotation.");
    }
  });
}
