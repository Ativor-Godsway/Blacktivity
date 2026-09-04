/**
 * ROUND-TRIP TEST FOR THE PUBLIC RENDERER
 *
 * One fixture containing every node type the editor toolbar can produce, plus
 * deliberately malformed nodes. The renderer must return valid output for all
 * of them and must never throw.
 *
 * This exists because a single pasted Pinterest URL 500'd a published article,
 * and a single malformed node failed the entire production build. Add a branch
 * to the renderer, add a case here.
 *
 *   npm run test:render
 */
import { renderToStaticMarkup } from "react-dom/server";
import TiptapContent from "@/lib/tiptap-render";

const doc = (content: unknown[]) => ({ type: "doc", content });
const text = (t: string) => ({ type: "text", text: t });

type Case = { name: string; content: unknown; expect?: RegExp; expectEmpty?: boolean };

/** Everything the toolbar can insert. */
const TOOLBAR: Case[] = [
  { name: "paragraph", content: doc([{ type: "paragraph", content: [text("Hello")] }]), expect: /<p>Hello<\/p>/ },
  { name: "heading h2", content: doc([{ type: "heading", attrs: { level: 2 }, content: [text("H2")] }]), expect: /<h2>H2<\/h2>/ },
  { name: "heading h3", content: doc([{ type: "heading", attrs: { level: 3 }, content: [text("H3")] }]), expect: /<h3>H3<\/h3>/ },
  { name: "bold", content: doc([{ type: "paragraph", content: [{ ...text("b"), marks: [{ type: "bold" }] }] }]), expect: /<strong>/ },
  { name: "italic", content: doc([{ type: "paragraph", content: [{ ...text("i"), marks: [{ type: "italic" }] }] }]), expect: /<em>/ },
  { name: "link", content: doc([{ type: "paragraph", content: [{ ...text("l"), marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] }]), expect: /href="https:\/\/example\.com"/ },
  { name: "blockquote", content: doc([{ type: "blockquote", content: [{ type: "paragraph", content: [text("q")] }] }]), expect: /<blockquote>/ },
  { name: "bulletList", content: doc([{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("a")] }] }] }]), expect: /<ul><li>/ },
  { name: "orderedList", content: doc([{ type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("1")] }] }] }]), expect: /<ol><li>/ },
  { name: "horizontalRule", content: doc([{ type: "horizontalRule" }]), expect: /<hr/ },
  { name: "hardBreak", content: doc([{ type: "paragraph", content: [text("a"), { type: "hardBreak" }, text("b")] }]), expect: /<br/ },
  { name: "embed", content: doc([{ type: "embed", attrs: { src: "https://www.youtube.com/embed/x" } }]), expect: /<iframe/ },
  {
    name: "image (allowlisted host, with dimensions)",
    content: doc([{ type: "image", attrs: { src: "https://res.cloudinary.com/demo/a.jpg", alt: "A", width: 800, height: 1000 } }]),
    expect: /aspect-ratio/,
  },
];

/** Things a human, an editor bug, or a bad paste can actually produce. */
const MALFORMED: Case[] = [
  { name: "image from a non-allowlisted host", content: doc([{ type: "image", attrs: { src: "https://i.pinimg.com/a.jpg", alt: "x" } }]), expectEmpty: true },
  { name: "image with no protocol", content: doc([{ type: "image", attrs: { src: "example.com/a.jpg" } }]), expectEmpty: true },
  { name: "image with object src", content: doc([{ type: "image", attrs: { src: { url: "x" } } }]), expectEmpty: true },
  { name: "image with no src", content: doc([{ type: "image", attrs: { alt: "x" } }]), expectEmpty: true },
  { name: "null node", content: doc([null]), expectEmpty: true },
  { name: "string node", content: doc(["oops"]), expectEmpty: true },
  { name: "number node", content: doc([42]), expectEmpty: true },
  { name: "node with no type", content: doc([{ attrs: {} }]), expectEmpty: true },
  { name: "unknown node type", content: doc([{ type: "callout", content: [text("kept")] }]), expect: /kept/ },
  { name: "marks is a string", content: doc([{ type: "paragraph", content: [{ ...text("hi"), marks: "bold" }] }]), expect: /hi/ },
  { name: "content is a string", content: doc([{ type: "paragraph", content: "oops" }]), expect: /<p><\/p>/ },
  { name: "content is a number", content: doc([{ type: "bulletList", content: 5 }]), expect: /<ul><\/ul>/ },
  { name: "javascript: link is neutralised", content: doc([{ type: "paragraph", content: [{ ...text("x"), marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }]), expect: /href="#"/ },
  { name: "mark is null", content: doc([{ type: "paragraph", content: [{ ...text("hi"), marks: [null] }] }]), expect: /hi/ },
  { name: "doc is null", content: null, expectEmpty: true },
  { name: "doc is a string", content: "nope", expectEmpty: true },
  { name: "deeply nested rubbish", content: doc([{ type: "bulletList", content: [{ type: "listItem", content: [null, "x", { type: "paragraph", content: [text("survives")] }] }] }]), expect: /survives/ },
];

let failed = 0;
function run(label: string, cases: Case[]) {
  console.log(`\n${label}`);
  for (const c of cases) {
    let html: string;
    try {
      html = renderToStaticMarkup(<TiptapContent content={c.content} />);
    } catch (err) {
      failed++;
      console.log(`  THREW  ${c.name} — ${String((err as Error).message).split("\n")[0].slice(0, 80)}`);
      continue;
    }
    if (c.expect && !c.expect.test(html)) {
      failed++;
      console.log(`  WRONG  ${c.name} — expected ${c.expect}, got ${html.slice(0, 70) || "(empty)"}`);
      continue;
    }
    if (c.expectEmpty && html !== "") {
      failed++;
      console.log(`  WRONG  ${c.name} — expected empty, got ${html.slice(0, 70)}`);
      continue;
    }
    console.log(`  ok     ${c.name}`);
  }
}

run("Toolbar node types — every one must render:", TOOLBAR);
run("Malformed input — none of these may throw:", MALFORMED);

console.log(
  `\n${failed === 0 ? "PASS" : "FAIL"} — ${TOOLBAR.length + MALFORMED.length - failed}/${TOOLBAR.length + MALFORMED.length} cases`,
);
process.exit(failed === 0 ? 0 : 1);
