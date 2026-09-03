import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ARTICLE_CATEGORIES, ARTICLE_STATUSES } from "@/lib/constants";

const ImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    alt: { type: String, default: "" },
    width: { type: Number, default: 1200 },
    height: { type: Number, default: 1600 },
    blurDataURL: { type: String, default: "" },
  },
  { _id: false },
);

const ArticleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    excerpt: { type: String, required: true, maxlength: 200 },
    content: { type: Schema.Types.Mixed, required: true }, // Tiptap JSON
    coverImage: { type: ImageSchema, required: true },
    category: { type: String, enum: ARTICLE_CATEGORIES, required: true, index: true },
    tags: { type: [String], default: [] },
    author: {
      name: { type: String, required: true },
      igHandle: { type: String, default: "" },
    },
    status: { type: String, enum: ARTICLE_STATUSES, default: "draft", index: true },
    featured: { type: Boolean, default: false },
    readingTime: { type: Number, default: 1 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ArticleSchema.index({ status: 1, publishedAt: -1 });

/** Walks Tiptap JSON collecting text nodes so we can count words. */
function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: string; content?: unknown[] };
  if (typeof n.text === "string") return n.text + " ";
  if (Array.isArray(n.content)) return n.content.map(extractText).join("");
  return "";
}

ArticleSchema.pre("save", async function () {
  const words = extractText(this.content).trim().split(/\s+/).filter(Boolean).length;
  this.readingTime = Math.max(1, Math.round(words / 220));
  if (this.status === "published" && !this.publishedAt) this.publishedAt = new Date();
});

export type ArticleDoc = InferSchemaType<typeof ArticleSchema>;

export const Article: Model<ArticleDoc> =
  (models.Article as Model<ArticleDoc>) ?? model<ArticleDoc>("Article", ArticleSchema);

export default Article;
