# Blacktivity

A Ghana-based creative studio and emerging entertainment house (est. 2025). This
is the publication: articles, events, the roster, a public submission funnel, and
a private admin panel with real visitor analytics.

## The one design rule

**No colour outside the token list below may appear in UI chrome. Photographs
are the only source of colour on the site.**

The public site is **light-dominant** on a warm off-white; black is heavy
punctuation, used for exactly three full-bleed sections on the homepage (the
About break, the submission CTA, and the footer) and for the whole admin panel.
The scarcity of the black is what gives it force.

```
--paper        #F2F1EE   primary background — warm off-white, NEVER #FFF
--paper-raised #E8E7E3   cards, hovers, inset panels
--ink          #0B0B0B   primary text on paper
--void         #000000   full-bleed black punctuation ONLY
--grey-70      #6E6C68
--grey-45      #A8A6A1
--grey-25      #C9C7C2
--rule-light   rgba(11,11,11,0.12)    hairlines on paper
--rule-dark    rgba(255,255,255,0.14) hairlines on black
```

Pure white is never a background: it is harsh and makes photography look pasted
on. The warmth of the ground is why the black reads as ink rather than as a UI
colour.

**Components never name a literal colour.** `globals.css` defines a semantic
layer — `fg`, `fg-muted`, `fg-dim`, `fg-faint`, `bg`, `bg-raised`, `rule`,
`grid`, `fill-subtle`, `fill-strong` — and the single class `.on-void`
re-points every one of those for its subtree. That class is the only place the
inversion is expressed, which is how the same `<Button>` or `<MonoLabel>`
renders correctly on the light site and inside the dark admin. Run
`npm run audit:colour` to check nothing has drifted.

The signature gesture: images rest at `grayscale(1) contrast(1.08)` — the
contrast lift stops them going milky on a light ground — and come to colour over
~600ms on hover or on scroll-into-view.

It is built as a **two-layer opacity crossfade, never an animated `filter`**.
Animating `filter` is not compositor-accelerated: every frame of the transition
repaints the image. Here the filter is static on a grey plate above the colour
image, and only `opacity` moves. See `components/ui/RevealImage.tsx`.

Grain is a **pre-rasterized tiling PNG at flat opacity** — not `mix-blend-mode`.
A fixed, full-viewport blended element cannot be GPU-cached, so the browser
re-composites the whole viewport on every scroll frame; that one property cost
~2.9s of rasterization per 4s of scrolling. `npm run build:grain` regenerates
the tile, and `npm run audit:grain` proves it is actually painting.

## The logo

`public/brand/blacktivity-wordmark.svg`, inlined as a React component at
`components/brand/Wordmark.tsx` so it inherits `currentColor` and can flip
between ink on paper and paper on the black sections.

**The source file's viewBox and clipPath both lie about the artwork.** It
declares a 1500-square viewBox, and its clipPath rect (592x280) is not the
glyph bounds — trusting either crops "tivity" clean off. The real bounds,
measured with `getBBox()`, are **1059.14 x 243.56 at (239.73, 534.55)**, an
aspect of ~4.349:1. If the file is ever replaced, re-measure with:

```bash
node scripts/visual/svg-bbox.mjs
```

The hairline "tivity" half survives down to ~140px wide on a standard-density
display, so the mark is used in the nav as well as the hero and footer. There
is no `CREATIVE STUDIO` sub-line in the supplied file, so nothing was stripped;
the tagline is separate mono text beside the mark.

## Article content and images

**The public renderer must never throw.** `lib/tiptap-render.tsx` validates the
shape of every node and renders an unrecognised or broken one as nothing. This
is not defensive decoration: a single image node pasted from Pinterest returned
**500 on the public article in dev**, and a single structurally malformed node
**failed the entire production build** —
`TypeError: a.map is not a function` while prerendering one article, aborting
the export. Published content is written by a human through an editor; it is
data, not a contract.

`npm run test:render` renders one fixture per toolbar node type plus fifteen
deliberately malformed ones and asserts none of them throw. Add a branch to the
renderer, add a case there.

### Image hosts

`next/image` throws for a hostname absent from `images.remotePatterns`, so the
allowlist is the crash surface. `lib/image-hosts.ts` is the single source of
truth and is enforced in three places:

1. the editor rejects a bad paste in front of the author,
2. the Zod schema rejects it at the API,
3. the renderer skips it as a backstop for content stored before either.

