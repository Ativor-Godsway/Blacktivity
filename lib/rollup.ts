import "server-only";
import dbConnect from "./db";
import AnalyticsEvent from "@/models/AnalyticsEvent";
import DailyStat from "@/models/DailyStat";

/**
 * Aggregates one day of raw events into a single DailyStat document.
 *
 * This is the whole reason the dashboard stays fast: it reads ~30 documents for
 * a month instead of scanning millions of raw events. The raw collection then
 * expires on its own via the TTL index.
 */
export async function rollupDay(dayKey: string) {
  await dbConnect();

  const start = new Date(`${dayKey}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const range = { ts: { $gte: start, $lt: end } };

  const [totals] = await AnalyticsEvent.aggregate<{
    views: number;
    uniques: number;
    sessions: number;
  }>([
    { $match: { ...range, type: "pageview" } },
    {
      $group: {
        _id: null,
        views: { $sum: 1 },
        visitors: { $addToSet: "$visitorHash" },
        sessionIds: { $addToSet: "$sessionId" },
      },
    },
    {
      $project: {
        views: 1,
        uniques: { $size: "$visitors" },
        sessions: { $size: "$sessionIds" },
      },
    },
  ]);

  const [duration] = await AnalyticsEvent.aggregate<{ total: number }>([
    { $match: { ...range, type: "heartbeat" } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$meta.seconds", 0] } } } },
  ]);

  const byPathViews = await AnalyticsEvent.aggregate<{
    _id: string;
    views: number;
    uniques: number;
  }>([
    { $match: { ...range, type: "pageview" } },
    { $group: { _id: "$path", views: { $sum: 1 }, visitors: { $addToSet: "$visitorHash" } } },
    { $project: { views: 1, uniques: { $size: "$visitors" } } },
    { $sort: { views: -1 } },
    { $limit: 100 },
  ]);

  const byPathDuration = await AnalyticsEvent.aggregate<{ _id: string; total: number }>([
    { $match: { ...range, type: "heartbeat" } },
    { $group: { _id: "$path", total: { $sum: { $ifNull: ["$meta.seconds", 0] } } } },
  ]);

  const durationByPath = new Map(byPathDuration.map((d) => [d._id, d.total]));

  const byReferrer = await AnalyticsEvent.aggregate<{ _id: string; count: number }>([
    { $match: { ...range, type: "pageview" } },
    { $group: { _id: "$referrer", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  const byDeviceRaw = await AnalyticsEvent.aggregate<{ _id: string; count: number }>([
    { $match: { ...range, type: "pageview" } },
    { $group: { _id: "$device", count: { $sum: 1 } } },
  ]);

  const byCountry = await AnalyticsEvent.aggregate<{ _id: string; count: number }>([
    { $match: { ...range, type: "pageview" } },
    { $group: { _id: "$country", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  const clicks = await AnalyticsEvent.aggregate<{ _id: string; count: number }>([
    { $match: { ...range, type: "click" } },
    { $group: { _id: "$meta.label", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  /**
   * Core Web Vitals as p75 — the percentile the metric is actually scored
   * against. Computed in Mongo by collecting each metric's values, sorting,
   * and indexing, so the raw events never leave the database.
   */
  const vitals = await AnalyticsEvent.aggregate<{
    _id: string;
    p75: number;
    samples: number;
    good: number;
    needsImprovement: number;
    poor: number;
  }>([
    { $match: { ...range, type: "vital", "meta.name": { $ne: null } } },
    { $sort: { "meta.value": 1 } },
    {
      $group: {
        _id: "$meta.name",
        values: { $push: "$meta.value" },
        samples: { $sum: 1 },
        good: { $sum: { $cond: [{ $eq: ["$meta.rating", "good"] }, 1, 0] } },
        needsImprovement: {
          $sum: { $cond: [{ $eq: ["$meta.rating", "needs-improvement"] }, 1, 0] },
        },
        poor: { $sum: { $cond: [{ $eq: ["$meta.rating", "poor"] }, 1, 0] } },
      },
    },
    {
      $project: {
        samples: 1,
        good: 1,
        needsImprovement: 1,
        poor: 1,
        p75: {
          $arrayElemAt: [
            "$values",
            {
              $min: [
                { $subtract: ["$samples", 1] },
                { $floor: { $multiply: [0.75, "$samples"] } },
              ],
            },
          ],
        },
      },
    },
  ]);

  const deviceCount = (name: string) => byDeviceRaw.find((d) => d._id === name)?.count ?? 0;

  const doc = {
    date: dayKey,
    views: totals?.views ?? 0,
    uniques: totals?.uniques ?? 0,
    sessions: totals?.sessions ?? 0,
    totalDurationSeconds: duration?.total ?? 0,
    byPath: byPathViews.map((p) => ({
      path: p._id,
      views: p.views,
      uniques: p.uniques,
      totalDuration: durationByPath.get(p._id) ?? 0,
    })),
    byReferrer: byReferrer.map((r) => ({ referrer: r._id ?? "", count: r.count })),
    byDevice: {
      mobile: deviceCount("mobile"),
      tablet: deviceCount("tablet"),
      desktop: deviceCount("desktop"),
    },
    byCountry: byCountry
      .filter((c) => c._id)
      .map((c) => ({ country: c._id, count: c.count })),
    clicks: clicks.filter((c) => c._id).map((c) => ({ label: c._id, count: c.count })),
    vitals: vitals
      .filter((v) => v._id)
      .map((v) => ({
        name: v._id,
        p75: v.p75 ?? 0,
        samples: v.samples,
        good: v.good,
        needsImprovement: v.needsImprovement,
        poor: v.poor,
      })),
  };

  await DailyStat.findOneAndUpdate({ date: dayKey }, doc, {
    upsert: true,
    returnDocument: "after",
  });

  return doc;
}

/** The previous UTC day — what the 02:00 cron run aggregates. */
export function previousDayKey(now = new Date()): string {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
