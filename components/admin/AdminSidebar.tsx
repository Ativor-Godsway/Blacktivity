"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [collapsedPref, setCollapsed] = useState(defaultCollapsed);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "1");
    } catch {
      /* storage disabled — the default stands */
    }
  }, []);

  // On a phone the 240px rail left the workspace ~100px wide and pushed the
  // page sideways (Revision 26, measured at 390). Below 768 it is always the
  // 68px icon rail, whatever was stored on a wider screen.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const collapsed = narrow || collapsedPref;

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
        // The CSS width also applies before hydration, so a phone never
        // paints the wide rail first.
        collapsed ? "w-[68px]" : "w-[68px] md:w-[240px]",
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
                // Collapsed, the icon is all that shows: a tooltip for the
                // pointer and an accessible name for everyone else.
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "a-rail-item relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors",
                  collapsed && "justify-center px-0",
                )}
              >
                <span aria-hidden="true" className="a-rail-icon">
                  {item.icon}
                </span>
                {collapsed ? null : <span className="flex-1">{item.label}</span>}
                {item.badge && pendingCount > 0 ? (
                  <span
                    className={cn(
                      "a-num rounded-full text-[12px] leading-none text-[#2a211a]",
                      collapsed
                        ? "absolute top-1 right-1 size-[18px] grid place-items-center"
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
            className="grid size-7 flex-none place-items-center rounded-full bg-white/15 text-[12px] font-medium"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
          {collapsed ? null : (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px]">{name}</span>
              <span className="a-rail-sub block truncate text-[12px]">{email}</span>
            </span>
          )}
        </div>

        {/* ACCOUNT sits beside sign-out — Revision 25 §3.1. */}
        <div className="mt-1 flex flex-col gap-0.5">
          <Link
            href="/admin/account"
            aria-current={pathname.startsWith("/admin/account") ? "page" : undefined}
            title={collapsed ? "Account" : undefined}
            aria-label={collapsed ? "Account" : undefined}
            className={cn(
              "a-rail-item flex items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] uppercase tracking-[0.08em] whitespace-nowrap",
              collapsed && "justify-center px-0",
            )}
          >
            <span aria-hidden="true" className="a-rail-icon">◉</span>
            {collapsed ? <span className="sr-only">Account</span> : "Account"}
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            title={collapsed ? "Sign out" : undefined}
            aria-label={collapsed ? "Sign out" : undefined}
            className={cn(
              "a-rail-item flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] uppercase tracking-[0.08em] whitespace-nowrap disabled:opacity-50",
              collapsed && "justify-center px-0",
            )}
          >
            <span aria-hidden="true" className="a-rail-icon">⎋</span>
            {collapsed ? <span className="sr-only">Sign out</span> : signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>

        <button
          type="button"
          onClick={toggle}
          hidden={narrow}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : undefined}
          className={cn(
            "a-rail-item mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px]",
            collapsed && "justify-center px-0",
          )}
        >
          <span aria-hidden="true" className="a-rail-icon">
            {collapsed ? "»" : "«"}
          </span>
          {collapsed ? <span className="sr-only">Expand sidebar</span> : "Collapse"}
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
