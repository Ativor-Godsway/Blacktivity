import type { ReactNode } from "react";
import MonoLabel from "@/components/ui/MonoLabel";

export function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-rule p-5">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <MonoLabel>{title}</MonoLabel>
        {note ? <MonoLabel dim>{note}</MonoLabel> : null}
      </div>
      {children}
    </section>
  );
}

export default Panel;
