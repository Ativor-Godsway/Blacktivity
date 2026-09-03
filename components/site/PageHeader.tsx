import type { ReactNode } from "react";
import MonoLabel from "@/components/ui/MonoLabel";
import DisplayHeading from "@/components/motion/DisplayHeading";

export function PageHeader({
  label,
  lines,
  intro,
  children,
}: {
  label: string;
  lines: string[];
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-rule px-(--gutter) pt-16 pb-12 md:pt-28 md:pb-16">
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
