import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import RightRail from "./RightRail";

/**
 * Left rail + workspace + optional right rail.
 *
 * The right rail is contextual and collapses below 1280px, so nothing
 * essential may live only there — it holds filters, summaries and the
 * live-today panel, all of which are duplicated or non-critical.
 */
export function AdminShell({
  name,
  email,
  pendingCount,
  title,
  subtitle,
  actions,
  rail,
  railTitle,
  collapsedRail = false,
  children,
}: {
  name: string;
  email: string;
  pendingCount: number;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  rail?: ReactNode;
  railTitle?: string;
  collapsedRail?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar
        name={name}
        email={email}
        pendingCount={pendingCount}
        defaultCollapsed={collapsedRail}
      />

      <div className="flex min-w-0 flex-1">
        <main className="min-w-0 flex-1 px-6 py-7 lg:px-8">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[22px] leading-tight font-medium tracking-[-0.01em]">
                {title}
              </h1>
              {subtitle ? <p className="a-ink2 mt-1 text-[13px]">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </header>

          {children}
        </main>

        {rail ? <RightRail title={railTitle}>{rail}</RightRail> : null}
      </div>
    </div>
  );
}

export default AdminShell;
