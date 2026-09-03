import type { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import { articleSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { badRequest, notFound, ok, serverError } from "@/lib/api";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();
      const doc = await Article.findById(id).lean();
      if (!doc) return notFound("Article not found.");
      return ok({ article: { ...doc, id: String(doc._id) } });
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

    const parsed = articleSchema.partial().safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    try {
      await dbConnect();

      if (parsed.data.slug) {
        const clash = await Article.exists({ slug: parsed.data.slug, _id: { $ne: id } });
        if (clash) return badRequest("That slug is already taken.");
      }

      const doc = await Article.findById(id);
      if (!doc) return notFound("Article not found.");

      // Assign then save() so the pre-save hook recomputes readingTime and
      // stamps publishedAt on first publish.
      doc.set(parsed.data);
      await doc.save();

      return ok({ id: String(doc._id) });
    } catch {
      return serverError("Couldn't update the article.");
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();
      const deleted = await Article.findByIdAndDelete(id).lean();
      if (!deleted) return notFound("Article not found.");
      return ok({ ok: true });
    } catch {
      return serverError();
    }
  });
}
