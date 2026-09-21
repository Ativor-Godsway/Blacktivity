import Link from "next/link";
import RotationMotion from "@/components/home/RotationMotion";
import { rotationVisual } from "@/data/rotation-visual";
import {
  volumeDateRange,
  volumeLabel,
  type RotationPosterData,
} from "@/lib/rotation";
import { formatDateMono } from "@/lib/utils";

/**
 * THE ROTATION SECTION — Revision 20 §4-§6.
 *
 * A full photograph behind the sticker word, the meta block, the category line
 * and the button, at every screen size. It replaces Revision 16's cut-out
 * figure, which is retired on all breakpoints — see data/rotation-visual.ts for
 * what happened to the file.
 *
 * WHAT CARRIED OVER, UNCHANGED IN SUBSTANCE: the word, the meta block, the
 * category line and the button are Revision 16's, re-set on the photograph.
 * Two attempts at summarising the charts on the homepage did not work; this
 * still does not try, and still sends the reader to them instead.
 *
 * ---------------------------------------------------------------------------
 * THIS FILE IS A SERVER COMPONENT AND IS COMPLETE ON ITS OWN.
 *
 * Everything below renders in its resting state, fully readable, with the links
 * and the button working, before a line of JavaScript runs. RotationMotion
 * wraps it and adds §6's enter sequence, scroll depth and pointer effects; with
 * scripting off it adds nothing and the section is simply still.
 *
 * ART DIRECTION, NOT A CSS SWAP — §4. One <picture> with a phone <source>, so
 * exactly one file is downloaded. With no landscape file on disk both sources
 * resolve to the same path and the browser fetches it once.
 * ---------------------------------------------------------------------------
 *
 * LEGIBILITY IS THE FIRST CONSTRAINT AND THE PHOTOGRAPH IS THE SECOND — §5.
 * The scrims are gradients placed where the type is, never a flat overlay over
 * the whole image: a flat scrim reads as UI chrome and throws away the colour
 * that the black palette exists to show off. Every text element here is
 * measured against the lightest pixel behind it; see `check:rotation-contrast`.
 */

/** The two lists the section points at. Deep links, unchanged since §14. */
const SECTIONS = [
  { href: "/rotation#chart", label: "The Chart" },
  { href: "/rotation#new-releases", label: "New Releases" },
] as const;

/**
 * The sticker word, split into letters.
 *
 * ONE ELEMENT PER LETTER, because §6.1 rises them one by one and §6.3 lifts the
 * ones near the cursor. The whole word is also present as a single `sr-only`
 * string: eleven separate spans are eleven separate things to a screen reader
 * unless the container is marked up to say otherwise, and "R O T A T I O N"
 * read out letter by letter is worse than useless.
 */
function StickerWord({ text }: { text: string }) {
  return (
    <span className="rotation-word-letters" aria-hidden="true">
      {text.split("").map((ch, i) => (
        <span key={`${ch}-${i}`} className="rotation-letter-mask">
          <span className="rotation-letter" style={{ "--i": i } as React.CSSProperties}>
            {ch}
          </span>
        </span>
      ))}
    </span>
  );
}

