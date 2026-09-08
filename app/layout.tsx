import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    images: [{ url: "/api/og", width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/api/og"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ede7db",
  colorScheme: "light",
};

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      `suppressHydrationWarning` — Revision 15 §2's pin gate makes this
      necessary, and it is scoped to exactly the element that needs it.

      The gate script in app/(site)/layout.tsx runs BEFORE React hydrates —
      that is its whole purpose, since a pin class applied on hydration would
      shift every section below the hero by 60svh and put CLS on the board. It
      adds `hero-pin` to <html>, so by the time React hydrates, the element's
      className is not the one the server sent, and React reports:

        A tree hydrated but some attributes of the server rendered HTML
        didn't match the client properties.

      Measured, not guessed: at 1440 (gate true) the warning fires; at 390
      (gate false) it does not, with Lenis mounted in both cases. Lenis adds
      its own `lenis` classes to <html> from inside an effect, which runs
      AFTER hydration, so it is not part of this and never was. The next/font
      variables are identical on both sides — React renders those itself.

      This attribute suppression applies ONE LEVEL DEEP, to <html>'s own
      attributes only. It does not reach the tree inside, so a genuine
      mismatch anywhere in the app still reports normally. That narrowness is
      why it is the right tool here rather than a blanket silencing — it is
      the same thing every pre-paint theme script does.
    */
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      {/* Cloudinary serves every real cover and article image once it is
          configured, so warm the connection early. Emitted only when the cloud
          name exists — a preconnect to nowhere costs a DNS lookup for nothing. */}
      {cloudName ? (
        <head>
          <link rel="preconnect" href={`https://res.cloudinary.com`} crossOrigin="" />
          <link rel="dns-prefetch" href={`https://res.cloudinary.com`} />
        </head>
      ) : null}
      <body className="bg-bg text-fg antialiased">
        <a
          href="#main"
          className="mono sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:bg-fg focus:px-4 focus:py-3 focus:text-bg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
