"use client";

import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ArticleImage from "./editor-image-extension";
import Embed from "./embed-extension";
import ImageInsertDialog, { type InsertPayload } from "./ImageInsertDialog";
import { useCallback, useState } from "react";
import { validateFile } from "@/lib/upload-client";
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
          ? "a-border-ink a-bg-ink a-on-ink"
          : "a-border a-muted hover:a-border-ink hover:a-ink",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: TiptapEditor; onImage: () => void }) {
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
    <div className="sticky top-16 z-20 flex flex-wrap gap-2 border-b a-border a-bg-surface py-3">
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
      <ToolbarButton title="Image" onClick={onImage}>
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const editor = useEditor({
    immediatelyRender: false, // required for SSR
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      ArticleImage.configure({ inline: false }),
      Embed,
    ],
    content: (content as object) ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class: "prose-editorial min-h-[50vh] focus:outline-none",
      },

      /**
       * Dropping an image file onto the canvas opens the same insert dialog as
       * the toolbar button, so every route into the document goes through
       * upload, validation and the required alt text.
       */
      handleDrop(_view, event) {
        const file = (event as DragEvent).dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();
        setPendingFile(file);
        setDialogOpen(true);
        return true;
      },

      /** Pasting a screenshot straight in should just work. */
      handlePaste(_view, event) {
        const items = (event as ClipboardEvent).clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
          const file = item.getAsFile();
          if (!file) continue;
          // Reject early rather than uploading and failing.
          if (validateFile(file)) return false;
          event.preventDefault();
          setPendingFile(file);
          setDialogOpen(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });

  const insert = useCallback(
    (payload: InsertPayload) => {
      editor
        ?.chain()
        .focus()
        .setImage({
          src: payload.url,
          alt: payload.alt,
          title: payload.caption || undefined,
        })
        .updateAttributes("image", {
          width: payload.width || null,
          height: payload.height || null,
          publicId: payload.publicId || null,
          blurDataURL: payload.blurDataURL || null,
          widthMode: payload.widthMode,
        })
        .run();

      setDialogOpen(false);
      setPendingFile(null);
    },
    [editor],
  );

  if (!editor) {
    return <div className="min-h-[50vh] animate-pulse a-bg-hover" />;
  }

  return (
    <div>
      <Toolbar
        editor={editor}
        onImage={() => {
          setPendingFile(null);
          setDialogOpen(true);
        }}
      />
      <EditorContent editor={editor} className="py-8" />

      <ImageInsertDialog
        open={dialogOpen}
        initialFile={pendingFile}
        onClose={() => {
          setDialogOpen(false);
          setPendingFile(null);
        }}
        onInsert={insert}
      />
    </div>
  );
}

export default Editor;
