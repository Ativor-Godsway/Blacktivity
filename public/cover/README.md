# `public/cover/` — the home page cover photographs

The home page hero is a magazine cover that changes issue every six seconds.
Each slide is **one photograph**, set like a Vogue cover: the masthead across
the top, a short cover line bottom-left, a mono caption under it.

Images are **dropped in here by hand**. They are deliberately not uploaded
through the admin — the cover is art direction, not content, and it is not in
the CMS.

---

## The two folders

```
public/cover/
  landscape/   desktop and tablet-landscape.  16:9 or 3:2.  ≥ 2400px long edge.
  portrait/    phones.                        4:5 or 9:16.  ≥ 1440px long edge.
```

**Pairs are matched by number.** `landscape/03.jpg` and `portrait/03.jpg` are
the same slide.

The portrait is **a different photograph, or a different crop made by a human**
— never an automatic centre-crop of the landscape. A 16:9 frame squeezed to 4:5
loses whatever made it worth shooting, and that is the entire reason two folders
exist instead of one.

`.jpg`, `.jpeg` and `.webp` are accepted. `next/image` emits AVIF and WebP from
whatever is here, so there is nothing to gain by pre-converting.

`.png` is accepted **only** because the generated placeholders are PNGs. Do not
ship a photograph as a PNG — it will be several times the size of the JPG for no
visible difference.

## Numbering

`01`, `02`, `03` … zero-padded, two digits, consecutive from 01.

- **Fewer than 3 slides** → the cover renders statically, slide 01 only, with no
  carousel, no ticks and no auto-advance.
- **More than 10** → the first 10 are used and the build log warns. The cover is
  a cover, not a gallery.

## Every file needs a manifest entry, and every entry needs two files

The manifest is [`data/cover.ts`](../../data/cover.ts). It carries the cover
line, the caption, the `alt` text, the focal points and the tone for each slide.

`npm run check:cover` — which `npm run audit` runs, and which the build runs —
**fails loudly** if:

- a manifest entry has no matching `landscape/NN` file,
- a manifest entry has no matching `portrait/NN` file,
- a file exists in either folder with no manifest entry,
- an entry has no `alt`.

It names the offending numbers. This is a hard failure rather than a warning
because the two halves of a slide live in different places, and a missing
portrait file is invisible on the machine of whoever added the landscape one.

## Focal points

`focalLandscape` and `focalPortrait` are plain CSS `object-position` values —
`"50% 35%"` means centred horizontally, 35% down. The photo is `object-fit:
cover`, so on a viewport whose shape does not match the file's, this is what
decides which part survives the crop.

**Set them per photograph, by looking.** The default `50% 50%` crops faces off
tall viewports more often than not. They also steer the Ken Burns drift: the
incoming photo pushes ~1.5% *towards* its focal point over the slide's six
seconds.

## Tone

`tone: "light"` (the default) means the type over this slide is `--bone`.
`tone: "dark"` flips the masthead and cover line to `--black`, for a photograph
bright enough that bone type disappears into it.

There is no automatic measurement here on purpose: brightness averaged over a
photograph tells you very little about whether one line of type is readable
where it actually sits. **Look at every slide.** A cover line you cannot read on
one photograph is a bug, not a matter of taste.

## Replacing the placeholders

The files currently in these folders are generated fakes — flat
`--black-raised` panels with a number on them, written by
`node scripts/build/make-cover-placeholders.mjs`. They exist so the layout,
the motion and the audits all work before real photographs arrive.

They are obviously fake by design. When the real photographs land, delete the
generated files, drop the photographs in with the same numbering, and update
each manifest entry's `alt`, `caption`, `coverLine`, focal points and `tone`.
