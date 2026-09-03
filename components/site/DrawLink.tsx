import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Mono link whose hairline underline draws left-to-right on hover. */
export function DrawLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group mono relative inline-block pb-1 text-fg", className)}>
      {children}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-fg transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
    </Link>
  );
}

export default DrawLink;
