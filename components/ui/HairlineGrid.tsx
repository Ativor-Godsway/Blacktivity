"use client";

import { cn } from "@/lib/utils";

/**
 * The 12-column grid, made visible. Showing the grid is a design decision,
 * not scaffolding. Hairlines are 1px at white/10.
 */
export function HairlineGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 hidden md:grid",
        "grid-cols-12",
        className,
      )}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="border-l border-grid last:border-r" />
      ))}
    </div>
  );
}

/** Page-wide fixed version, sitting behind all content. */
export function HairlineGridFixed() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden px-(--gutter) md:block"
    >
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-12">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="border-l border-grid last:border-r" />
        ))}
      </div>
    </div>
  );
}

export default HairlineGrid;
