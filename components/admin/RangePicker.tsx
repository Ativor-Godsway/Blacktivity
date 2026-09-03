"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

export function RangePicker({ value }: { value: number }) {
  const router = useRouter();
  const params = useSearchParams();

  function choose(days: number) {
    const next = new URLSearchParams(params.toString());
    next.set("range", String(days));
    router.push(`?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Date range">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => choose(r)}
          aria-pressed={value === r}
          className={cn("a-chip")}
        >
          {r} days
        </button>
      ))}
    </div>
  );
}

export default RangePicker;
