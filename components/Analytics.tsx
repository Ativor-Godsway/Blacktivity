"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { startAnalytics, trackPageview } from "@/lib/analytics";

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    startAnalytics(pathname);
  }, [pathname]);

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return null;
}

export default Analytics;
