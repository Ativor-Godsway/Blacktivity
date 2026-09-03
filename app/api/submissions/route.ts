import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import { submissionSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { badRequest, ok, serverError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest("Malformed request body.");
  }

  const parsed = submissionSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error);

  // Honeypot: silently accept so the bot believes it succeeded.
  if (parsed.data.website) {
    return ok({ ok: true }, { status: 201 });
  }

  const ip = getClientIp(req.headers);
  const limit = rateLimit(`submit:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return Response.json(
      { error: "You've sent a few already — try again a little later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    await dbConnect();
    const { website: _honeypot, ...data } = parsed.data;
    await Submission.create({ ...data, status: "pending" });
    return ok({ ok: true }, { status: 201 });
  } catch {
    return serverError("We couldn't save that. Please try again.");
  }
}
