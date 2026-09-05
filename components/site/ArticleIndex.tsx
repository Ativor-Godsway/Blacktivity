"use client";

import { useMemo, useState } from "react";
import ArticleCell from "./ArticleCell";
import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ArticleDTO } from "@/lib/types";

const PAGE = 9;

/**
 * Filtering is client-side over already-fetched data: no route change, no
 * refetch, no spinner. Load more rather than pagination, nine at a time.
 */
export function ArticleIndex({ articles }: { articles: ArticleDTO[] }) {
  const [active, setActive] = useState<ArticleCategory | null>(null);
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(
    () => (active ? articles.filter((a) => a.category === active) : articles),
    [articles, active],
  );

  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;

  function choose(category: ArticleCategory | null) {
    setActive(category);
    setShown(PAGE);
  }

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) map.set(a.category, (map.get(a.category) ?? 0) + 1);
    return map;
  }, [articles]);

  return (
    <>
      <div className="mx-auto max-w-[1600px] px-(--gutter)">
        {/* Heading ranged left, filters right-aligned on the same baseline. */}
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-8 border-b border-rule pb-6">
          <h1 className="display text-[clamp(3rem,11vw,9rem)] leading-[0.85]">Articles</h1>

          <div
            className="flex flex-wrap items-center gap-2 pb-2"
            role="group"
            aria-label="Filter articles by category"
          >
            <Pill active={active === null} onClick={() => choose(null)}>
              All <span className="opacity-60">{articles.length}</span>
            </Pill>
            {ARTICLE_CATEGORIES.filter((c) => counts.get(c)).map((c) => (
              <Pill key={c} active={active === c} onClick={() => choose(c)}>
                {c} <span className="opacity-60">{counts.get(c)}</span>
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-(--gutter) pb-24">
        {visible.length === 0 ? (
          <p className="mono py-20 text-fg-muted">Nothing published here yet.</p>
        ) : (
          <div className="mt-12 grid grid-cols-1 border-t border-l border-rule sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((article) => (
              <ArticleCell key={article.id} article={article} headingLevel={2} />
            ))}
          </div>
        )}

        {remaining > 0 ? (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mono border border-rule-strong px-8 py-4 transition-colors duration-300 ease-[var(--ease-expo)] hover:bg-fg hover:text-bg"
            >
              Load more — {remaining} remaining
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "mono rounded-full border px-4 py-2 text-[10px] leading-none transition-colors duration-200",
        active
          ? "border-fg bg-fg text-bg"
          : "border-rule text-fg-muted hover:border-rule-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export default ArticleIndex;
