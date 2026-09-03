import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import { articleSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
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

      const exists = await Article.exists({ slug: parsed.data.slug });
      if (exists) return badRequest("That slug is already taken.");

      const created = await Article.create(parsed.data);
      return ok({ id: String(created._id) }, { status: 201 });
    } catch {
      return serverError("Couldn't save the article.");
    }
  });
}
