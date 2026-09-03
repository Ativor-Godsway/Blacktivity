import type { ArticleCategory, ArticleStatus, Discipline, SubmissionStatus } from "./constants";

export type ImageRef = {
  url: string;
  publicId?: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
};

export type ArticleDTO = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: unknown;
  coverImage: ImageRef;
  category: ArticleCategory;
  tags: string[];
  author: { name: string; igHandle: string };
  status: ArticleStatus;
  featured: boolean;
  readingTime: number;
  publishedAt: string | null;
};

export type EventDTO = {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster: ImageRef;
  startDate: string;
  endDate: string | null;
  venue: string;
  city: string;
  ticketUrl: string;
  featured: boolean;
};

export type SubmissionDTO = {
  id: string;
  name: string;
  email: string;
  igHandle: string;
  discipline: Discipline;
  workUrl: string;
  image: { url: string; publicId: string };
  note: string;
  status: SubmissionStatus;
  createdAt: string;
};
