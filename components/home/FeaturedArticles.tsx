import ScrollReveal from "@/components/motion/ScrollReveal";
import ArticleCell from "@/components/site/ArticleCell";
import ActionLink from "@/components/site/ActionLink";
import type { ArticleDTO } from "@/lib/types";

/**
 * A single row of three cells, full bleed to the page margins. The container
 * carries the top and left rules and each cell the right and bottom, so the
 * hairlines form one continuous table with no doubling.
 */
export function FeaturedArticles({ articles }: { articles: ArticleDTO[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-(--spacing-section-lg)">
      <div className="mx-auto max-w-[1600px] px-(--gutter)">
        <ScrollReveal
          as="h2"
          text="Selected writing"
          className="display block text-[clamp(2.25rem,6vw,4.5rem)]"
        />
      </div>

      <div className="mx-auto mt-12 max-w-[1600px] px-(--gutter)">
        <div className="grid grid-cols-1 border-t border-l border-rule sm:grid-cols-2 lg:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <ArticleCell
              key={article.id}
              article={article}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ))}
        </div>

        <div className="mt-10">
          <ActionLink href="/articles">See all articles</ActionLink>
        </div>
      </div>
    </section>
  );
}

export default FeaturedArticles;
