"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackVital } from "@/lib/analytics";

/**
 * Reports Core Web Vitals from real readers into the existing analytics
 * pipeline. This is the answer to "unverified on device": lab runs use a
 * throttled desktop as a stand-in for a mid-range Android, whereas this
 * measures the actual phones on the actual networks, and keeps doing so after
 * launch.
 *
 * Nothing new is introduced — same queue, same sendBeacon flush, same bot
 * filtering, same 90-day TTL.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (!["LCP", "INP", "CLS", "TTFB", "FCP"].includes(metric.name)) return;
    trackVital(metric.name, metric.value, metric.rating);
  });

  return null;
}

export default WebVitals;
