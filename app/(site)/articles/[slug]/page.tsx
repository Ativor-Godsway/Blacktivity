import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import ArticleCell from "@/components/site/ArticleCell";
import DrawLink from "@/components/site/DrawLink";
import ScrollProgress from "@/components/site/ScrollProgress";
import ShareRow from "@/components/site/ShareRow";
import TiptapContent from "@/lib/tiptap-render";
import { getArticleBySlug, getAllArticleSlugs, getRelatedArticles } from "@/lib/queries";
import { formatDateMono, absoluteUrl } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await getAllArticleSlugs();
    return slugs.map(({ slug }) => ({ slug }));
  } catch {
    // No database at build time — pages render on demand instead.
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Not found" };

  const url = absoluteUrl(`/articles/${article.slug}`);
  const og = absoluteUrl(`/api/og?title=${encodeURIComponent(article.title)}&label=${encodeURIComponent(article.category)}`);

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      url,
      publishedTime: article.publishedAt ?? undefined,
      authors: [article.author.name],
      images: [{ url: og, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [og],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const related = await getRelatedArticles(article, 3);
  const url = absoluteUrl(`/articles/${article.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: [article.coverImage.url],
    datePublished: article.publishedAt,
    author: { "@type": "Person", name: article.author.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: url,
  };

  return (
    <>
      <ScrollProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <header className="px-(--gutter) pt-16 pb-12 md:pt-24">
          <div className="mx-auto max-w-[1600px]">
            <div className="flex items-baseline justify-between border-b border-rule pb-4">
              <MonoLabel>{article.category}</MonoLabel>
              <MonoLabel dim>
                {article.publishedAt ? formatDateMono(article.publishedAt) : ""}
              </MonoLabel>
            </div>

            <h1 className="display mt-10 max-w-[18ch] text-[clamp(2.5rem,8vw,6.5rem)]">
              {article.title}
            </h1>

            <p className="mt-8 max-w-[54ch] text-lg text-fg-muted">{article.excerpt}</p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <MonoLabel dim>
                By {article.author.name}
                {article.author.igHandle ? ` — @${article.author.igHandle}` : ""}
              </MonoLabel>
              <span className="h-px w-12 bg-fill-strong" />
              <MonoLabel dim>{article.readingTime} MIN READ</MonoLabel>
            </div>
          </div>
        </header>

        {/*
          Cover at 4:5, matching the grid cards and the OG image, capped at
          780px and ranged left in the editorial grid — type dominates,
          photography is subordinate.

          It used to be full-bleed at 100vw inside a 21/9 box, which forced a
          portrait source through object-cover into a narrow horizontal band —
          the subject's head was cropped off above the top edge. Full bleed also
          served an enormous file on a wide monitor, working against the LCP
          work. The focal point set in the admin decides what survives.
        */}
        <div className="w-full max-w-[780px] px-(--gutter)">
          <RevealImage
            src={article.coverImage.url}
            alt={article.coverImage.alt || article.title}
            fill
            blurDataURL={article.coverImage.blurDataURL}
            focalX={article.coverImage.focalX}
            focalY={article.coverImage.focalY}
            sizes="(max-width: 768px) 92vw, 780px"
            priority
            className="aspect-4/5 w-full"
          />
        </div>

        <div className="mx-auto max-w-[1600px] px-(--gutter)">
          <div className="grid grid-cols-4 gap-x-(--gutter) py-20 md:grid-cols-12">
            {/* Hanging mono metadata in the margin. */}
            <aside className="col-span-4 mb-10 md:col-span-2 md:mb-0">
              <MonoLabel dim className="block">
                {SITE.edition}
              </MonoLabel>
              {article.tags.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-x-3 gap-y-2 md:flex-col">
                  {article.tags.map((tag) => (
                    <li key={tag}>
                      <MonoLabel dim>#{tag}</MonoLabel>
                    </li>
                  ))}
                </ul>
              ) : null}
            </aside>

            <div className="prose-editorial dropcap col-span-4 md:col-span-8 md:col-start-4">
              <TiptapContent content={article.content} />
              <div className="mt-16 not-prose">
                <ShareRow url={url} title={article.title} />
              </div>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mx-auto max-w-[1600px] px-(--gutter) pb-8">
          <div className="flex items-baseline justify-between gap-6">
            <MonoLabel>Keep reading</MonoLabel>
            <DrawLink href="/articles">All articles →</DrawLink>
          </div>

          <div className="mt-8 grid grid-cols-1 border-t border-l border-rule sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ArticleCell key={item.id} article={item} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
