import "server-only";
import dbConnect from "./db";
import DailyStat from "@/models/DailyStat";
import AnalyticsEvent from "@/models/AnalyticsEvent";
import { dayKey } from "./utils";

export type RangeDays = 7 | 30 | 90;

export type DashboardSeriesPoint = {
  date: string;
  views: number;
  uniques: number;
};

export type DashboardData = {
  range: RangeDays;
  totals: {
    views: number;
    uniques: number;
    sessions: number;
    avgSecondsOnPage: number;
    viewsChangePct: number | null;
  };
  series: DashboardSeriesPoint[];
  topPaths: { path: string; views: number; uniques: number; avgSeconds: number }[];
  referrers: { referrer: string; count: number }[];
  devices: { mobile: number; tablet: number; desktop: number };
  countries: { country: string; count: number }[];
  clicks: { label: string; count: number }[];
  today: { views: number; uniques: number };
  /** Core Web Vitals from real readers, p75 — see the note in getDashboardData. */
  vitals: {
    name: string;
    p75: number;
    samples: number;
    goodPct: number;
    poorPct: number;
  }[];
};

function keysForRange(days: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }
  return keys;
}

/** Sums `count` into `target`, keyed by whichever label field the rows carry. */
function accumulate(
  target: Map<string, number>,
  rows: readonly { count?: number | null }[],
  pick: (row: never) => string | null | undefined,
) {
  for (const row of rows) {
    const key = pick(row as never) ?? "";
    target.set(key, (target.get(key) ?? 0) + (row.count ?? 0));
  }
}

/**
 * Reads DailyStat, not raw events — ~30 documents for a month's view instead of
 * scanning millions. Only today's figures are computed live.
 */
export async function getDashboardData(range: RangeDays): Promise<DashboardData> {
  await dbConnect();

  const keys = keysForRange(range);
  const previousKeys = keysForRange(range * 2).slice(0, range);
  const today = dayKey();

  const [stats, previousStats] = await Promise.all([
    DailyStat.find({ date: { $in: keys } }).lean(),
    DailyStat.find({ date: { $in: previousKeys } }).select("views").lean(),
  ]);

  const byDate = new Map(stats.map((s) => [s.date, s]));

  const series: DashboardSeriesPoint[] = keys.map((date) => {
    const s = byDate.get(date);
    return { date, views: s?.views ?? 0, uniques: s?.uniques ?? 0 };
  });

  const totals = stats.reduce(
    (acc, s) => {
      acc.views += s.views ?? 0;
      acc.uniques += s.uniques ?? 0;
      acc.sessions += s.sessions ?? 0;
      acc.duration += s.totalDurationSeconds ?? 0;
      return acc;
    },
    { views: 0, uniques: 0, sessions: 0, duration: 0 },
  );

  const previousViews = previousStats.reduce((a, s) => a + (s.views ?? 0), 0);
  const viewsChangePct =
    previousViews > 0 ? Math.round(((totals.views - previousViews) / previousViews) * 100) : null;

  // Merge the per-dimension breakdowns across every day in range.
  const pathViews = new Map<string, number>();
  const pathUniques = new Map<string, number>();
  const pathDuration = new Map<string, number>();
  const referrers = new Map<string, number>();
  const countries = new Map<string, number>();
  const clicks = new Map<string, number>();
  const devices = { mobile: 0, tablet: 0, desktop: 0 };

  for (const s of stats) {
    for (const p of s.byPath ?? []) {
      if (!p.path) continue;
      pathViews.set(p.path, (pathViews.get(p.path) ?? 0) + (p.views ?? 0));
      pathUniques.set(p.path, (pathUniques.get(p.path) ?? 0) + (p.uniques ?? 0));
      pathDuration.set(p.path, (pathDuration.get(p.path) ?? 0) + (p.totalDuration ?? 0));
    }
    accumulate(referrers, s.byReferrer ?? [], (r: { referrer?: string }) => r.referrer);
    accumulate(countries, s.byCountry ?? [], (c: { country?: string }) => c.country);
    accumulate(clicks, s.clicks ?? [], (c: { label?: string }) => c.label);

    devices.mobile += s.byDevice?.mobile ?? 0;
    devices.tablet += s.byDevice?.tablet ?? 0;
    devices.desktop += s.byDevice?.desktop ?? 0;
  }

  const topPaths = [...pathViews.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([path, views]) => ({
      path,
      views,
      uniques: pathUniques.get(path) ?? 0,
      avgSeconds: views > 0 ? Math.round((pathDuration.get(path) ?? 0) / views) : 0,
    }));

  const sortDesc = (m: Map<string, number>, limit: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

  // Today is the only thing computed from raw events.
  const start = new Date(`${today}T00:00:00.000Z`);
  const [todayAgg] = await AnalyticsEvent.aggregate<{ views: number; uniques: number }>([
    { $match: { type: "pageview", ts: { $gte: start } } },
    { $group: { _id: null, views: { $sum: 1 }, visitors: { $addToSet: "$visitorHash" } } },
    { $project: { views: 1, uniques: { $size: "$visitors" } } },
  ]);

  /**
   * Vitals across the range. p75 values from separate days cannot be averaged
   * into a true p75, so each metric is weighted by that day's sample count —
   * the honest approximation available from rollups, and the reason `samples`
   * is surfaced next to it in the UI.
   */
  const vitalAgg = new Map<
    string,
    { weighted: number; samples: number; good: number; poor: number }
  >();
  for (const day of stats) {
    for (const v of day.vitals ?? []) {
      if (!v?.name || !v.samples) continue;
      const acc = vitalAgg.get(v.name) ?? { weighted: 0, samples: 0, good: 0, poor: 0 };
      acc.weighted += (v.p75 ?? 0) * v.samples;
      acc.samples += v.samples;
      acc.good += v.good ?? 0;
      acc.poor += v.poor ?? 0;
      vitalAgg.set(v.name, acc);
    }
  }

  const VITAL_ORDER = ["LCP", "INP", "CLS", "TTFB", "FCP"];
  const vitals = VITAL_ORDER.flatMap((name) => {
    const v = vitalAgg.get(name);
    if (!v || v.samples === 0) return [];
    const p75 = v.weighted / v.samples;
    return [{
      name,
      p75: name === "CLS" ? Math.round(p75 * 1000) / 1000 : Math.round(p75),
      samples: v.samples,
      goodPct: Math.round((v.good / v.samples) * 100),
      poorPct: Math.round((v.poor / v.samples) * 100),
    }];
  });

  return {
    range,
    totals: {
      views: totals.views,
      uniques: totals.uniques,
      sessions: totals.sessions,
      avgSecondsOnPage: totals.views > 0 ? Math.round(totals.duration / totals.views) : 0,
      viewsChangePct,
    },
    series,
    topPaths,
    referrers: sortDesc(referrers, 10).map(([referrer, count]) => ({ referrer, count })),
    devices,
    countries: sortDesc(countries, 8).map(([country, count]) => ({ country, count })),
    clicks: sortDesc(clicks, 10).map(([label, count]) => ({ label, count })),
    today: { views: todayAgg?.views ?? 0, uniques: todayAgg?.uniques ?? 0 },
    vitals,
  };
}
