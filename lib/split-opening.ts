import { tiptapToText } from "./tiptap-render";

/**
 * Splits an article body into the paragraphs that sit BESIDE the cover image
 * and the remainder that flows into the centred measure below it.
 *
 * WHY THIS IS AN ESTIMATE, AND WHY THAT IS THE RIGHT TRADE
 *
 * The honest way to fill a column to an image's height is to measure the
 * rendered text. But the only place that measurement exists is the client,
 * after layout — so acting on it means re-splitting the article during
 * hydration, which moves every paragraph on the page. That is a guaranteed
 * layout shift on the article's largest element, against a CLS of 0 and an LCP
 * budget that took three revisions to earn. A server-side estimate ships one
 * HTML for everyone and shifts nothing.
 *
 * So this measures the CONTENT — character counts, per paragraph, through the
 * real type metrics — rather than counting paragraphs. Two articles with the
 * same paragraph count and different paragraph lengths split in different
 * places, which is the property that actually matters.
 *
 * THE GEOMETRY IS RESOLVED AT ONE REFERENCE WIDTH.
 *
 * The split is baked into the HTML, so it cannot vary by viewport. Capacity
 * scales with the square of the column width (a wider column fits both more
 * characters per line AND more lines beside a taller image), so no single
 * choice is exact everywhere. 1440 is the middle of the three widths the layout
 * is checked at, so the error is spread evenly to either side.
 *
 * Being wrong is cheap in both directions, which is the reason an estimate is
 * tolerable here at all: the image and the text are two cells of one grid row,
 * so the row takes the height of the taller. Underfill leaves white space below
 * the text; overfill leaves it below the image. Neither can overlap, and
 * neither orphans a line, because the remainder continues in its own block.
 */

/** Reference viewport. See the note above on why the split is width-invariant. */
const REFERENCE_VIEWPORT = 1440;
const CONTAINER_MAX = 1600;
const GUTTER = 32; // --gutter at md+, in px
const COLUMNS = 12;
const COLUMN_SPAN = 4; // the text column spans 4 of 12

/**
 * Type metrics, measured from the rendered page rather than assumed — see
 * `npm run check:opening`, which re-measures them against the live layout and
 * fails if this file has drifted from what the browser actually does.
 */
const FONT_SIZE = 17; // .prose-editorial p, 1.0625rem
const LINE_HEIGHT = FONT_SIZE * 1.75; // 29.75px
const PARAGRAPH_GAP = FONT_SIZE * 1.4; // margin-block, collapsed between paragraphs
const AVG_CHAR_WIDTH = 7.62; // Satoshi at 17px, measured on real body copy

/**
 * Headings count too, and they have to, because of how these articles are
 * actually written: six of the eight in the library open with a SINGLE
 * paragraph before their first h2. A paragraph-only rule cannot fill a column
 * that has one paragraph's worth of prose available — it stops at 23-48% of the
 * image height and there is nothing legal left to add. That reads as a layout
 * that failed rather than a layout with air in it.
 *
 * Zodiak at this size sets happily in a 440px column, so an h2 landing beside
 * the cover is a section opening, not a cramped one.
 *
 * Blockquotes and images are still excluded — see the loop.
 */
const H2 = { size: 44, lineHeight: 1.05, marginTop: 2.2 }; // clamp(1.75rem,3.5vw,2.75rem), capped
const H3 = { size: 17, lineHeight: 1.4, marginTop: 2.0 }; // 1.05rem, uppercase
const HEADING_CHAR_RATIO = 0.47; // display face, measured the same way as body

/**
 * The dropcap floats 4.2em tall at 0.78 line-height and indents the lines it
 * sits beside, so the first paragraph holds fewer characters than its width
 * suggests. Charged as a flat character allowance.
 */
const DROPCAP_LINES = 2;
const DROPCAP_INDENT = FONT_SIZE * 4.2 * 0.62; // cap width, approx

/**
 * Aim slightly under the image height...
 *
 * ...but allow the LAST paragraph to spill past it, because the split is taken
 * in whole paragraphs and body paragraphs here run 400-700 characters. Without
 * a tolerance the choice between two and three paragraphs is the choice
 * between filling 61% of the column and overflowing it, and refusing to
 * overflow means the wide end of the range always gets the emptier one.
 *
 * Spilling is the cheaper error: the text column simply becomes the taller cell
 * and the body starts below it, which is the same layout the narrow widths
 * already produce. Leaving a third of the column empty beside a full-height
 * image is the one that looks unfinished.
 */
