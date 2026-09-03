import Link from "next/link";
import { SITE } from "@/lib/constants";
import Marquee from "@/components/ui/Marquee";
import Wordmark from "@/components/brand/Wordmark";

const COLUMNS = [
  {
    title: "Read",
    links: [
      { href: "/articles", label: "Articles" },
      { href: "/events", label: "Events" },
      { href: "/creatives", label: "Creatives" },
    ],
  },
  {
    title: "Studio",
    links: [
      { href: "/about", label: "About" },
      { href: "/submit", label: "Submit work" },
    ],
  },
];

/**
 * Black ground. On the homepage this sits directly beneath the submission CTA
 * with no light section between them, so the two read as one continuous base —
 * hence padding rather than a top margin.
 */
export function Footer() {
  return (
    <footer className="on-void">
      <Marquee
        items={[
          "EST 2025",
          "ACCRA — GHANA",
          "EDITION 02",
          "#IGOTBLACKTIVITY",
          "CREATIVE STUDIO",
          "ISSUE 06",
        ]}
      />

      <div className="mx-auto grid max-w-[1600px] grid-cols-4 gap-y-12 px-(--gutter) py-20 md:grid-cols-12">
        <div className="col-span-4 md:col-span-5">
          <Wordmark className="w-full max-w-[420px] text-fg" title={SITE.name} />
          <p className="mono mt-4 text-fg-muted">Accra, Ghana — {SITE.established}</p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} className="col-span-2 md:col-span-2">
            <p className="mono mb-5 text-fg-dim">{col.title}</p>
            <ul className="flex flex-col gap-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="mono text-fg-muted transition-colors duration-300 hover:text-fg"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="col-span-4 md:col-span-3">
          <p className="mono mb-5 text-fg-dim">Elsewhere</p>
          <a
            href={`https://instagram.com/${SITE.ig}`}
            target="_blank"
            rel="noreferrer noopener"
            data-track="footer-instagram"
            className="mono text-fg-muted transition-colors duration-300 hover:text-fg"
          >
            Instagram — @{SITE.ig} ↗
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 border-t border-rule px-(--gutter) py-6 md:flex-row md:items-center md:justify-between">
        <p className="mono text-fg-dim">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
        <p className="mono text-fg-dim">{SITE.edition}</p>
      </div>
    </footer>
  );
}

export default Footer;
