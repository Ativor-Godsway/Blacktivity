export const ARTICLE_CATEGORIES = [
  "Culture",
  "Music",
  "Fashion",
  "Art",
  "Film",
  "Voices",
] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const DISCIPLINES = [
  "Photography",
  "Design",
  "Music",
  "Fashion",
  "Film",
  "Writing",
  "Other",
] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const SUBMISSION_STATUSES = ["pending", "approved", "rejected"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const ARTICLE_STATUSES = ["draft", "published"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const SITE = {
  name: "Blacktivity",
  tagline: "Creative Studio",
  established: "EST 2025",
  edition: "EDITION 02",
  description:
    "Blacktivity is a Ghana-based creative studio and emerging entertainment house documenting Black creativity — culture, music, fashion, art and film.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ig: "blacktivity",
} as const;
