import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * Satori has no system fonts — the display serif and mono must be supplied as
 * buffers or everything silently falls back to sans, which loses the entire
 * brand callback. Read once per lambda and reuse.
 */
let fontCache: { display: Buffer; mono: Buffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;

  const dir = join(process.cwd(), "assets", "fonts");
  const [display, mono] = await Promise.all([
    readFile(join(dir, "Zodiak-400.ttf")),
    readFile(join(dir, "JetBrainsMono-Regular.ttf")),
  ]);

  fontCache = { display, mono };
  return fontCache;
}

/**
 * Must match the tokens in globals.css — the cards are the site, shrunk.
 *
 * These are literals rather than CSS variables because Satori resolves no
 * cascade, so this is the one place in the public site where the palette is
 * duplicated. `npm run audit:colour` reads this file against the same token
 * list as everything else, so a drift here fails the build rather than shipping
 * the wrong brand to every link preview.
 */
const SAND = "#EDE7DB";
const INK = "#2A211A";
const MUTED = "#6B5D50";

/**
 * Warm-neutral OG cards mirroring the magazine-cover layout: mono labels top
 * and bottom, oversized serif headline, a barcode rule. Every shared link
 * becomes brand collateral.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = (searchParams.get("title") ?? `${SITE.name} — ${SITE.tagline}`).slice(0, 110);
  const label = (searchParams.get("label") ?? SITE.established).slice(0, 40);

  // Deterministic "barcode" so a given title always renders the same card.
  const seed = [...title].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bars = Array.from({ length: 42 }, (_, i) => ((seed >> i % 12) % 5) + 1);

  const fontSize = title.length > 70 ? 68 : title.length > 40 ? 84 : 104;

  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          backgroundColor: SAND,
          color: INK,
          padding: "56px 64px",
          fontFamily: "Zodiak",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "JetBrains Mono",
            fontSize: 20,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>
            {SITE.name} — {SITE.tagline}
          </div>
          <div style={{ display: "flex" }}>{label}</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            maxWidth: "94%",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(42,33,26,0.18)",
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontSize: 20,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {SITE.edition} — ACCRA, GHANA
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 46 }}>
            {bars.map((w, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: w,
                  height: i % 7 === 0 ? 46 : 34,
                  backgroundColor: INK,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Zodiak", data: fonts.display, style: "normal", weight: 400 },
        { name: "JetBrains Mono", data: fonts.mono, style: "normal", weight: 400 },
      ],
    },
  );
}
