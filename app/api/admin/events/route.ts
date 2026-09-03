import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import EventModel from "@/models/Event";
import { eventSchema } from "@/lib/validation";
import { withAuth } from "@/lib/guard";
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
      const exists = await EventModel.exists({ slug: parsed.data.slug });
      if (exists) return badRequest("That slug is already taken.");

      const created = await EventModel.create(parsed.data);
      return ok({ id: String(created._id) }, { status: 201 });
    } catch {
      return serverError("Couldn't save the event.");
    }
  });
}
