import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";

/**
 * Subset to the weights actually used — nothing here ships the full family.
 *
 * Zodiak is only ever set at 400 (the `.display` role), and Satoshi Bold is
 * only reachable inside article prose via <strong>, so bold is declared
 * separately with `preload: false` to keep it off the critical path.
 */
export const zodiak = localFont({
  src: [{ path: "../assets/fonts/Zodiak-400.woff2", weight: "400", style: "normal" }],
  display: "swap",
  variable: "--font-zodiak",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

/** UI / body — regular and medium, both used site-wide. */
export const satoshi = localFont({
  src: [
    { path: "../assets/fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-satoshi",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

/** Bold, for <strong> in long-form copy only. Never preloaded. */
export const satoshiBold = localFont({
  src: [{ path: "../assets/fonts/Satoshi-700.woff2", weight: "700", style: "normal" }],
  display: "swap",
  preload: false,
  variable: "--font-satoshi-bold",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

/** Meta / labels — EST 2025, EDITION 02, 01 — 06. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const fontVariables = [
  zodiak.variable,
  satoshi.variable,
  satoshiBold.variable,
  jetbrainsMono.variable,
].join(" ");
