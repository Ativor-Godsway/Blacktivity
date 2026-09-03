import type { ReactNode } from "react";
import AdminNav from "./AdminNav";
import MonoLabel from "@/components/ui/MonoLabel";

export function AdminShell({
  name,
  title,
  actions,
  children,
}: {
  name: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <AdminNav name={name} />
      <main className="px-6 py-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
          <div>
            <MonoLabel dim>Blacktivity</MonoLabel>
            <h1 className="display mt-2 text-4xl md:text-5xl">{title}</h1>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {children}
      </main>
    </>
  );
}

export default AdminShell;
