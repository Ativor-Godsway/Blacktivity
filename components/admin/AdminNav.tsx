"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import MonoLabel from "@/components/ui/MonoLabel";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/submissions", label: "Submissions" },
];

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-bg">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
        <Link href="/admin" className="mono text-fg">
          Blacktivity — Admin
        </Link>

        <nav aria-label="Admin" className="flex flex-wrap items-center gap-6">
          {LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "mono pb-0.5 transition-colors duration-200",
                  active
                    ? "border-b border-fg text-fg"
                    : "border-b border-transparent text-fg-muted hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-6">
          <Link href="/" target="_blank" className="mono text-fg-muted hover:text-fg">
            View site ↗
          </Link>
          <MonoLabel dim>{name}</MonoLabel>
          <button type="button" onClick={signOut} className="mono text-fg-muted hover:text-fg">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminNav;
