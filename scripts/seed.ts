import { config } from "dotenv";

// Next.js reads .env.local automatically; standalone scripts do not.
config({ path: ".env.local" });
config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Article from "../models/Article";
import EventModel from "../models/Event";
import Submission from "../models/Submission";
import AdminUser from "../models/AdminUser";
import AnalyticsEvent from "../models/AnalyticsEvent";
import DailyStat from "../models/DailyStat";
import { SEED_ARTICLES, SEED_EVENTS, SEED_SUBMISSIONS } from "./seed-data";
import { PLACEHOLDER_IMAGES, NEUTRAL_BLUR } from "../data/seed-content";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

/** Deterministic PRNG so re-seeding produces the same demo numbers. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedArticles() {
  await Article.deleteMany({});

  for (const [i, a] of SEED_ARTICLES.entries()) {
    await Article.create({
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      content: a.content,
      coverImage: {
        url: PLACEHOLDER_IMAGES.articles[i % PLACEHOLDER_IMAGES.articles.length],
        publicId: "",
        alt: a.title,
        width: 1400,
        height: 1750,
        blurDataURL: NEUTRAL_BLUR,
      },
      category: a.category,
      tags: a.tags,
      author: a.author,
      status: "published",
      featured: a.featured,
      publishedAt: daysAgo(a.daysAgo),
    });
  }

  console.log(`  articles      ${SEED_ARTICLES.length}`);
}

async function seedEvents() {
  await EventModel.deleteMany({});

  for (const [i, e] of SEED_EVENTS.entries()) {
    const start = new Date(Date.now() + e.daysFromNow * DAY_MS);
    await EventModel.create({
      title: e.title,
      slug: e.slug,
      description: e.description,
      poster: {
        url: PLACEHOLDER_IMAGES.events[i % PLACEHOLDER_IMAGES.events.length],
        publicId: "",
        alt: e.title,
        width: 1200,
        height: 1600,
      },
      startDate: start,
      endDate: null,
      venue: e.venue,
      city: e.city,
      ticketUrl: e.ticketUrl,
      featured: e.featured,
    });
  }

  const upcoming = SEED_EVENTS.filter((e) => e.daysFromNow >= 0).length;
  console.log(`  events        ${SEED_EVENTS.length} (${upcoming} upcoming, ${SEED_EVENTS.length - upcoming} past)`);
}

async function seedSubmissions() {
  await Submission.deleteMany({});

  for (const [i, s] of SEED_SUBMISSIONS.entries()) {
    await Submission.create({
      name: s.name,
      email: s.email,
      igHandle: s.igHandle,
      discipline: s.discipline,
      workUrl: s.workUrl,
      image: s.hasImage
        ? {
            url: PLACEHOLDER_IMAGES.submissions[i % PLACEHOLDER_IMAGES.submissions.length],
            publicId: "",
          }
        : { url: "", publicId: "" },
      note: s.note,
      status: s.status,
      createdAt: daysAgo(s.daysAgo),
    });
  }

  console.log(`  submissions   ${SEED_SUBMISSIONS.length}`);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("  admin         skipped (set ADMIN_EMAIL and ADMIN_PASSWORD)");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await AdminUser.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), passwordHash, name: "Blacktivity" },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  console.log(`  admin         ${email}`);
}

/**
 * 90 days of believable traffic: a growth curve, Instagram-weighted referrers,
 * mobile-heavy devices. Written straight to DailyStat (what the dashboard
 * reads) plus a slice of raw events for the last two days so the live counter
 * and today's numbers have something real to compute from.
 */