Keep it in sync with `images.remotePatterns`. Everything uploaded through the
admin is served from Cloudinary, so the list is deliberately short.

### Uploads

Files go straight from the browser to Cloudinary using a signature minted
server-side — the API secret never reaches the client and the bytes never pass
through a lambda. Cloudinary does the resizing and format conversion on
delivery, so we never upload a resized copy. JPEG, PNG, WebP and AVIF up to
10MB, checked before a byte is sent.

Inline images accept a file picker, drag-and-drop, or a pasted screenshot, and
store `width`, `height`, `publicId` and `blurDataURL` on the node. **Alt text is
required on insert.** Without stored dimensions the article shifts as images
load, which breaks the zero-CLS criterion.

### Cropping and distortion

Covers are **4:5 in all three places they appear** — article hero, grid card,
OG image — so the grid never goes ragged.

The hero is **constrained to 1100px, not full-bleed at 100vw**. It used to be
`100vw` inside a `21/9` box, which pushed a 4:5 portrait through
`object-fit: cover` into a narrow horizontal band and cut the subject's head
off, while also serving a much larger file on a wide monitor.

Where a crop is unavoidable it is deliberate: a **focal point** stored on the
image drives `object-position`. Note that it only moves the axis that actually
overflows — a landscape source in a portrait box crops horizontally, so
`focalX` is the live axis there and `focalY` does nothing.

Inline body images are **never cropped**: the stored dimensions set a true
`aspect-ratio`, `object-fit` is `contain`, and height is capped at `85vh`.
`object-fit: fill` is banned outright and checked by `npm run audit:perf`.

## The admin

**The admin has its own palette. The public site does not.**

It is a light, dashboard-structured workspace — a dark left rail, a warm plane,
white cards, and colour on status indicators so a queue can be scanned in one
glance. That is a deliberate reversal of the site's monochrome rule, scoped
strictly to `/admin/*`, because the admin is a tool rather than a brand surface.

Tokens live in `app/admin/admin.css`, imported by `app/admin/layout.tsx` and
nowhere else, and every declaration is additionally scoped under `.admin`.
`npm run audit:admin-colour` proves the separation four ways: no public source
references an admin token or class, the admin uses only its own palette, admin
tokens are confined to their own built CSS chunk, and — with `AUDIT_BASE_URL`
set — no public page loads that stylesheet.

Two things learned building it:

- **Tailwind arbitrary values leak.** An arbitrary utility referencing an admin
  token compiles into the *shared* stylesheet, putting admin token names into
  the public site's CSS even though they never resolve there. Admin styling uses
  real classes (`.a-card`, `.a-border`, `.a-pill`) defined in `admin.css`
  instead. Tailwind also scans markdown, so this very paragraph reintroduced the
  leak once it named the class — `globals.css` now carries
  `@source not "../**/*.md"`, and the audit strips comments before scanning.
- **Grain is public-site brand texture.** It was mounted in the root layout and
  was rendering over the admin's white cards; it now lives in the site layout.

### Colour rules

Status is **never hue alone**: every state is a tinted ground at 12%, a solid
dot, and a label in ink. `#FAB219` is 1.83:1 as text on white — as a pill label
in ink on its own tint it is 18.3:1.

Categorical chart series are capped at **three** — slots blue `#2A78D6`, orange
`#EB6834`, aqua `#1BAF7A`. A fourth category folds into "Other", it never
becomes a fourth hue. Slot 3 is 2.82:1 on white, under the 3:1 bar, so every
chart it appears in carries visible direct labels.

