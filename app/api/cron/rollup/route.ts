import type { NextRequest } from "next/server";
import { rollupDay, previousDayKey } from "@/lib/rollup";
import { ok, serverError, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron hits this at 02:00 UTC daily (see vercel.json). Hobby allows one
 * run per day, which is exactly what a nightly rollup needs.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return unauthorized("Invalid cron secret.");
  }

  // ?date=YYYY-MM-DD lets a missed day be re-run by hand.
  const requested = req.nextUrl.searchParams.get("date");
  const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(requested ?? "") ? requested! : previousDayKey();

  try {
    const result = await rollupDay(dayKey);
    return ok({ date: dayKey, views: result.views, uniques: result.uniques });
  } catch {
    return serverError("Rollup failed.");
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