async function seedAnalytics() {
  await DailyStat.deleteMany({});
  await AnalyticsEvent.deleteMany({});

  const rand = mulberry32(20250902);

  const paths = [
    "/",
    ...SEED_ARTICLES.map((a) => `/articles/${a.slug}`),
    "/articles",
    "/events",
    "/creatives",
    "/submit",
    "/about",
  ];

  const referrers = [
    ["instagram.com", 0.52],
    ["", 0.24], // direct
    ["google.com", 0.12],
    ["t.co", 0.05],
    ["linkedin.com", 0.04],
    ["wa.me", 0.03],
  ] as const;

  const countries = [
    ["GH", 0.58],
    ["NG", 0.13],
    ["GB", 0.09],
    ["US", 0.09],
    ["ZA", 0.05],
    ["DE", 0.03],
    ["CI", 0.03],
  ] as const;

  const labels = [
    "home-submit-cta",
    "submission-submit",
    "share-whatsapp",
    "share-x",
    "share-copy",
    "event-tickets",
    "creative-instagram",
    "footer-instagram",
  ];

  const docs = [];

  for (let d = 89; d >= 0; d--) {
    const date = daysAgo(d);
    const key = dayKey(date);

    // Growth curve: ~40 views/day at the start, ~380 by now, plus a weekend
    // dip and day-to-day noise.
    const progress = (89 - d) / 89;
    const base = 40 + Math.pow(progress, 1.6) * 340;
    const weekday = date.getUTCDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.78 : 1;
    const noise = 0.82 + rand() * 0.36;
    const views = Math.max(8, Math.round(base * weekendFactor * noise));

    const uniques = Math.round(views * (0.62 + rand() * 0.1));
    const sessions = Math.round(uniques * (1.08 + rand() * 0.12));

    // Average 95s on page, weighted a little higher on article pages.
    const totalDurationSeconds = Math.round(views * (70 + rand() * 55));

    // Split views across paths, front-loading the home page and articles.
    const weights = paths.map((p, i) => (p === "/" ? 3.2 : i <= 8 ? 1.6 : 0.7));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    let assigned = 0;
    const byPath = paths.map((path, i) => {
      const share = weights[i]! / weightSum;
      const pathViews =
        i === paths.length - 1 ? Math.max(0, views - assigned) : Math.round(views * share);
      assigned += pathViews;
      return {
        path,
        views: pathViews,
        uniques: Math.round(pathViews * 0.7),
        totalDuration: Math.round(pathViews * (60 + rand() * 90)),
      };
    });

    const byReferrer = referrers.map(([referrer, share]) => ({
      referrer,
      count: Math.round(sessions * share * (0.85 + rand() * 0.3)),
    }));

    const byCountry = countries.map(([country, share]) => ({
      country,
      count: Math.round(uniques * share * (0.85 + rand() * 0.3)),
    }));

    // Mobile-heavy, as the Instagram audience would be.
    const mobile = Math.round(views * (0.68 + rand() * 0.08));
    const tablet = Math.round(views * 0.05);

    const clicks = labels
      .map((label) => ({
        label,
        count: Math.round(views * (0.01 + rand() * 0.035)),
      }))
      .filter((c) => c.count > 0);

    docs.push({
      date: key,
      views,
      uniques,
      sessions,
      totalDurationSeconds,
      byPath: byPath.filter((p) => p.views > 0),
      byReferrer: byReferrer.filter((r) => r.count > 0),
      byDevice: { mobile, tablet, desktop: Math.max(0, views - mobile - tablet) },
      byCountry: byCountry.filter((c) => c.count > 0),
      clicks,
    });
  }

  await DailyStat.insertMany(docs);

  // A slice of raw events for today, so the live counter is not empty.
  const raw = [];
  const todayViews = 60;
  for (let i = 0; i < todayViews; i++) {
    const path = pick(paths, rand);
    const sessionId = `seed-${Math.floor(rand() * 1e9).toString(36)}`;
    const visitorHash = `seedhash-${Math.floor(rand() * 1e6)}`;
    const ts = new Date(Date.now() - Math.floor(rand() * 12 * 60 * 60 * 1000));

    raw.push({
      type: "pageview",
      sessionId,
      visitorHash,
      path,
      referrer: pick(referrers.map(([r]) => r), rand),
      meta: {},
      device: rand() < 0.7 ? "mobile" : rand() < 0.9 ? "desktop" : "tablet",
      country: pick(countries.map(([c]) => c), rand),
      ts,
    });

    // A couple of heartbeats per view.
    for (let h = 0; h < 1 + Math.floor(rand() * 3); h++) {
      raw.push({
        type: "heartbeat",
        sessionId,
        visitorHash,
        path,
        referrer: "",
        meta: { seconds: 15 },
        device: "mobile",
        country: "GH",
        ts: new Date(ts.getTime() + (h + 1) * 15000),
      });
    }
  }

  await AnalyticsEvent.insertMany(raw);

  console.log(`  analytics     90 daily rollups + ${raw.length} raw events (today)`);
}

/**
 * DESTRUCTIVE-RUN GUARD.
 *
 * Every seed step begins with deleteMany({}). Pointed at a production cluster
 * that silently destroys real content, so the script refuses to run against a
 * remote host unless you opt in explicitly with SEED_ALLOW_REMOTE=yes.
 */
function assertSafeTarget(uri: string) {
  // Strip scheme, then any credentials, then the path — mongodb:// URIs are not
  // parseable by URL(), so this is done by hand.
  const host = uri
    .replace(/^mongodb(\+srv)?:\/\//, "")
    .replace(/^[^@/]*@/, "")
    .split(/[/?]/)[0]!
    .toLowerCase();

  const isLocal = /^(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])(:\d+)?$/.test(host);

  if (isLocal || process.env.SEED_ALLOW_REMOTE === "yes") return;

  console.error(
    [
      "",
      `REFUSING TO SEED: ${host} is not a local database.`,
      "",
      "This script deletes every article, event, submission and analytics",
      "document before inserting placeholders. Running it against a live",
      "cluster destroys real content.",
      "",
      "If you are certain, re-run with:  SEED_ALLOW_REMOTE=yes npm run seed",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");

  assertSafeTarget(uri);

  await mongoose.connect(uri);
  console.log("Seeding Blacktivity…\n");

  await seedArticles();
  await seedEvents();
  await seedSubmissions();
  await seedAdmin();
  await seedAnalytics();

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
