import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The utilitarian label lifted from the covers: EST 2025, EDITION 02, ISSUE 04.
 * Mono, uppercase, 0.15em tracking. Use liberally — it is the brand callback.
 */
export function MonoLabel({
  children,
  as: Tag = "span",
  dim = false,
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  dim?: boolean;
  className?: string;
}) {
  return (
    <Tag className={cn("mono", dim ? "text-fg-muted" : "text-fg", className)}>
      {children}
    </Tag>
  );
}

export default MonoLabel;
