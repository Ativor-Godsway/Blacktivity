import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AnalyticsEvent from "@/models/AnalyticsEvent";
import { parseTrackEvents } from "@/lib/validation";
import { getClientIp } from "@/lib/rate-limit";
import {
  computeVisitorHash,
  detectCountry,
  detectDevice,
  isBot,
  normaliseReferrer,
} from "@/lib/analytics-server";

export const runtime = "nodejs";

/** Always 204 — tracking must never slow or break a real response. */
const NO_CONTENT = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") ?? "";

  // Discard bots before anything touches the database.
  if (isBot(userAgent)) return NO_CONTENT();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NO_CONTENT();
  }

  const events = parseTrackEvents(json);
  if (events.length === 0) return NO_CONTENT();

  const ip = getClientIp(req.headers);
  const visitorHash = computeVisitorHash(ip, userAgent);
  const device = detectDevice(userAgent);
  const country = detectCountry(req.headers);
  const siteHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").hostname;
    } catch {
      return "localhost";
    }
  })();

  const docs = events.map((e) => ({
    type: e.type,
    sessionId: e.sessionId,
    visitorHash,
    path: e.path.split("?")[0]!.slice(0, 300),
    referrer: normaliseReferrer(e.referrer, siteHost),
    meta: e.meta ?? {},
    device,
    country,
    ts: e.ts ? new Date(e.ts) : new Date(),
  }));

  try {
    await dbConnect();
    await AnalyticsEvent.insertMany(docs, { ordered: false });
  } catch {
    // Swallow — a failed write must never surface to the visitor.
  }

  return NO_CONTENT();
}
