import { Node, mergeAttributes } from "@tiptap/core";

/**
 * A minimal embed block. Stored in the document JSON as
 * { type: "embed", attrs: { src, title } } and rendered server-side by
 * lib/tiptap-render.tsx — the editor only needs to hold it intact.
 */
export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      title: { default: "Embedded media" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-embed": "",
        class: "border border-white/20 p-4 font-mono text-xs uppercase tracking-widest",
      }),
      `Embed — ${HTMLAttributes.src || "no URL"}`,
    ];
  },
});

export default Embed;
