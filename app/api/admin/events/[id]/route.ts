import type { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import EventModel from "@/models/Event";
import { eventSchema } from "@/lib/validation";
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
      const doc = await EventModel.findById(id).lean();
      if (!doc) return notFound("Event not found.");
      return ok({ event: { ...doc, id: String(doc._id) } });
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

    const parsed = eventSchema.partial().safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    try {
      await dbConnect();

      const doc = await EventModel.findById(id);
      if (!doc) return notFound("Event not found.");

      // Events are public from the moment they're created, so the address is
      // locked from then on: retitling never moves it. Only "Change web
      // address" does, and the old one keeps working (308).
      // Only the fields the request actually sent. `.partial()` still applies
      // each field's .default() in Zod 4, so a PATCH of just { title } used to
      // come back with status: "draft" — silently unpublishing the article.
      const sent = new Set(Object.keys(json as object));
      const { slug: requested, ...all } = parsed.data;
      const data = Object.fromEntries(Object.entries(all).filter(([k]) => sent.has(k)));
      doc.set(data);
      const result = await saveWithSlug(EventModel, doc, {
        type: "event",
        requested,
        wasLive: true,
        followsTitle: false,
      });
      if (result.error) return badRequest(result.error);
      revalidateSlugChange("event", doc.slug, result.oldSlug);

      return ok({ id: String(doc._id), slug: doc.slug });
    } catch {
      return serverError("Couldn't update the event.");
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return badRequest("Invalid id.");

    try {
      await dbConnect();
      const deleted = await EventModel.findByIdAndDelete(id).lean();
      if (!deleted) return notFound("Event not found.");
      return ok({ ok: true });
    } catch {
      return serverError();
    }
  });
}
