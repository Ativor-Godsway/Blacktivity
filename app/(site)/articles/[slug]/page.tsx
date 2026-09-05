import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import ArticleCell from "@/components/site/ArticleCell";
import ActionLink from "@/components/site/ActionLink";
import ScrollProgress from "@/components/site/ScrollProgress";
import ShareRow from "@/components/site/ShareRow";
import TiptapContent from "@/lib/tiptap-render";
import { splitOpening } from "@/lib/split-opening";
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
  // The paragraphs that sit beside the cover, and everything after them.
  const { opening, body } = splitOpening(article.content);
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
            {/* A persistent way out. An article should never be a dead end. */}
            <Link
              href="/articles"
              className="mono group inline-flex items-center gap-2 text-fg-muted transition-colors hover:text-fg focus-visible:text-fg"
            >
              <span
                aria-hidden="true"
                className="transition-transform duration-300 ease-[var(--ease-expo)] group-hover:-translate-x-1 group-focus-visible:-translate-x-1"
              >
                ←
              </span>
              All articles
            </Link>

            <div className="mt-8 flex items-baseline justify-between border-b border-rule pb-4">
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
          THE OPENING BLOCK — cover left, first paragraphs right, meta in the
          margin. Below it, the body continues at the normal centred measure.

          This is a two-column grid, NOT a float or a shape-outside wrap. A
          float would put the whole article in one flow around the image, which
          reflows unpredictably at intermediate widths and strands single lines
          in the narrow gap beside the image's bottom edge. Two cells of one
          grid row cannot overlap, and the row takes the height of the taller,
          so a mis-estimated split costs white space and nothing else.

          Cover geometry, unchanged: 4:5 matching the grid cards and the OG
          image. It used to be full-bleed at 100vw inside a 21/9 box, which
          forced a portrait source through object-cover into a narrow band and
          cropped the subject's head off. The focal point set in the admin
          decides what survives.

          On mobile this is a single column and the DOM order — image, opening,
          body — is exactly the stack it was before.
        */}
        <div className="mx-auto max-w-[1600px] px-(--gutter)">
          {/* `items-start`: a grid stretches its cells by default, so the text
              column would be exactly the image's height whatever it contained,
              and the remainder below would start after that phantom height
              rather than after the last line. */}
          <div className="grid grid-cols-4 items-start gap-x-(--gutter) md:grid-cols-12">
            {/* Hanging mono metadata in the margin. */}
            {/* `order-2` on mobile keeps the stack as it was: cover, then the
                edition and tags, then the text. In source order the aside comes
                first because at md+ it is the left-hand margin column. */}
            <aside className="order-2 col-span-4 mt-10 mb-0 md:order-none md:col-span-2 md:mt-0">
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

            <div className="order-1 col-span-4 md:order-none md:col-span-4 md:col-start-4">
              <RevealImage
                src={article.coverImage.url}
                alt={article.coverImage.alt || article.title}
                fill
                blurDataURL={article.coverImage.blurDataURL}
                focalX={article.coverImage.focalX}
                focalY={article.coverImage.focalY}
                sizes="(max-width: 768px) 92vw, 440px"
                priority
                className="aspect-4/5 w-full"
              />
            </div>

            {opening ? (
              // Top-aligned with the image: the first paragraph's top margin is
              // removed so the two columns start on the same line.
              <div className="prose-editorial prose-opening dropcap order-3 col-span-4 mt-10 [&>*:first-child]:mt-0 md:order-none md:col-span-4 md:col-start-9 md:mt-0">
                <TiptapContent content={opening} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-(--gutter)">
          <div className="grid grid-cols-4 gap-x-(--gutter) pb-20 md:grid-cols-12">
            {/*
              The remainder, at the standard measure.

              THE SEAM. These are two blocks, so their margins sit end to end
              instead of collapsing, and on mobile — where the columns stack
              into one flow — the join would show as a double space. The fix is
              to drop the OPENING block's last bottom margin (above) and let
              this block's first element keep its own top margin, so whatever
              element lands here gets the gap it would have had in one flow.

              Doing it the other way round — zeroing the first margin here —
              looks identical while the body happens to start with a paragraph
              and is wrong the moment it starts with a heading, which in this
              library is nearly always: an h2 carries a 2.2em top margin and
              would have been given a paragraph's 1.4em.

              `dropcap` is deliberately absent: it belongs to the article's
              first paragraph, which is up in the opening block.
            */}
            <div className="prose-editorial col-span-4 md:col-span-8 md:col-start-4">
              {body ? <TiptapContent content={body} /> : null}
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
            <MonoLabel as="h2">Keep reading</MonoLabel>
          </div>

          <div className="mt-8 grid grid-cols-1 border-t border-l border-rule sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ArticleCell key={item.id} article={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* The route onward, present whether or not there are related pieces. */}
      <section className="mx-auto max-w-[1600px] px-(--gutter) pb-24">
        <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-10">
          <ActionLink href="/articles" arrow="←" back>
            Back to all articles
          </ActionLink>
          <ActionLink href="/">Home</ActionLink>
        </div>
      </section>
    </>
  );
}
