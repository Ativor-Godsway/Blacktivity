import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import { isAllowedImageUrl } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";

/**
 * Renders Tiptap JSON to React on the SERVER. Nothing is dangerouslySet — every
 * node is mapped explicitly, so stored content can never inject markup.
 *
 * THIS RENDERER MUST NEVER THROW.
 *
 * One malformed node used to take down the whole page, and in a production
 * build it failed the entire export ("TypeError: a.map is not a function" while
 * prerendering a single article). A published article is data written by a
 * human through an editor; it is not a contract. Every branch here therefore
 * validates its own shape and an unrecognised or broken node renders as
 * nothing. Same lesson as the analytics batch: one bad item must not discard
 * everything around it.
 */
type Mark = { type?: string; attrs?: Record<string, unknown> };
type Node = {
  type?: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: Node[];
};

/** Tiptap width options for inline images. */
const WIDTHS = {
  column: "mx-auto w-full max-w-[68ch]",
  wide: "mx-auto w-full max-w-[min(92vw,1100px)]",
  full: "w-full",
} as const;

const SIZES = {
  column: "(max-width: 768px) 100vw, 68ch",
  wide: "(max-width: 768px) 100vw, min(92vw, 1100px)",
  full: "100vw",
} as const;

function asArray(value: unknown): Node[] {
  return Array.isArray(value) ? (value as Node[]) : [];
}

function applyMarks(text: string, marks: unknown, key: string): ReactNode {
  return asArray(marks).reduce<ReactNode>((acc, mark) => {
    if (!mark || typeof mark !== "object") return acc;
    switch (mark.type) {
      case "bold":
        return <strong key={key}>{acc}</strong>;
      case "italic":
        return <em key={key}>{acc}</em>;
      case "code":
        return (
          <code key={key} className="rounded bg-fill-subtle px-1.5 py-0.5 font-mono text-[0.9em]">
            {acc}
          </code>
        );
      case "link": {
        const href = String(mark.attrs?.href ?? "");
        // Only http(s) and in-site links — never javascript: or data:.
        const safe = /^(https?:\/\/|\/|#|mailto:)/.test(href) ? href : "#";
        const external = /^https?:\/\//.test(safe);
        return (
          <a
            key={key}
            href={safe}
            {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
          >
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function renderNodes(nodes: unknown): ReactNode {
  return asArray(nodes).map((node, i) => (
    <Fragment key={i}>{renderNode(node, String(i))}</Fragment>
  ));
}

function renderNode(node: unknown, key: string): ReactNode {
  // Anything that is not an object — null, a string, a number — is skipped.
  if (!node || typeof node !== "object") return null;
  const n = node as Node;

  switch (n.type) {
    case "text":
      return typeof n.text === "string" ? applyMarks(n.text, n.marks, key) : null;

    case "paragraph":
      return <p>{renderNodes(n.content)}</p>;

    case "heading": {
      const level = Number(n.attrs?.level);
      const Tag = (level === 3 ? "h3" : level === 4 ? "h4" : "h2") as "h2" | "h3" | "h4";
      return <Tag>{renderNodes(n.content)}</Tag>;
    }

    case "blockquote":
      return <blockquote>{renderNodes(n.content)}</blockquote>;

    case "bulletList":
      return <ul>{renderNodes(n.content)}</ul>;

    case "orderedList":
      return <ol>{renderNodes(n.content)}</ol>;

    case "listItem":
      return <li>{renderNodes(n.content)}</li>;

    case "codeBlock":
      return (
        <pre className="my-10 overflow-x-auto rounded bg-fill-subtle p-4 font-mono text-[0.85em]">
          <code>{renderNodes(n.content)}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr className="my-14 h-px border-0 bg-rule" />;

    case "hardBreak":
      return <br />;

    case "image": {
      const src = n.attrs?.src;
      // A host outside the allowlist makes next/image throw, which is what took
      // the page down. Skip it rather than crash — the editor rejects these at
      // paste time so this is a backstop for content stored before that.
      if (!isAllowedImageUrl(src)) return null;

      const alt = typeof n.attrs?.alt === "string" ? n.attrs.alt : "";
      const caption = typeof n.attrs?.title === "string" ? n.attrs.title : "";
      const width = Number(n.attrs?.width) || 0;
      const height = Number(n.attrs?.height) || 0;
      const blurDataURL =
        typeof n.attrs?.blurDataURL === "string" ? n.attrs.blurDataURL : undefined;

      const rawWidth = String(n.attrs?.widthMode ?? "");
      const mode: keyof typeof WIDTHS =
        rawWidth === "wide" || rawWidth === "full"
          ? rawWidth
          : // Column is the default. Wide and full-bleed are deliberate
            // opt-ins chosen in the editor, never inferred from the source's
            // orientation — the page is typographic first.
            "column";

      return (
        <figure className={cn("my-14", WIDTHS[mode])}>
          <div
            className="relative w-full overflow-hidden"
            // True proportions from the stored dimensions — never cropped, and
            // no layout shift. Capped so a tall portrait cannot swallow the
            // screen.
            style={
              width && height
                ? { aspectRatio: `${width} / ${height}`, maxHeight: "85vh" }
                : undefined
            }
          >
            <Image
              src={String(src)}
              alt={alt}
              {...(width && height
                ? { width, height }
                : { width: 1400, height: 1000 })}
              sizes={SIZES[mode]}
              placeholder={blurDataURL ? "blur" : "empty"}
              blurDataURL={blurDataURL}
              className="h-full w-full object-contain"
            />
          </div>
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }

    case "embed": {
      const src = String(n.attrs?.src ?? "");
      if (!/^https:\/\//.test(src)) return null;
      return (
        <div className="my-14 aspect-video w-full">
          <iframe
            src={src}
            title={typeof n.attrs?.title === "string" ? n.attrs.title : "Embedded media"}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="h-full w-full border border-rule"
          />
        </div>
      );
    }

    case "doc":
      return renderNodes(n.content);

    default:
      // Unknown node: render its children if it has any, otherwise nothing.
      return n.content ? renderNodes(n.content) : null;
  }
}

export function TiptapContent({ content }: { content: unknown }) {
  if (!content || typeof content !== "object") return null;
  return <>{renderNode(content, "root")}</>;
}

/** Plain text for meta descriptions and reading-time counts. */
export function tiptapToText(content: unknown): string {
  const walk = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const n = node as Node;
    if (typeof n.text === "string") return n.text + " ";
    if (Array.isArray(n.content)) return n.content.map(walk).join("");
    return "";
  };
  return walk(content).replace(/\s+/g, " ").trim();
}

export default TiptapContent;
