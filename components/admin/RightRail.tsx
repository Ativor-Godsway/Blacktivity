"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contextual 320px rail. Hidden entirely below 1280px — everything it holds is
 * either duplicated in the main column or non-essential, which is the rule for
 * putting anything here at all.
 */
export function RightRail({ title, children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-l xl:block",
        open ? "w-[320px]" : "w-[52px]",
      )}
      style={{ borderColor: "var(--admin-rule)", background: "var(--admin-surface)" }}
      aria-label={title ?? "Details"}
    >
      <div className="sticky top-0 max-h-dvh overflow-y-auto">
        <div
          className={cn(
            "flex items-center gap-2 border-b px-4 py-4",
            !open && "justify-center px-0",
          )}
          style={{ borderColor: "var(--admin-rule)" }}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="a-muted text-sm hover:a-ink"
          >
            <span aria-hidden="true">{open ? "»" : "«"}</span>
            <span className="sr-only">{open ? "Collapse panel" : "Expand panel"}</span>
          </button>
          {open && title ? <span className="a-meta">{title}</span> : null}
        </div>

        {open ? <div className="p-4">{children}</div> : null}
      </div>
    </aside>
  );
}

export default RightRail;
