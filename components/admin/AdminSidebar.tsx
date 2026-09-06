"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Wordmark from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▤", exact: true },
  { href: "/admin/articles", label: "Articles", icon: "¶" },
  { href: "/admin/rotation", label: "Rotation", icon: "◎" },
  { href: "/admin/events", label: "Events", icon: "◷" },
  { href: "/admin/submissions", label: "Submissions", icon: "⇱", badge: true },
  { href: "/admin/analytics", label: "Analytics", icon: "◨" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

const STORAGE_KEY = "blacktivity:admin:rail";

/**
 * Fixed left rail. Collapses to icons — the editor collapses it by default,
 * since that screen wants width more than navigation.
 */
export function AdminSidebar({
  name,
  email,
  pendingCount,
  defaultCollapsed = false,
}: {
  name: string;
  email: string;
  pendingCount: number;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "1");
    } catch {
      /* storage disabled — the default stands */
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh flex-none flex-col justify-between transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[240px]",
      )}
      style={{ background: "var(--admin-sidebar)", color: "var(--admin-plane)" }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("flex items-center px-4 pt-6 pb-8", collapsed && "justify-center px-2")}>
          <Link href="/admin" aria-label="Blacktivity admin — dashboard">
            {collapsed ? (
              <span className="text-xl font-bold">b</span>
            ) : (
              <Wordmark className="w-[132px]" title="Blacktivity" />
            )}
          </Link>
        </div>

        <nav className="flex flex-col gap-1 px-3" aria-label="Admin">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors",
                  collapsed && "justify-center px-0",
                  active ? "bg-white/[0.14] text-white" : "text-white/60 hover:bg-white/[0.07] hover:text-white",
                )}
              >
                <span aria-hidden="true" className="w-4 shrink-0 text-center opacity-80">
                  {item.icon}
                </span>
                {collapsed ? null : <span className="flex-1">{item.label}</span>}
                {item.badge && pendingCount > 0 ? (
                  <span
                    className={cn(
                      "a-num rounded-full text-[10.5px] leading-none text-[#2a211a]",
                      collapsed
                        ? "absolute top-1.5 right-1.5 size-4 grid place-items-center"
                        : "px-1.5 py-0.5",
                    )}
                    style={{ background: "var(--status-wait)" }}
                  >
                    {pendingCount}
                    <span className="sr-only"> pending submissions</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className={cn("flex items-center gap-3 px-2 py-2", collapsed && "justify-center px-0")}>
          <span
            aria-hidden="true"
            className="grid size-7 flex-none place-items-center rounded-full bg-white/15 text-[11px] font-medium"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
          {collapsed ? null : (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px]">{name}</span>
              <span className="block truncate text-[11px] text-white/45">{email}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] text-white/55 hover:bg-white/[0.07] hover:text-white",
            collapsed && "justify-center px-0",
          )}
        >
          <span aria-hidden="true" className="w-4 shrink-0 text-center">
            {collapsed ? "»" : "«"}
          </span>
          {collapsed ? <span className="sr-only">Expand sidebar</span> : "Collapse"}
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
