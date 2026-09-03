import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] px-(--gutter)", className)}>
      {children}
    </div>
  );
}

/** A 12-column grid row matching the visible hairline grid. */
export function Grid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid grid-cols-4 gap-x-(--gutter) md:grid-cols-12", className)}>{children}</div>;
}

export default Container;
