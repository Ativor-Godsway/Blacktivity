import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * THE standalone navigation action for the public site. One style, used
 * everywhere, so the affordance is learnable.
 *
 * On a page where every label is mono uppercase, a hairline underline does not
 * read as clickable. This is a bordered box that inverts to solid fg on hover
 * AND on keyboard focus — the inversion is unmistakable and costs a single
 * background-color transition.
 *
 * Inline links inside article prose keep the hairline-underline treatment;
 * this is only for "go somewhere" actions.
 */
export function ActionLink({
  href,
  children,
  className,
  arrow = "→",
  back = false,
  ...rest
}: ComponentProps<typeof Link> & {
  children: ReactNode;
  arrow?: string | null;
  /** Renders the arrow before the label and reverses its hover travel. */
  back?: boolean;
}) {
  return (
    <Link
      href={href}
      {...rest}
      className={cn(
        "group mono inline-flex min-h-11 items-center gap-3 border px-6 py-3",
        "transition-colors duration-300 ease-[var(--ease-expo)]",
        // Focus-visible gets the same inversion as hover — this must never be
        // hover-only.
        // No ground-specific branch: `fg` and `bg` already resolve per ground
        // via .on-espresso, so this inverts correctly on sand and on espresso
        // alike. A `tone` prop used to sit here with two identical arms.
        "border-fg text-fg hover:bg-fg hover:text-bg focus-visible:bg-fg focus-visible:text-bg",
        className,
      )}
    >
      {/* A back arrow leads its label; a forward arrow follows it. */}
      {arrow && back ? (
        <span
          aria-hidden="true"
          className="transition-transform duration-300 ease-[var(--ease-expo)] group-hover:-translate-x-1 group-focus-visible:-translate-x-1"
        >
          {arrow}
        </span>
      ) : null}
      {children}
      {arrow && !back ? (
        <span
          aria-hidden="true"
          className="transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-x-1 group-focus-visible:translate-x-1"
        >
          {arrow}
        </span>
      ) : null}
    </Link>
  );
}

export default ActionLink;
