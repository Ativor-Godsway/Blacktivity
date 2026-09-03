import "server-only";
import dbConnect from "./db";
import Article from "@/models/Article";
import EventModel from "@/models/Event";
import Submission from "@/models/Submission";
import type { ArticleDTO, EventDTO, SubmissionDTO } from "./types";
import type { ArticleCategory } from "./constants";

/** Mongoose documents are not serialisable across the RSC boundary. */
function toDTO<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

const ARTICLE_CARD_FIELDS =
  "title slug excerpt coverImage category tags author status featured readingTime publishedAt";

export async function getPublishedArticles({
  category,
  limit = 24,
  skip = 0,
  excludeSlug,
}: {
  category?: ArticleCategory;
  limit?: number;
  skip?: number;
  excludeSlug?: string;
} = {}): Promise<ArticleDTO[]> {
  await dbConnect();
  const filter: Record<string, unknown> = { status: "published" };
  if (category) filter.category = category;
  if (excludeSlug) filter.slug = { $ne: excludeSlug };

  const docs = await Article.find(filter)
    .select(ARTICLE_CARD_FIELDS)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return docs.map((d) => ({ ...toDTO<ArticleDTO>(d), id: String(d._id) }));
}

export async function getFeaturedArticle(): Promise<ArticleDTO | null> {
  await dbConnect();
  const doc =
    (await Article.findOne({ status: "published", featured: true })
      .select(ARTICLE_CARD_FIELDS)
      .sort({ publishedAt: -1 })
      .lean()) ??
    (await Article.findOne({ status: "published" })
      .select(ARTICLE_CARD_FIELDS)
      .sort({ publishedAt: -1 })
      .lean());

  return doc ? { ...toDTO<ArticleDTO>(doc), id: String(doc._id) } : null;
}

export async function getArticleBySlug(slug: string): Promise<ArticleDTO | null> {
  await dbConnect();
  const doc = await Article.findOne({ slug, status: "published" }).lean();
  return doc ? { ...toDTO<ArticleDTO>(doc), id: String(doc._id) } : null;
}

export async function getRelatedArticles(
  article: Pick<ArticleDTO, "slug" | "category">,
  limit = 3,
): Promise<ArticleDTO[]> {
  await dbConnect();
  const sameCategory = await Article.find({
    status: "published",
    category: article.category,
    slug: { $ne: article.slug },
  })
    .select(ARTICLE_CARD_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  if (sameCategory.length >= limit) {
    return sameCategory.map((d) => ({ ...toDTO<ArticleDTO>(d), id: String(d._id) }));
  }

  // Top up with the most recent articles from anywhere else.
  const exclude = [article.slug, ...sameCategory.map((d) => d.slug)];
  const filler = await Article.find({ status: "published", slug: { $nin: exclude } })
    .select(ARTICLE_CARD_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(limit - sameCategory.length)
    .lean();

  return [...sameCategory, ...filler].map((d) => ({
    ...toDTO<ArticleDTO>(d),
    id: String(d._id),
  }));
}

export async function getAllArticleSlugs(): Promise<{ slug: string; publishedAt: string | null }[]> {
  await dbConnect();
  const docs = await Article.find({ status: "published" }).select("slug publishedAt").lean();
  return docs.map((d) => ({
    slug: d.slug,
    publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
  }));
}

/** Upcoming vs past is always derived from startDate — never stored. */
export async function getEvents(): Promise<{ upcoming: EventDTO[]; past: EventDTO[] }> {
  await dbConnect();
  const now = new Date();

  const [upcoming, past] = await Promise.all([
    EventModel.find({ startDate: { $gte: now } }).sort({ startDate: 1 }).lean(),
    EventModel.find({ startDate: { $lt: now } }).sort({ startDate: -1 }).lean(),
  ]);

  const map = (docs: typeof upcoming) =>
    docs.map((d) => ({ ...toDTO<EventDTO>(d), id: String(d._id) }));

  return { upcoming: map(upcoming), past: map(past) };
}

export async function getUpcomingEvents(limit = 6): Promise<EventDTO[]> {
  await dbConnect();
  const docs = await EventModel.find({ startDate: { $gte: new Date() } })
    .sort({ startDate: 1 })
    .limit(limit)
    .lean();
  return docs.map((d) => ({ ...toDTO<EventDTO>(d), id: String(d._id) }));
}

export async function getEventBySlug(slug: string): Promise<EventDTO | null> {
  await dbConnect();
  const doc = await EventModel.findOne({ slug }).lean();
  return doc ? { ...toDTO<EventDTO>(doc), id: String(doc._id) } : null;
}

export async function getAllEventSlugs(): Promise<string[]> {
  await dbConnect();
  const docs = await EventModel.find().select("slug").lean();
  return docs.map((d) => d.slug);
}

/** Approved submissions surface publicly on /creatives. */
export async function getApprovedSubmissions(limit = 24): Promise<SubmissionDTO[]> {
  await dbConnect();
  const docs = await Submission.find({ status: "approved" })
    .select("name igHandle discipline workUrl image note createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => ({ ...toDTO<SubmissionDTO>(d), id: String(d._id) }));
}
