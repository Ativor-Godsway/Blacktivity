import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import Track from "@/models/Track";
import { SITE } from "@/lib/constants";
import { volumeLabel } from "@/lib/rotation";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Instagram is the distribution channel, so every shared volume link becomes a
 * cover. This is the inverse of the main OG card: espresso ground with sand
 * type, because Rotation is the section that earns the dark punctuation.
 *
 * Satori resolves no cascade, so the palette is duplicated as literals here —
 * the same exception `/api/og` takes, and `npm run audit:colour` reads this
 * file against the same token list, so a drift fails rather than shipping the
 * wrong brand to every preview.
 */
const ESPRESSO = "#241C16";
const SAND = "#EDE7DB";
const TAN = "#C9B79C";
const MUTED_DARK = "#A2937F";

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

export async function GET(req: NextRequest) {
  const number = Number(req.nextUrl.searchParams.get("volume"));

  let label = "VOL. 01";
  let artists: string[] = [];

  try {
    await dbConnect();
    const volume = Number.isFinite(number)
      ? await ChartVolume.findOne({ number, status: "published" }).select("number chart").lean()
      : await ChartVolume.findOne({ status: "published" }).sort({ number: -1 }).select("number chart").lean();

    if (volume) {
      label = volumeLabel(volume.number);
      const top = (volume.chart ?? [])
        .filter((e) => e.position <= 3)
        .sort((a, b) => a.position - b.position);
      const docs = await Track.find({ _id: { $in: top.map((e) => e.track) } })
        .select("artist")
        .lean();
      const byId = new Map(docs.map((d) => [String(d._id), d.artist]));
      artists = top.map((e) => byId.get(String(e.track))).filter((a): a is string => Boolean(a));
    }
  } catch {
    // A card with the section name still beats a broken preview image.
  }

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
          backgroundColor: ESPRESSO,
          color: SAND,
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
            color: MUTED_DARK,
          }}
        >
          <div style={{ display: "flex" }}>{SITE.name} — Rotation</div>
          <div style={{ display: "flex" }}>{label}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(artists.length > 0 ? artists : ["New music", "The chart", "One curator"]).map(
            (artist, i) => (
              <div
                key={artist}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 24,
                  fontSize: 76,
                  lineHeight: 1.04,
                  letterSpacing: "-0.02em",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontFamily: "JetBrains Mono",
                    fontSize: 24,
                    color: TAN,
                    width: 54,
                  }}
                >
                  {artists.length > 0 ? String(i + 1).padStart(2, "0") : ""}
                </div>
                <div style={{ display: "flex" }}>{artist}</div>
              </div>
            ),
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(237,231,219,0.18)",
            paddingTop: 28,
            fontFamily: "JetBrains Mono",
            fontSize: 20,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: MUTED_DARK,
          }}
        >
          <div style={{ display: "flex" }}>Bi-weekly — Accra, Ghana</div>
          <div style={{ display: "flex" }}>{SITE.edition}</div>
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
