import type { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import { submissionStatusSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { badRequest, notFound, ok, serverError } from "@/lib/api";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

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

    const parsed = submissionStatusSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    try {
      await dbConnect();
      const doc = await Submission.findByIdAndUpdate(
        id,
        { status: parsed.data.status },
        { returnDocument: "after" },
      ).lean();

      if (!doc) return notFound("Submission not found.");
      return ok({ id: String(doc._id), status: doc.status });
    } catch {
      return serverError();
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();
      const deleted = await Submission.findByIdAndDelete(id).lean();
      if (!deleted) return notFound("Submission not found.");
      return ok({ ok: true });
    } catch {
      return serverError();
    }
  });
}