export function RotationPoster({ rotation }: { rotation: RotationPosterData | null }) {
  // No published volume: the whole section is absent, never an empty state.
  if (!rotation) return null;

  const range = volumeDateRange(rotation.publishedAt, formatDateMono);
  const m = rotationVisual.mobile;
  const d = rotationVisual.desktop;
  const disc = d.disc;

  return (
    <RotationMotion>
      <section
        data-rotation
        data-theme="dark"
        /*
          `min(90svh, 960px)` from md up — Revision 21 §3. The desktop image's
          WIDTH is derived from this height, so an uncapped 90svh on a very tall
          window would make the image wider than the viewport and push the notes
          over the type. The cap is what keeps the clear zone from closing.
        */
        className="rotation-section relative isolate min-h-svh overflow-hidden"
        aria-labelledby="rotation-poster-heading"
      >
        {/* --- THE IMAGE LAYER -----------------------------------------------
            Its own layer, so §6.3's parallax can move it against the type with
            one transform write each, and §6.2's scroll depth can scale it
            without touching anything else.

            ON DESKTOP IT IS RIGHT-ANCHORED AND NOT COVER-CROPPED — §3. The
            record has to keep its size and place relative to the section's
            right edge, because the spinning layers are positioned from the
            record's own geometry and a `cover` crop moves it at every width.
            So the wrapper carries the file's aspect ratio, is pinned to the
            right at full height, and everything to its left is filled with the
            grey sampled out of the image itself.

            On mobile the same wrapper holds a plain `cover` photograph, exactly
            as Revision 20 built it. */}
        <div
          data-rotation-photo
          className="absolute inset-0 -z-10"
          style={{ "--rotation-ground": d.ground } as React.CSSProperties}
        >
          <div className="rotation-image-box" style={{ aspectRatio: `${d.width} / ${d.height}` }}>
            <picture>
              <source media="(max-width: 767px)" srcSet={m.src} width={m.width} height={m.height} />
              <img
                src={d.src}
                alt={rotationVisual.alt}
                width={d.width}
                height={d.height}
                /*
                  LAZY, NEVER PRIORITY — §2. The homepage's LCP is the cover's
                  first slide, and this section is three screens down. Marking
                  it priority would put a second full-viewport image in front of
                  the one the reader is actually looking at.
                */
                loading="lazy"
                decoding="async"
                draggable={false}
                className="rotation-photo"
                style={{ "--focal-m": m.focal } as React.CSSProperties}
              />
            </picture>

            {/*
              --- THE SPINNING RECORD — §5, desktop only ---------------------

              THIS IS NOT A ROTATING CROP OF THE SOURCE, and that is a
              measurement rather than a preference. §5.1 describes a circular
              element backed by `image2.jpg` and rotated, which works when the
              record is wholly inside the file. This record is not: measured, it
              is a circle of radius 182.4px centred at (608.7, 176) in a
              626x357 image, so it runs off the right edge by 165px and off the
              top and bottom by a few. Rotating a crop of it pulls those missing
              regions into view as transparent wedges — the further it turns,
              the worse it gets.

              So the grooves stay put, and two DRAWN layers turn on top of them:

                - the label ring, which §5.2 already identifies as the only
                  thing that can show a symmetric label is moving;
                - a soft sheen, which is what the eye actually reads as the
                  light travelling across vinyl.

              Both are generated, so neither can run out of source pixels, and
              between them the record reads as spinning. When a full-resolution
              uncropped file arrives — §1's blocker — the groove crop becomes
              possible and belongs here.

              Both layers are decorative and out of the a11y tree.
            */}
            <div
              data-rotation-disc
              aria-hidden="true"
              className="rotation-disc"
              style={
                {
                  "--disc-cx": `${disc.cx}%`,
                  "--disc-cy": `${disc.cy}%`,
                  "--disc-r": `${disc.discR}%`,
                  "--label-r": `${disc.labelR}%`,
                } as React.CSSProperties
              }
            >
              <span className="rotation-disc-sheen" />
            </div>

            <div
              data-rotation-label
              aria-hidden="true"
              className="rotation-label"
              style={
                {
                  "--disc-cx": `${disc.cx}%`,
                  "--disc-cy": `${disc.cy}%`,
                  "--label-r": `${disc.labelR}%`,
                } as React.CSSProperties
              }
            >
              <svg viewBox="0 0 100 100" className="block h-full w-full">
                <defs>
                  <path
                    id="rotation-label-path"
                    /* A circle at 72% of the label's radius: far enough in to
                       clear the label's edge, far enough out to clear the
                       spindle hole. */
                    d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
                    fill="none"
                  />
                </defs>
                <text className="rotation-label-text">
                  <textPath href="#rotation-label-path" startOffset="0">
                    {`BLACKTIVITY · ROTATION · ${volumeLabel(rotation.number)} · `}
                  </textPath>
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/*
          THE SPOTLIGHT — §6.3. A single element that RotationMotion moves with
          `transform: translate3d`, never an animated gradient position. It sits
          BELOW the scrims and the type, so it can never reduce text contrast,
          and it is invisible until a fine pointer enters the section.
        */}
        <div data-rotation-spotlight className="rotation-spotlight" aria-hidden="true" />

        {/* --- THE SCRIMS ---------------------------------------------------
            Gradients where the type sits, and nowhere else. Three of them: one
            for the bottom-left text group, one for the top-right meta block,
            and a bottom-up wash that only exists on phones, where the text
            group spans the full width. */}
        <div className="rotation-scrim rotation-scrim-text" aria-hidden="true" />
        <div className="rotation-scrim rotation-scrim-meta" aria-hidden="true" />

        {/* --- THE TYPE ------------------------------------------------------ */}
        <div
          data-rotation-type
          /*
            `justify-between` on a phone, where the meta block is pinned to the
            top and the word group to the bottom. `justify-center` from md up,
            where §3 asks for one group vertically centred in the left 45% —
            with the mobile meta block hidden, `justify-between` left the single
            remaining child sitting at the top of the section.
          */
          className="rotation-type relative flex flex-col justify-between px-(--gutter) py-8 md:justify-center md:py-12"
        >
          {/*
            THE META BLOCK IS TOP-RIGHT ON A PHONE AND A SINGLE LINE ABOVE THE
            WORD ON DESKTOP — §3. It cannot stay in the corner on desktop,
            because that corner is now the record. One element, two placements,
            nothing rendered twice.
          */}
          <div className="mx-auto flex w-full max-w-[1600px] justify-end md:hidden">
            <p data-rotation-meta className="mono rotation-meta text-right">
              <span className="rotation-meta-line">
                <span>{volumeLabel(rotation.number)}</span>
              </span>
              {range ? (
                <span className="rotation-meta-line">
                  <span>{range}</span>
                </span>
              ) : null}
              <span className="rotation-meta-line">
                <span>
                  {rotation.trackCount} {rotation.trackCount === 1 ? "track" : "tracks"}
                </span>
              </span>
            </p>
          </div>

          <div className="mx-auto w-full max-w-[1600px]">
            <div className="rotation-text-group md:w-[45%]">
              <p
                data-rotation-meta-inline
                className="mono rotation-meta hidden md:block"
              >
                <span className="rotation-meta-line">
                  <span>
                    {volumeLabel(rotation.number)}
                    {range ? ` · ${range}` : ""} · {rotation.trackCount}{" "}
                    {rotation.trackCount === 1 ? "track" : "tracks"}
                  </span>
                </span>
              </p>

              <h2 id="rotation-poster-heading" className="rotation-word" data-rotation-word>
                <span className="sr-only">
                  Rotation — {volumeLabel(rotation.number)}
                </span>
                <StickerWord text="Rotation" />
              </h2>

              <p data-rotation-links className="mono rotation-categories mt-5">
                {SECTIONS.map((s, i) => (
                  <span key={s.href}>
                    {i > 0 ? <span aria-hidden="true"> · </span> : null}
                    <Link href={s.href} className="rotation-category">
                      {s.label}
                    </Link>
                  </span>
                ))}
              </p>

              <div data-rotation-cta className="mt-7 md:mt-8">
                <Link
                  href="/rotation"
                  data-track="home-rotation-cta"
                  data-rotation-button
                  className="rotation-button mono group"
                >
                  Listen
                  <span
                    aria-hidden="true"
                    className="rotation-button-arrow inline-block"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </RotationMotion>
  );
}

export default RotationPoster;
