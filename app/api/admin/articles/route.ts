import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import { articleSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { saveWithSlug } from "@/lib/slug-server";
import { revalidateSlugChange } from "@/lib/slug-revalidate";
import { badRequest, ok, serverError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (status === "draft" || status === "published") filter.status = status;
    if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    try {
      await dbConnect();
      const docs = await Article.find(filter)
        .select("title slug status category featured readingTime publishedAt updatedAt coverImage")
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean();

      return ok({ articles: docs.map((d) => ({ ...d, id: String(d._id) })) });
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

    const parsed = articleSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    try {
      await dbConnect();

      // The address is made here, from the title — never trusted from the browser.
      const { slug: requested, ...data } = parsed.data;
      const doc = new Article(data);
      const result = await saveWithSlug(Article, doc, {
        type: "article",
        requested,
        wasLive: false,
        followsTitle: true,
      });
      if (result.error) return badRequest(result.error);
      if (doc.status === "published") revalidateSlugChange("article", doc.slug);
      return ok({ id: String(doc._id), slug: doc.slug }, { status: 201 });
    } catch {
      return serverError("Couldn't save the article.");
    }
  });
}
