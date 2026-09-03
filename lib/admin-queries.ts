import dbConnect from "@/lib/db";
import Article from "@/models/Article";
import EventModel from "@/models/Event";
import Submission from "@/models/Submission";

export type QueueItem = {
  id: string;
  kind: "submission" | "article" | "event";
  title: string;
  meta: string;
  status: string;
  href: string;
};

/**
 * The work queue: what actually needs attention today. This is the top of the
 * dashboard because a publication with eight articles is a queue to work, not a
 * dataset to analyse.
 */
export async function getNeedsAttention(): Promise<QueueItem[]> {
  await dbConnect();

  const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [pending, drafts, soon] = await Promise.all([
    Submission.find({ status: "pending" }).sort({ createdAt: -1 }).limit(6).lean(),
    Article.find({ status: "draft" }).sort({ updatedAt: -1 }).limit(6).lean(),
    EventModel.find({ startDate: { $gte: new Date(), $lte: weekOut } })
      .sort({ startDate: 1 })
      .limit(6)
      .lean(),
  ]);

  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return [
    ...pending.map((s) => ({
      id: String(s._id),
      kind: "submission" as const,
      title: s.name,
      meta: `${s.discipline} · submitted ${fmt(s.createdAt as Date)}`,
      status: "pending",
      href: "/admin/submissions",
    })),
    ...drafts.map((a) => ({
      id: String(a._id),
      kind: "article" as const,
      title: a.title,
      meta: `${a.category} · edited ${fmt(a.updatedAt as Date)}`,
      status: "draft",
      href: `/admin/articles/${String(a._id)}`,
    })),
    ...soon.map((e) => ({
      id: String(e._id),
      kind: "event" as const,
      title: e.title,
      meta: `${e.venue} · ${fmt(e.startDate as Date)}`,
      status: "upcoming",
      href: `/admin/events/${String(e._id)}`,
    })),
  ];
}

/** Maps analytics paths back to article titles for the top-articles table. */
export async function titlesForPaths(paths: string[]): Promise<Map<string, { title: string; published: string | null }>> {
  await dbConnect();

  const slugs = paths
    .filter((p) => p.startsWith("/articles/"))
    .map((p) => p.replace("/articles/", ""));

  if (slugs.length === 0) return new Map();

  const docs = await Article.find({ slug: { $in: slugs } })
    .select({ slug: 1, title: 1, publishedAt: 1 })
    .lean();

  const map = new Map<string, { title: string; published: string | null }>();
  for (const d of docs) {
    map.set(`/articles/${d.slug}`, {
      title: d.title,
      published: d.publishedAt
        ? new Date(d.publishedAt as Date).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
          })
        : null,
    });
  }
  return map;
}
