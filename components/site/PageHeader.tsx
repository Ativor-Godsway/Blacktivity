import type { ReactNode } from "react";
import MonoLabel from "@/components/ui/MonoLabel";
import DisplayHeading from "@/components/motion/DisplayHeading";

/**
 * A section page's masthead.
 *
 * IT DECLARES ITS OWN GROUND — Revision 20 §2.3. Section pages open on a DARK
 * masthead and alternate below it, so `dark` is the default and every page that
 * wants otherwise says so. `/about` is the one that does: the owner asked for
 * "What we are" to be white throughout, so it passes `theme="light"` and the
 * band below it matches.
 *
 * `pb` is padding rather than the border alone carrying the join, because a
 * themed block paints its own background: with a margin the page ground shows
 * through the gap and the alternation breaks into stripes.
 */
export function PageHeader({
  label,
  lines,
  intro,
  children,
  theme = "dark",
}: {
  label: string;
  lines: string[];
  intro?: string;
  children?: ReactNode;
  theme?: "dark" | "light";
}) {
  return (
    <header data-theme={theme} className="border-b border-rule px-(--gutter) pt-16 pb-12 md:pt-28 md:pb-16">
      <div className="mx-auto max-w-[1600px]">
        <MonoLabel dim>{label}</MonoLabel>
        <DisplayHeading as="h1" lines={lines} className="mt-6 text-[clamp(2.75rem,9vw,7rem)]" />
        {intro ? <p className="mt-8 max-w-[52ch] text-fg-muted">{intro}</p> : null}
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </header>
  );
}

export default PageHeader;
