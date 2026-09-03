import { Fragment, type ReactNode } from "react";
import Image from "next/image";

/**
 * Renders Tiptap JSON to React on the SERVER. Nothing is dangerouslySet — every
 * node is mapped explicitly, so stored content can never inject markup.
 */
type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = {
  type?: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: Node[];
};

function applyMarks(text: string, marks: Mark[] = [], key: string): ReactNode {
  return marks.reduce<ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong key={key}>{acc}</strong>;
      case "italic":
        return <em key={key}>{acc}</em>;
      case "code":
        return (
          <code key={key} className="mono bg-white/10 px-1.5 py-0.5">
            {acc}
          </code>
        );
      case "link": {
        const href = String(mark.attrs?.href ?? "#");
        const external = /^https?:\/\//.test(href);
        return (
          <a
            key={key}
            href={href}
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

function renderNodes(nodes: Node[] = []): ReactNode {
  return nodes.map((node, i) => <Fragment key={i}>{renderNode(node, String(i))}</Fragment>);
}

function renderNode(node: Node, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return applyMarks(node.text ?? "", node.marks, key);

    case "paragraph":
      return <p>{renderNodes(node.content)}</p>;

    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const Tag = (level === 3 ? "h3" : level === 4 ? "h4" : "h2") as "h2" | "h3" | "h4";
      return <Tag>{renderNodes(node.content)}</Tag>;
    }

    case "blockquote":
      return <blockquote>{renderNodes(node.content)}</blockquote>;

    case "bulletList":
      return <ul>{renderNodes(node.content)}</ul>;

    case "orderedList":
      return <ol>{renderNodes(node.content)}</ol>;

    case "listItem":
      return <li>{renderNodes(node.content)}</li>;

    case "horizontalRule":
      return <hr className="my-14 h-px border-0 bg-white/10" />;

    case "hardBreak":
      return <br />;

    case "image": {
      const src = String(node.attrs?.src ?? "");
      if (!src) return null;
      const alt = String(node.attrs?.alt ?? "");
      const caption = node.attrs?.title ? String(node.attrs.title) : "";
      return (
        <figure className="my-14">
          <Image
            src={src}
            alt={alt}
            width={1400}
            height={1000}
            sizes="(max-width: 768px) 100vw, 68ch"
            className="h-auto w-full"
          />
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }

    case "embed": {
      const src = String(node.attrs?.src ?? "");
      if (!/^https:\/\//.test(src)) return null;
      return (
        <div className="my-14 aspect-video w-full">
          <iframe
            src={src}
            title={String(node.attrs?.title ?? "Embedded media")}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="h-full w-full border border-white/10"
          />
        </div>
      );
    }

    case "doc":
      return renderNodes(node.content);

    default:
      return node.content ? renderNodes(node.content) : null;
  }
}

export function TiptapContent({ content }: { content: unknown }) {
  const doc = content as Node | null;
  if (!doc) return null;
  return <>{renderNode(doc, "root")}</>;
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
