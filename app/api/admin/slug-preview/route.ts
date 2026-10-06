import type { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import EventModel from "@/models/Event";
import { withAuth } from "@/lib/guard";
import { badRequest, ok, serverError } from "@/lib/api";
import { baseSlug, isValidSlug, normaliseSlug, SLUG_BASE, type SlugType } from "@/lib/slug";
import { isSlugFree, uniqueSlug } from "@/lib/slug-server";
import { absoluteUrl } from "@/lib/utils";

export const runtime = "nodejs";

const MODELS = { article: Article, event: EventModel } as const;

/**
 * The web address a save WOULD produce — Revision 27 §2.5. Two modes:
 *
 *   ?type=article&title=…[&id=…]   the address made from a title (the preview)
 *   ?type=article&slug=…[&id=…]    is an address the owner typed free?
 *
 * Advisory only: the save recomputes it, because the browser's answer can be
 * stale by the time the owner presses Save.
 */
export async function GET(req: NextRequest) {
  return withAuth(async () => {
    const q = req.nextUrl.searchParams;
    const type = q.get("type") as SlugType | null;
    if (type !== "article" && type !== "event") return badRequest("Unknown type.");
    const id = q.get("id");
    const excludeId = id && isValidObjectId(id) ? id : undefined;

    try {
      await dbConnect();
      const Model = MODELS[type];
      const typed = q.get("slug");

      if (typed !== null) {
        const slug = normaliseSlug(typed);
        const valid = isValidSlug(slug);
        const free = valid && (await isSlugFree(Model, slug, excludeId));
        return ok({ slug, valid, free, url: absoluteUrl(`${SLUG_BASE[type]}/${slug}`) });
      }

      const slug = await uniqueSlug(Model, baseSlug(type, q.get("title") ?? ""), { excludeId });
      return ok({ slug, url: absoluteUrl(`${SLUG_BASE[type]}/${slug}`) });
    } catch {
      return serverError();
    }
  });
}
