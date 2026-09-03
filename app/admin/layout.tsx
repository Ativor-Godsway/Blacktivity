import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import "./admin.css";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Blacktivity Admin" },
  robots: { index: false, follow: false },
};

/**
 * The admin is a light, dashboard-structured workspace — deliberately NOT the
 * public site's paper/void monochrome. It is a tool, and colour on status
 * indicators lets a queue be scanned in one glance.
 *
 * `admin.css` is imported here and nowhere else, so its tokens are code-split
 * onto admin routes and never reach the public stylesheet.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className={`${fontVariables} admin min-h-dvh`}>{children}</div>;
}
