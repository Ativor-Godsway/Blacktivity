import "server-only";
import { createHash } from "node:crypto";

/**
 * The salt rotates daily, so a visitorHash cannot be used to re-identify anyone
 * across days. That is what makes honest daily-unique counts possible without a
 * cookie banner — and why a raw IP is never stored.
 */
export function computeVisitorHash(ip: string, userAgent: string, date = new Date()): string {
  const salt = process.env.ANALYTICS_SALT ?? "blacktivity-default-salt";
  const day = date.toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${userAgent}|${salt}|${day}`).digest("hex");
}

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|preview|monitor|scrape|curl|wget|python-requests|axios|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|semrush|ahrefs|dataprovider|node-fetch|go-http/i;

export function isBot(userAgent: string): boolean {
  if (!userAgent) return true;
  return BOT_RE.test(userAgent);
}

export type Device = "mobile" | "tablet" | "desktop";

export function detectDevice(userAgent: string): Device {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

/** Vercel sets x-vercel-ip-country; empty elsewhere. */
export function detectCountry(headers: Headers): string {
  return (headers.get("x-vercel-ip-country") ?? "").slice(0, 2).toUpperCase();
}

/** Referrers are stored as bare hostnames — never full URLs with query strings. */
export function normaliseReferrer(referrer: string, siteHost: string): string {
  if (!referrer) return "";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host === siteHost.replace(/^www\./, "") ? "" : host.slice(0, 100);
  } catch {
    return "";
  }
}
