/**
 * THE COVER MANIFEST — Revision 19 §5.
 *
 * The home page hero is a magazine cover that changes issue every few seconds.
 * Each entry here is one slide: a photograph, a cover line, a caption, and the
 * art direction the layout needs to place it.
 *
 * The PHOTOGRAPHS are not here. They live in `public/cover/landscape/NN.*` and
 * `public/cover/portrait/NN.*`, are dropped in by hand, and are matched to these
 * entries BY `id`. `public/cover/README.md` is the contract, and
 * `npm run check:cover` enforces it: every entry needs both files, every file
 * needs an entry, and every entry needs an `alt`. The build runs it.
 *
 * DELIBERATELY NOT IN THE CMS. The cover is art direction — a photograph chosen
 * for a crop, paired with a second photograph for phones, with a focal point set
 * by eye. None of that survives an upload form, and an editor who can swap the
 * home page's entire first impression from a dashboard is a liability rather
 * than a feature. When that changes it becomes a real content type with a real
 * editor, not an image field bolted onto this.
 *
 * THE COVER LINES ARE NOT ARTICLE HEADLINES — Revision 18 §1, still in force.
 * They are titles FOR THE IMAGE. Nothing here links anywhere; there is an
 * Articles page for articles. A cover line that reads like a headline invites
 * the click that does not exist.
 */

/** A slide's type colour. `dark` flips the masthead and cover line to --black. */
export type CoverTone = "light" | "dark";

export type CoverSlide = {
  /** Zero-padded, two digits. IS the filename in both folders. */
  id: string;
  /**
   * 1–4 words, display serif, huge. A title for the photograph.
   *
   * It is split on whitespace and animated word by word, so a five-word line
   * does not merely look long — it staggers for half a second and arrives after
   * the eye has moved on. Keep it short because the motion assumes it is.
   */
  coverLine: string;
  /** One mono line: a place, a photographer, a short phrase. */
  caption: string;
  /**
   * REQUIRED, and never empty. These are content images, not decoration — they
   * are the entire hero — so a screen reader that reaches the cover and hears
   * nothing has been handed a blank page. `check:cover` fails on an empty one.
   */
  alt: string;
  /** `object-position` for the landscape file. See the README. */
  focalLandscape: string;
  /** `object-position` for the portrait file. */
  focalPortrait: string;
  tone: CoverTone;
};

/** The issue line under the masthead. Left half; the right half is derived. */
export const coverIssue = {
  issue: "ISSUE 07",
  date: "SEPTEMBER 2026",
  /** The right half of the line, before the slide number. */
  place: "ACCRA — GH",
} as const;

/**
 * THREE REAL PHOTOGRAPHS. NO PLACEHOLDERS — Revision 20 §1.
 *
 * Slides 04 and 05 were generated placeholder panels with placeholder `alt` and
 * `caption` strings, and one of those strings REACHED THE SCREEN: when their
 * images failed to load, the browser painted the alt text, and "PLACEHOLDER —
 * describe the real photograph here before this ships" appeared at the top left
 * of the home page. That is the failure mode a placeholder has that a missing
 * slide does not.
 *
 * So the deck is the three photographs that actually exist. Three is the
 * minimum for a carousel (see COVER_MIN_CAROUSEL), so nothing about the
 * behaviour changes. `npm run cover:placeholders` regenerates 04 and 05 if a
 * longer deck is wanted before the real photographs arrive — and
 * `check:cover` now FAILS on any `alt` or `caption` that still says
 * PLACEHOLDER, so they cannot be shipped the way these nearly were.
 *
 * THE CAPTIONS ON 01-03 CARRY NO PROVENANCE — no place, no date, no
 * photographer — because none was supplied with the files, and an invented
 * credit on an archival photograph is worse than none. They read as
 * descriptions for that reason. Replace them with the real line.
 */
export const coverSlides: CoverSlide[] = [
  {
    id: "01",
    coverLine: "Sound System",
    /*
      Landscape: a crowd carrying boomboxes overhead, black and white.
      Portrait: a man holding one at his side on the street, same era.
      A real pair — two photographs of one subject, not one photograph cropped.
    */
    caption: "Carried overhead, archive",
    alt: "A dense crowd photographed in black and white, several people holding boomboxes above their heads",
    // Faces fill the upper middle of the landscape frame; the portrait's
    // subject is the radio, which sits just below centre.
    focalLandscape: "50% 40%",
    focalPortrait: "50% 45%",
    tone: "light",
  },
  {
    id: "02",
    coverLine: "Hands Up",
    caption: "A room at full volume",
    alt: "Raised hands silhouetted against a stage light that fills the frame with white",
    // The hands are along the bottom third of the landscape frame, so the crop
    // holds low; the portrait's three subjects look out from just above centre.
    focalLandscape: "50% 70%",
    focalPortrait: "50% 42%",
    /*
      `dark`, AND THIS IS THE SLIDE THE FLAG EXISTS FOR. The top 60% of the
      landscape frame is a blown-out stage light — bone type on it disappears
      entirely. The flag flips the MASTHEAD AND ISSUE LINE ONLY; see the note in
      globals.css for why it deliberately does not reach the cover line, which
      sits over the dark silhouetted crowd at the bottom of the same photograph.
    */
    tone: "dark",
  },
  {
    id: "03",
    coverLine: "On Set",
    caption: "Mid-take, the crew at work",
    alt: "A film crew on a terraced street: a clapperboard held out in front of an actor while two operators work a camera rig",
    focalLandscape: "50% 40%",
    // The singer's face is high in the portrait frame — a centred crop takes
    // the top of his head off on a tall phone.
    focalPortrait: "50% 25%",
    tone: "light",
  },
];

/**
 * The slides the cover actually renders.
 *
 * MORE THAN 10 IS TRUNCATED, NOT AN ERROR — §5. A cover is a cover; an
 * eleventh slide is three and a half minutes from the top of the rotation and
 * nobody sees it. The warning is emitted here, at module scope, so it lands in
 * the build log exactly once per build.
 */
export const COVER_MAX = 10;
/** Below this the cover is static: slide 01 only, no carousel — §5. */
export const COVER_MIN_CAROUSEL = 3;

if (coverSlides.length > COVER_MAX) {
  console.warn(
    `[cover] ${coverSlides.length} slides in data/cover.ts; using the first ${COVER_MAX}. ` +
      `See Revision 19 §5 and public/cover/README.md.`,
  );
}

export const coverDeck: CoverSlide[] = coverSlides.slice(0, COVER_MAX);

/** Static cover, no carousel: fewer than three slides to rotate between. */
export const coverIsStatic = coverDeck.length < COVER_MIN_CAROUSEL;
