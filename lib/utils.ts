export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** "12 MAR 2026" — mono label style. */
export function formatDateMono(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "03" — index numbers on cards. */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isUpcoming(startDate: Date | string): boolean {
  return new Date(startDate).getTime() >= Date.now();
}

/** YYYY-MM-DD in UTC — the DailyStat key. */
export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function absoluteUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