const FILL_TARGET = 0.94;
const SPILL_TOLERANCE = 1.08;

function columnWidth(): number {
  const container = Math.min(REFERENCE_VIEWPORT, CONTAINER_MAX) - GUTTER * 2;
  const track = (container - GUTTER * (COLUMNS - 1)) / COLUMNS;
  return track * COLUMN_SPAN + GUTTER * (COLUMN_SPAN - 1);
}

type Node = { type?: string; content?: unknown[] };

/** Height in px this heading would occupy in a column `width` px wide. */
function headingHeight(text: string, width: number, level: number): { height: number; gap: number } {
  const m = level >= 3 ? H3 : H2;
  const perLine = Math.max(1, Math.floor(width / (m.size * HEADING_CHAR_RATIO)));
  const lines = Math.max(1, Math.ceil(text.length / perLine));
  return { height: lines * m.size * m.lineHeight, gap: m.size * m.marginTop };
}

/** Height in px this paragraph would occupy in a column `width` px wide. */
function paragraphHeight(text: string, width: number, isFirst: boolean): number {
  const perLine = Math.max(1, Math.floor(width / AVG_CHAR_WIDTH));
  let chars = text.length;

  if (isFirst) {
    // The dropcap steals width from its first lines, not from the paragraph.
    const lost = Math.floor(DROPCAP_INDENT / AVG_CHAR_WIDTH) * DROPCAP_LINES;
    chars += lost;
  }

  return Math.max(1, Math.ceil(chars / perLine)) * LINE_HEIGHT;
}

/**
 * Returns the doc split in two. `opening` is what sits beside the cover;
 * `body` is everything after it. Either may be empty: a very short article puts
 * everything beside the image, and a body that opens with a heading or a pull
 * quote puts nothing there.
 */
export function splitOpening(content: unknown): { opening: unknown; body: unknown } {
  const empty = { opening: null, body: content };
  if (!content || typeof content !== "object") return empty;

  const nodes = (content as Node).content;
  if (!Array.isArray(nodes) || nodes.length === 0) return empty;

  const width = columnWidth();
  const budget = width * 1.25 * FILL_TARGET; // the cover is 4:5, so 1.25x its width

  let used = 0;
  let taken = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const type = (node as Node)?.type;

    // Paragraphs and headings can set in a narrow column. A pull quote at
    // clamp(1.5rem, 3vw, 2.25rem) cannot — it is designed to break the measure,
    // and a measure this narrow leaves it two or three words to a line. Images
    // and figures are sized for the full body width. Any of those ends the
    // opening block wherever it falls.
    if (type !== "paragraph" && type !== "heading") break;

    // Never open the block with a heading: the article's first element beside
    // the cover should be prose, and the dropcap belongs to it.
    if (type === "heading" && taken === 0) break;

    const text = tiptapToText(node);
    if (!text) break;

    let height: number;
    let gap: number;

    if (type === "heading") {
      const level = Number((node as { attrs?: { level?: number } }).attrs?.level ?? 2);
      const h = headingHeight(text, width, level);
      height = h.height;
      gap = h.gap;
    } else {
      height = paragraphHeight(text, width, taken === 0);
      gap = taken === 0 ? 0 : PARAGRAPH_GAP;
    }

    // A heading is never the last thing in the column — it would announce a
    // section that then starts in a different measure below the image.
    if (type === "heading" && (nodes[i + 1] as Node | undefined)?.type !== "paragraph") break;

    // Whole paragraphs only. Half a paragraph beside the image and half below
    // would break mid-sentence across a change of measure.
    if (used + gap + height > budget * SPILL_TOLERANCE && taken > 0) break;

    used += gap + height;
    taken += 1;

    if (used >= budget) break;
  }

  // ...and if the budget ran out on the paragraph that was going to follow a
  // heading, the heading goes back too, for the same reason.
  while (taken > 0 && (nodes[taken - 1] as Node)?.type === "heading") taken -= 1;

  if (taken === 0) return empty;

  return {
    opening: { type: "doc", content: nodes.slice(0, taken) },
    body: taken < nodes.length ? { type: "doc", content: nodes.slice(taken) } : null,
  };
}

export default splitOpening;
