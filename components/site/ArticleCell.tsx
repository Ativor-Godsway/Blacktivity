import Link from "next/link";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import { formatDateMono, cn } from "@/lib/utils";
import type { ArticleDTO } from "@/lib/types";

/** Outlined capsule, mono, 10px. */
export function CategoryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono rounded-full border border-rule px-3 py-1 text-[10px] leading-none">
      {children}
    </span>
  );
}

/**
 * One cell in the continuous hairline table.
 *
 * Borders are single-direction (right + bottom) with the container carrying the
 * opposite two edges, so adjacent cells never double up their rules.
 *
 * Nothing moves on hover — no lift, no scale. Movement inside a bordered grid
 * breaks the table.
 *
 * The image no longer changes either: photography renders in its own colours,
 * so the grey-to-colour reveal that used to say "clickable" is gone. The
 * `.card-hover` trio replaces it — ground, title and a 4px arrow — and is
 * shared with the events and creatives grids.
 */
export function ArticleCell({
  article,
  className,
  headingLevel = 3,
  // The image fills the cell's content width, so `sizes` is the CELL width
  // minus its padding — not a fraction of it. The grid is 1/2/3 columns inside
  // a 1600px container, which caps a cell's content at ~470px however wide the
  // monitor is; without that last clause a 3440px screen would request a
  // 1000px+ file for a 470px box.
  sizes = "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1728px) 31vw, 480px",
}: {
  article: ArticleDTO;
  className?: string;
  /**
   * The card title's heading level. 3 suits a grid that sits under a section
   * heading — "Selected writing" on the homepage, "Keep reading" on an article.
   * The index pages have no such heading between their h1 and the grid, so the
   * cards ARE the sections there and pass 2. Skipping a level is a real
   * accessibility failure, not a stylistic one: it tells a screen-reader user
   * the cards belong to a section that was never announced.
   */
  headingLevel?: 2 | 3;
  sizes?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const author = article.author?.name ?? "";
  // "Kojo Mensah" -> "K. MENSAH"
  const byline = author.includes(" ")
    ? `${author[0]}. ${author.split(" ").slice(-1)[0]}`
    : author;

  return (
    <article
      className={cn(
        "card-hover border-r border-b border-rule",
        className,
      )}
    >
      <Link href={`/articles/${article.slug}`} className="flex h-full flex-col p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="text-fg-muted">
            {article.publishedAt ? formatDateMono(article.publishedAt) : "Draft"}
          </MonoLabel>
          <CategoryPill>{article.category}</CategoryPill>
        </div>

        <RevealImage
          src={article.coverImage.url}
          alt={article.coverImage.alt || article.title}
          width={article.coverImage.width}
          height={article.coverImage.height}
          blurDataURL={article.coverImage.blurDataURL}
          sizes={sizes}
          quality={75}
          // FULL CELL WIDTH. A fractional width (this was 46%) leaves dead
          // space down the right of every cell and breaks the grid's rhythm —
          // the cells are all the same width, so a ranged-left plate inside one
          // reads as a mistake rather than as a proportion.
          className="mt-6 aspect-4/5 w-full"
        />

        {/* Satoshi Medium, not Zodiak — a high-contrast display serif falls
            apart at 18-20px. Zodiak is reserved for section headings and
            article pages, where it has room. */}
        <Heading className="card-title mt-6 text-[1.15rem] leading-snug font-medium md:text-[1.3rem]">
          {article.title}
        </Heading>

        <p className="mt-3 line-clamp-3 text-fg-muted">{article.excerpt}</p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-8">
          <MonoLabel className="text-[10px] text-fg-muted">
            {byline ? `Text — ${byline}` : ""}
          </MonoLabel>
          <MonoLabel className="flex items-center gap-2 text-[10px] text-fg-muted">
            Read — {article.readingTime} min
            <span aria-hidden="true" className="card-arrow inline-block">→</span>
          </MonoLabel>
        </div>
      </Link>
    </article>
  );
}

export default ArticleCell;
