"use client";

import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Embed from "./embed-extension";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "a-meta border px-3 py-2 transition-colors duration-200",
        active
          ? "border-[var(--admin-ink)] bg-[var(--admin-ink)] text-[var(--admin-plane)]"
          : "border-[var(--admin-rule)] a-muted hover:border-[var(--admin-ink)] hover:text-[var(--admin-ink)]",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL");
    if (!url) return;
    const alt = window.prompt("Alt text") ?? "";
    const title = window.prompt("Caption (optional)") ?? "";
    editor.chain().focus().setImage({ src: url, alt, title }).run();
  }, [editor]);

  const addEmbed = useCallback(() => {
    const src = window.prompt("Embed URL (https only — YouTube, Spotify, Vimeo)");
    if (!src || !/^https:\/\//.test(src)) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: "embed", attrs: { src, title: "Embedded media" } })
      .run();
  }, [editor]);

  return (
    <div className="sticky top-16 z-20 flex flex-wrap gap-2 border-b border-[var(--admin-rule)] bg-[var(--admin-surface)] py-3">
      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </ToolbarButton>
      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
        Link
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </ToolbarButton>
      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        List
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        title="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        ——
      </ToolbarButton>
      <ToolbarButton title="Image" onClick={addImage}>
        Image
      </ToolbarButton>
      <ToolbarButton title="Embed" onClick={addEmbed}>
        Embed
      </ToolbarButton>
    </div>
  );
}

export function Editor({
  content,
  onChange,
}: {
  content: unknown;
  onChange: (json: unknown) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false, // required for SSR
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      ImageExt.configure({ inline: false }),
      Embed,
    ],
    content: (content as object) ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class: "prose-editorial min-h-[50vh] focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });

  if (!editor) {
    return <div className="min-h-[50vh] animate-pulse bg-[var(--admin-hover)]" />;
  }

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="py-8" />
    </div>
  );
}

export default Editor;
