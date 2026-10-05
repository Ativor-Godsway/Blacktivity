/**
 * THE PRIMARY NAV — ONE LIST, rendered by both the desktop nav and the mobile
 * menu in components/site/Header.tsx — Revision 25 §1.
 *
 * The mobile menu used to be a second hand-written list, and the two drifted:
 * Creatives was dropped from one and not the other, and the order differed.
 * Anything that links to a top-level section reads from here.
 */
export type NavItem = { label: string; href: string; hidden?: boolean };

export const NAV: NavItem[] = [
  // ORDER = the order the sections appear on the home page (app/(site)/page.tsx):
  // cover, What we are, Selected writing, Upcoming events, Rotation, Submit.
  // Keep it that way — if the page is reordered, reorder this.
  { label: "About", href: "/about" },
  { label: "Articles", href: "/articles" },
  { label: "Events", href: "/events" },
  { label: "Rotation", href: "/rotation" },
  { label: "Creatives", href: "/creatives", hidden: true }, // hidden for now. Set false to bring it back
  { label: "Submit", href: "/submit" },
];

export const VISIBLE_NAV = NAV.filter((i) => !i.hidden);

/** True for a route whose nav entry is hidden — footer links and the sitemap drop it too. */
export function isHiddenRoute(href: string): boolean {
  return NAV.some((i) => i.hidden && i.href === href);
}
