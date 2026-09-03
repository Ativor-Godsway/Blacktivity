import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  title,
  note,
  action,
  padded = true,
  className,
  children,
}: {
  title?: string;
  note?: string;
  action?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("a-card", className)}>
      {title ? (
        <header
          className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
          style={{ borderColor: "var(--admin-rule)" }}
        >
          <div className="flex items-baseline gap-3">
            <h2 className="text-[13.5px] font-medium">{title}</h2>
            {note ? <span className="a-muted text-[12px]">{note}</span> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/**
 * Designed empty state. Every list gets one — a blank table with headers reads
 * as a broken product, which matters more here than usual because this admin
 * legitimately holds eight articles.
 */
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-[14px] font-medium">{title}</p>
      {body ? <p className="a-ink2 max-w-[42ch] text-[13px]">{body}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export default Card;