`--admin-muted` (#898781) is **3.59:1 on white and therefore under AA for small
text**. It is used only for chart axis ticks, where the value is always repeated
in a tooltip or a direct label; anything a reader must actually read uses
`--admin-ink-2` at 7.94:1.

No dual-axis charts, no pie charts, no donut gauges. Two measures at different
scales get two charts.

### Structure

Dashboard opens with **Needs attention** — pending submissions, drafts, and
events inside seven days — because a publication with eight articles is a queue
to work, not a dataset to analyse. Charts sit below it.

Articles, Events and Submissions share one `ListTable`: filter chips with
counts, 56px rows, a floating dark bulk bar once anything is selected, and a
right-hand detail panel so reviewing an item never costs your place in the
table. Submissions also have a card grid, since the work is visual.

The editor (`/admin/articles/[id]`) collapses the rail to icons and drops the
right rail — it is the one screen that wants width.

## Typography

| Role | Font | Loaded via |
|---|---|---|
| Display | **Zodiak** (400) | `next/font/local` from `assets/fonts` |
| UI / body | **Satoshi** (400, 500) | `next/font/local` |
| Body bold | **Satoshi** (700) | `next/font/local`, `preload: false` |
| Meta / labels | **JetBrains Mono** (400) | `next/font/google` |

Zodiak and Satoshi are Fontshare faces, so they are vendored as `.woff2` rather
than pulled from Google Fonts. Only the weights actually used are shipped —
Satoshi Bold is reachable only through `<strong>` in article prose, so it is
declared separately and kept off the critical preload path. The `.ttf` copies in
the same folder are for Satori, which renders the OG cards and cannot read
`woff2`.

## The hero

Two elements: the wordmark, and an animated **Adinkra mark** right of centre.
The magazine cover stack it replaced carried cycling state, scroll wiring and
drag handling; none of that survives, so the hero is now a server component.

The mark is inline SVG animated with transform, opacity and `stroke-dashoffset`
only — no canvas, no WebGL, no library. Rotation is a CSS keyframe, so the
compositor drives it and it costs nothing per frame. Under
`prefers-reduced-motion` it rests fully drawn and completely still.

**Its geometry is data.** `data/adinkra.ts` holds the paths, stroke widths and
spin rates; the client's real glyph drops in there without touching the
animation. What ships today is a deliberately generic placeholder.

### The wordmark

It is **92vw, ranged left, with its descender fully visible**.

Earlier builds ran it at 100vw with the bottom 10% clipped. The viewBox is tight
to the glyph bounds, so a box touching the viewport edge means the glyph touches
it too: the `y` sat flush against the right edge with its tail sliced off and
the mark read as **"blacktivitu"**. A box-geometry check passed that state,
because the box was fine — it was the glyph that wasn't.

`npm run check:wordmark` now asserts zero clipping on every edge at eight
widths from 360 to 3440.

## Article display

Articles are cells in a continuous hairline table. Each cell carries `border-r`
and `border-b` and the container the opposite two edges, so adjacent rules never
double up.

Card titles are **Satoshi Medium, not Zodiak** — a high-contrast display serif
falls apart at 18-20px. Zodiak is reserved for section headings and article
pages, where it has room.

Nothing moves on hover: the cell ground lifts to `--paper-raised` and the image
comes to colour, but there is no lift or scale. Movement inside a bordered grid
breaks the table. Grid cells rest grayscale and come to colour on hovering the
cell — unlike the hero and roster, which come to colour on scroll-into-view. In
a table, the hover is the event.

The grayscale crossfade renders two `<img>` per image. It does **not** double
the payload: the browser dedupes identical `src`, so 30 `<img>` elements on the
homepage resolve to 6 network requests. The cost is one extra decode, which is
the trade being made to keep `filter` off the animated path.

`/articles` filters **client-side over already-fetched data** — no route change,
no refetch, no spinner — and loads nine at a time rather than paginating.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · MongoDB Atlas via
Mongoose · `motion` · Lenis · Tiptap · Cloudinary · `jose` + `bcryptjs` · Zod ·
deployed on Vercel.

## Getting started

```bash
npm install                  # use --maxsockets=1 on a slow connection
cp .env.example .env.local   # fill in the values
npm run seed                 # realistic placeholder content + 90 days of analytics
npm run dev
```

> **`npm run seed` is destructive.** Every step begins with `deleteMany({})`.
> It refuses to run against any non-local host; override only if you are
> certain, with `SEED_ALLOW_REMOTE=yes npm run seed`.

Admin panel: `/admin/login`, using `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Without an Atlas cluster

`npm run dev:mongo` starts an in-memory MongoDB on port 27717 and writes the URI
to `.mongo-uri`. Point `MONGODB_URI` at it to run and seed locally. It is a
development convenience only — production always uses Atlas.

## Environment

See `.env.example`. Every value is required in production except the Cloudinary
keys, without which the admin image uploader falls back to pasting URLs.

`NEXT_PUBLIC_SITE_URL` drives every absolute URL (canonicals, OG images,
sitemap), so set it to the deployed origin — there is no hard-coded domain.

## Where things live

| Path | What |
|---|---|
| `app/(site)/` | Public site |
| `app/admin/` | Admin panel (guarded by `middleware.ts`) |
| `app/api/` | Route handlers — all Zod-validated |
| `components/ui/` | Design-system primitives |
| `components/motion/` | Motion primitives |
| `data/team.ts` | **The roster — edit this file to change it.** Not in the database. |
| `data/covers.ts` | **The hero cover stack** — swap in the real artwork here |
| `data/seed-content.ts` | Every placeholder image URL, in one place |
| `lib/` | DB, auth, queries, analytics, validation |
| `models/` | Mongoose schemas |

## Analytics

Custom, first-party, no third-party script.

- **Client** (`lib/analytics.ts`): events queue and flush via `sendBeacon` every
  30s and on tab-hide. Heartbeats every 15s, but only while the tab is visible,
  so a backgrounded tab cannot inflate time-on-page. One delegated click listener
  records only elements carrying `data-track="label"`.
- **Server** (`POST /api/track`): accepts a batch, filters bots, derives device
  and country, and stores `sha256(ip + userAgent + daily-rotating salt)`. **No raw
  IP is ever stored.** Because the salt rotates daily the hash cannot re-identify
  anyone across days — hence no cookie banner. Always returns `204`.
- **Retention**: a TTL index expires raw events after 90 days.
- **Rollup**: a Vercel Cron job hits `/api/cron/rollup` at 02:00 UTC (guarded by
  `CRON_SECRET`) and aggregates the previous day into one `DailyStat` document.
- **Dashboard**: reads `DailyStat` — ~30 documents for a month, not millions of
  raw events. Only today's figures are computed live.

Charts are hand-rolled SVG. Series are differentiated by **stroke weight, dash
pattern and opacity — never by hue.**

To re-run a missed day: `GET /api/cron/rollup?date=YYYY-MM-DD` with the
`Authorization: Bearer $CRON_SECRET` header.

## Scroll performance

Scroll cost is measured, not assumed. `npm run perf:scroll` records a real
scroll with the same tracing categories DevTools uses and reports frame pacing
plus how much time went to Layout / Paint / Raster. A healthy scroll is almost
entirely compositing.

Measured on a production build (`next build && next start`), homepage, ~4s
scroll:

| | before | after |
|---|---|---|
| median frame | 33.3 ms | **16.7 ms** |
| frames > 32 ms | 243 / 243 | **2 / 244** |
| rasterization | 2910 ms | **149 ms** |

`/articles` at 4x CPU throttle: median 16.7 ms, worst frame 18.7 ms, **zero**
frames over 32 ms.

#### What blocked LCP

Nothing to do with image bytes: the covers finish downloading ~60 ms in. Three
things delayed the *paint*, all found by ablation.

1. **`PageTransition` rendered a full-viewport black panel and wrapped all
   children in `opacity: 0`.** The server-rendered HTML was a black rectangle
   over invisible content until React hydrated — with JS disabled the page was
   permanently black. The overlay is now mounted by an effect and only on an
   actual route change; children are never wrapped in an animated opacity.
   **Anything that covers or hides the document must be mounted client-side,
   never server-rendered.**
2. **`loading.tsx` put the whole page behind a Suspense boundary.** Even for a
   statically prerendered route, the hero was serialized into a `<template>`
   and swapped in by script. Removed — for a static route the skeleton buys
   nothing and defers the real content.
3. **A back cover card was the LCP element.** LCP is scored on the axis-aligned
   bounding box, and the cards are rotated: at a 0.04 scale falloff the
   2.6-degree rotation on the depth-1 card made its box *larger* than the front
   card's (104,857px2 vs 104,106px2), so the LCP element was a card with no
   preload. The falloff is 0.075 for that reason.

Static-importing the covers removed the cold-cache variance (LCP spread went
from 2.4-4.0 s to under 0.1 s between runs) and gives a real `blurDataURL`, but
was not itself the win. AVIF vs WebP made no measurable difference; AVIF stays.

#### What caused the scroll jank, in order of size — by ablation, not guesswork:

1. **The sticky hero container.** Making it static dropped raster from 277ms to
   48ms on its own. A stuck element that is not layer-promoted repaints every
   frame, and this one held six large covers. Fixed by removing pinning
   entirely.
2. **`mix-blend-mode` on the grain overlay.** A fixed, full-viewport blended
   element cannot be GPU-cached, so the whole viewport re-composites every
   frame. Replaced with a pre-rasterized tiling PNG at flat opacity
   (`scripts/build/make-grain.mjs` generates it).
3. **Animated `filter: grayscale()`.** Not compositor-accelerated — every frame
   of every transition repaints the image. Replaced with a two-layer crossfade
   where the filter is static and only `opacity` animates.
4. **Wide blurred `box-shadow` on the moving cards.** Reduced to a tight,
   low-blur shadow.

Also enforced, and checked by the greps in `npm run audit:perf`:

- No `mix-blend-mode`, no `backdrop-filter`, no animated `filter` anywhere.
- Lenis is created once, shares Motion's frame loop rather than opening a second
  `requestAnimationFrame`, runs `syncTouch: false` and `autoRaf: false`, and is
  skipped entirely on coarse pointers and under reduced motion. It is mounted on
  the public site only — the admin keeps native scroll.
- No scroll listeners, no layout reads (`getBoundingClientRect` and friends) and
  no `will-change` anywhere. Scroll position never enters React state: the hero
  reads a MotionValue and sets state only when the derived card index actually
  changes.

## Checks must assert the property, not a proxy

Three checks on this project passed while the thing they guarded was broken.
Each encoded something that merely correlated with the property wanted:

| check | asserted | should have asserted |
|---|---|---|
| `check:wordmark` | zero pixels clipped | a real **margin** inside each edge — flush is the failing state, because the viewBox is tight to the glyph |
| `check:raf` | an absolute callback count | a **delta against a known-idle baseline** — 180/3s is Lenis doing its job, and the check blamed ClickSpark |
| `check:text` | `getClientRects().length` for line count | **distinct vertical positions** of the word spans — a block element returns one rect however many lines it renders |

`audit:perf` had the same shape of gap: it grepped source text, which cannot see
a property injected at runtime by a library or written inline by Motion. It now
also reads **computed styles on four rendered pages**, and that phase is proven
to catch an injected `mix-blend-mode` a grep never would.

The rule: **a check that encodes the wrong invariant is worse than no check**,
because it converts an open question into false confidence. Every check here has
a negative test — it is run against a deliberately broken state and must fail.

## Readable at rest

**No content may be invisible in its resting state.** Every animated text block
must read correctly if JavaScript fails, if an observer never fires, or if a bot
never scrolls. `npm run audit:text` enforces it across five pages, with JS on and
off: nothing may compute below 0.5 effective opacity, nothing may sit translated
outside an `overflow-hidden` ancestor, and no string may render twice.

This has been broken three separate ways, which is why it is now a check rather
than a convention:

- `PageTransition` server-rendered a full-viewport black panel over content at
  `opacity: 0`.
- `ScrollReveal` translated each word 110% inside a mask, so the words sat
  entirely outside their own boxes — selectable, copyable, invisible.
- `Reveal` and `DisplayHeading` wrote Motion's `initial` (`opacity: 0`, or a
  masked line) into the server markup.

The rule that came out of it: **Motion writes `initial` into SSR**, so any
component whose start state is hidden must mount after hydration and let the
server send the finished content. All four now do.

Animated text also exists **once** in the DOM. A visually-hidden "accessible
copy" beside an animated one means selecting a heading copies it twice, which is
what a reader actually reported. `TextType` splits a single string into typed
and not-yet-typed halves — the box stays reserved because the whole string is
always present — and `ScrollReveal`'s word spans are the real text, with spaces
between the spans rather than inside them.

## Interactive components

Three are in use; the fourth was rejected.

**ClickSpark** — a click burst on the paper ground, ink-coloured, never a hue.
Its loop starts on click and **stops when the last spark expires**; the stock
component schedules rAF unconditionally and burns a frame callback for the life
of the page. `npm run check:raf` proves it: with Lenis unmounted the page issues
**zero** rAF callbacks at rest.

**ScrollReveal** — short display text only (section headings, the About lead,
the submission CTA), never article body. Built on **Motion rather than GSAP +
ScrollTrigger**, which removes three of its four defects outright: no
`filter: blur()` (an animated filter, which `audit:perf` forbids), no global
`ScrollTrigger.getAll().kill()` tearing down other components' triggers, and no
second rAF to desync from Lenis. The fourth defect — `baseOpacity: 0.1` leaving
text unreadable if the trigger never fires — is fixed twice: **opacity is never
animated** (each word is masked and translated at full opacity, the same
vocabulary the display headings use), and the animated spans mount only after
hydration so the server sends the finished sentence. Lighthouse scores the
resting state, so a faded start is a real contrast failure, not a theoretical
one — it cost 4 accessibility points before this was fixed.

**TextType** — one short line, never an `h1` or anything SEO depends on, since
it renders client-side. The box is reserved by a hidden full-width copy so
typing cannot reflow the page, a visually-hidden copy carries the full string
for screen readers, `loop` is off, and the caret only exists while typing.
Without JavaScript the whole line is simply present.

**ElasticMesh — not used.** It replaces the `<img>` with a `<canvas>`, and the
article cover is the LCP element with alt text, a blur placeholder and the AVIF
pipeline; a canvas has none of those. Its loop also never stops, and one WebGL
context per grid card would exhaust the browser's limit. The hero slot it was
proposed for is now the SVG mark, which costs nothing.

## Motion rules

`transform` and `opacity` only — never `width`, `height`, `top`, `left` or
`margin`. Expo-out `cubic-bezier(0.16, 1, 0.3, 1)`, 300–600ms, 40–60ms stagger.
Headlines reveal by masked line, never letter-by-letter. Everything is wrapped in
`prefers-reduced-motion: reduce`, and Lenis smooth scroll is disabled on touch.

## Checks

```bash
npm run typecheck
npm run audit:colour   # no colour outside the token list
npm run audit:perf     # no blend modes, backdrop-filter, animated filters,
                       # scroll listeners, layout reads or will-change
npm run audit:images   # every placeholder image URL still resolves
npm run audit:motion   # reduced-motion leaves nothing animating or invisible
npm run audit:grain    # grain is actually painting on the light ground
npm run perf:scroll <url> <label> [cpuThrottle]   # frame pacing + paint cost
```

`audit:images` exists because a dead Unsplash id ships a broken image straight
to the client and is invisible in code review — one had already crept in. It
checks a few URLs at a time with retries; firing all thirty at once gets the
connections throttled and reports healthy URLs as broken.

`perf:scroll` needs a real window to report meaningful frame pacing — prefix it
with `HEADED=1`. Headless Chrome is vsync-capped at 30fps and rasterizes in
software, so both its frame times and its raster totals are misleading.

`scripts/visual/` also holds `shot.mjs` (screenshots at real breakpoints, and
reports any element wider than the viewport) and `lcp.mjs` (LCP element and
timing under emulated 4G + 4x CPU). All of these drive the installed Chrome via
`puppeteer-core` and are dev-only — nothing in `scripts/` is bundled.

### Core Web Vitals from real readers

`useReportWebVitals` reports LCP, INP, CLS, TTFB and FCP through the existing
`/api/track` endpoint as a `vital` event — same queue, same `sendBeacon` flush,
same bot filtering, same 90-day TTL, no new infrastructure. The nightly rollup
stores **p75** per metric in `DailyStat.vitals`, and the admin dashboard shows
it under *Core Web Vitals*.

p75 is the percentile Core Web Vitals is actually scored against. p75 values
from different days cannot be averaged into a true p75, so the range view
weights each day by its sample count — which is why the sample count is shown
next to every reading.

Note that `isBot()` matches `headless` and `lighthouse`, so lab runs never
pollute field data. It also means any browser automation must present a real
user agent or its events are silently dropped.

### Lighthouse, as measured

Against a local production build (`next start`), mobile, simulated throttling:

| | |
|---|---|
**Use `--throttling-method=devtools`.** Lighthouse's default `simulate` mode
models the network from a dependency graph and gets a localhost origin badly
wrong — it reports ~3.7 s LCP here and cannot even identify the LCP element,
while real throttling on the same build reports 1.8 s. Three runs, real
throttling, mobile:

| | |
|---|---|
| Performance | **98** |
| LCP | **1.8 s** |
| FCP | **1.7 s** |
| TBT | **110–130 ms** |
| CLS | **0.001** |

Measured independently with a real 4G profile and 4x CPU throttling: FCP 876 ms
and **LCP 876 ms** — the largest paint now happens at first paint.

**Still unverified on real hosting.** Re-run against the Vercel preview and
PageSpeed Insights before treating these as final.

## Deploying

Push to Vercel, set the environment variables, and run `npm run seed:admin` once
against the production database to create the admin account. `vercel.json`
already registers the nightly cron.
