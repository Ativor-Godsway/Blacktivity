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
 * breaks the table. Only the cell ground and the image colour change.
 */
export function ArticleCell({
  article,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: {
  article: ArticleDTO;
  className?: string;
  sizes?: string;
}) {
  const author = article.author?.name ?? "";
  // "Kojo Mensah" -> "K. MENSAH"
  const byline = author.includes(" ")
    ? `${author[0]}. ${author.split(" ").slice(-1)[0]}`
    : author;

  return (
    <article
      className={cn(
        "group border-r border-b border-rule transition-colors duration-300 ease-[var(--ease-expo)] hover:bg-bg-raised",
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
          quality={70}
          // Grid cells rest grayscale and come to colour on hovering the CELL,
          // not on scroll-into-view — in a table, the hover is the event.
          colorOnView={false}
          className="mt-6 aspect-4/5 w-full"
        />

        {/* Satoshi Medium, not Zodiak — a high-contrast display serif falls
            apart at 18-20px. Zodiak is reserved for section headings and
            article pages, where it has room. */}
        <h3 className="mt-6 text-[1.15rem] leading-snug font-medium md:text-[1.3rem]">
          {article.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-fg-muted">{article.excerpt}</p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-8">
          <MonoLabel className="text-[10px] text-fg-muted">
            {byline ? `Text — ${byline}` : ""}
          </MonoLabel>
          <MonoLabel className="text-[10px] text-fg-muted">
            Read — {article.readingTime} min
          </MonoLabel>
        </div>
      </Link>
    </article>
  );
}

export default ArticleCell;
