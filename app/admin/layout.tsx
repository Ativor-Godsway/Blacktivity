import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Blacktivity Admin" },
  robots: { index: false, follow: false },
};

/**
 * The admin sits outside the public (site) group and KEEPS THE DARK GROUND
 * while the public site is light. `on-void` re-points the semantic colour
 * tokens for the whole subtree, so every shared component follows without
 * knowing which ground it is on.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className={`${fontVariables} on-void min-h-dvh`}>{children}</div>;
}
