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

A **cover stack**: the magazine covers treated as physical objects.

- **Layer 0** — the wordmark, spanning the full viewport width with its bottom
  edge clipped by the fold. The largest element on the site.
- **Layer 1** — the covers, offset to 60% of the viewport width so they clip the
  *tops* of the letterforms rather than the middle of the word.
- **Layer 2** — mono micro type at the edges, plus a rotated `01 — 06` counter.

**The hero is never pinned, on any breakpoint.** It is exactly `100svh` and the
stack cycles from how far the hero has scrolled out of view
(`useScroll`, `offset: ['start start', 'end start']`). The previous build used a
600vh section with a sticky inner container; measured against a production
build, that sticky container alone accounted for a ~6x increase in
rasterization during scroll. Pinning also fights the collapsing URL bar on iOS
Safari. `svh` rather than `vh` for the same reason — `vh` is measured against
the expanded viewport and shifts the layout when the bar collapses.

Mobile renders 3 cards rather than 6: fewer large composited layers.

Two hero numbers are measured, not chosen, and both are in the code comments:

- The wordmark is **exactly 100vw**. The viewBox is tight to the glyph bounds,
  so any horizontal bleed slices the tail off the `y`.
- The bottom clip is **10%** from `md` up, not the third originally specified.
  `y` is the word's only descender and its tail occupies the bottom ~12%;
  clipping a third renders the mark as "blacktivitu". Legibility is what the
  deeper crop was meant to buy, so it wins. Below `md` the clip drops to ~4%:
  the crop is proportional, and 10% of an 83px-tall mark leaves too little of
  that tail to read.

Reduced motion gets a static fanned stack with no cycling.

The stack contents live in `data/covers.ts`. **When the real Instagram artwork
arrives, replace `image` and set `placeholder: false`** — that switches off the
generated masthead overlay and renders the artwork clean. Nothing else changes.

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
