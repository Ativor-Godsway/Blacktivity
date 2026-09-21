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
    /*
      PADDING, NOT MARGIN — Revision 20 §2.
      Every themed section paints its own ground, so a top MARGIN between two
      of them shows the page ground in the gap and the alternation breaks into
      stripes. The rhythm is identical; it is just inside the section now.
    */
    <section data-theme="dark" className="py-(--spacing-section-lg)">
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
            // No `sizes` override: this row and the /articles grid are the
            // same 1/2/3-column grid in the same 1600px container, so the
            // cell's own default already describes both.
            <ArticleCell key={article.id} article={article} />
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
