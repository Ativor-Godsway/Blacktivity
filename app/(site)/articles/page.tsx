import type { Metadata } from "next";
import ArticleIndex from "@/components/site/ArticleIndex";
import { getPublishedArticles } from "@/lib/queries";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Writing on Black creativity — culture, music, fashion, art, film and the voices behind them.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  // Fetched once; the category filter runs client-side so it is instant.
  const articles = await getPublishedArticles({ limit: 200 });

  return (
    <div className="pt-16 md:pt-24">
      <ArticleIndex articles={articles} />
    </div>
  );
}
