import type { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import { articleSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { saveWithSlug } from "@/lib/slug-server";
import { revalidateSlugChange } from "@/lib/slug-revalidate";
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

      const doc = await Article.findById(id);
      if (!doc) return notFound("Article not found.");

      // Revision 27 §2.4: a draft that has never been public follows its title;
      // once published the address is locked, and only an explicit change from
      // "Change web address" moves it (keeping the old one for a 308).
      // Assign then save() so the pre-save hook recomputes readingTime and
      // stamps publishedAt on first publish.
      const wasLive = Boolean(doc.publishedAt);
      // Only the fields the request actually sent. `.partial()` still applies
      // each field's .default() in Zod 4, so a PATCH of just { title } used to
      // come back with status: "draft" — silently unpublishing the article.
      const sent = new Set(Object.keys(json as object));
      const { slug: requested, ...all } = parsed.data;
      const data = Object.fromEntries(Object.entries(all).filter(([k]) => sent.has(k)));
      doc.set(data);
      const result = await saveWithSlug(Article, doc, {
        type: "article",
        requested,
        wasLive,
        followsTitle: !wasLive && !doc.slugSetByOwner && doc.isModified("title"),
      });
      if (result.error) return badRequest(result.error);
      if (result.oldSlug || doc.status === "published") revalidateSlugChange("article", doc.slug, result.oldSlug);

      return ok({ id: String(doc._id), slug: doc.slug });
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
