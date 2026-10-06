import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import EventModel from "@/models/Event";
import { eventSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
import { saveWithSlug } from "@/lib/slug-server";
import { revalidateSlugChange } from "@/lib/slug-revalidate";
import { badRequest, ok, serverError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async () => {
    try {
      await dbConnect();
      const docs = await EventModel.find().sort({ startDate: -1 }).limit(200).lean();
      return ok({ events: docs.map((d) => ({ ...d, id: String(d._id) })) });
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

    const parsed = eventSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    try {
      await dbConnect();
      // The address is made here, from the title — never trusted from the browser.
      const { slug: requested, ...data } = parsed.data;
      const doc = new EventModel(data);
      const result = await saveWithSlug(EventModel, doc, {
        type: "event",
        requested,
        wasLive: false,
        followsTitle: true,
      });
      if (result.error) return badRequest(result.error);
      revalidateSlugChange("event", doc.slug);
      return ok({ id: String(doc._id), slug: doc.slug }, { status: 201 });
    } catch {
      return serverError("Couldn't save the event.");
    }
  });
}
