import ImageExt from "@tiptap/extension-image";

/**
 * Tiptap's image node extended with the attributes the public renderer needs.
 *
 * `width`/`height` are stored so the public page can set a true `aspect-ratio`
 * — without them the article shifts as images load, which breaks the zero-CLS
 * criterion. `blurDataURL` gives the placeholder, `publicId` lets the asset be
 * managed later, and `widthMode` drives the column / wide / full-bleed layout.
 */
export const ArticleImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => Number(el.getAttribute("width")) || null,
        renderHTML: (attrs) => (attrs.width ? { width: String(attrs.width) } : {}),
      },
      height: {
        default: null,
        parseHTML: (el) => Number(el.getAttribute("height")) || null,
        renderHTML: (attrs) => (attrs.height ? { height: String(attrs.height) } : {}),
      },
      publicId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-public-id"),
        renderHTML: (attrs) =>
          attrs.publicId ? { "data-public-id": String(attrs.publicId) } : {},
      },
      blurDataURL: {
        default: null,
        // Never rendered into the editor DOM — it is only carried in the JSON.
        renderHTML: () => ({}),
      },
      widthMode: {
        default: "column",
        parseHTML: (el) => el.getAttribute("data-width") ?? "column",
        renderHTML: (attrs) => ({ "data-width": String(attrs.widthMode ?? "column") }),
      },
    };
  },
});

export default ArticleImage;
