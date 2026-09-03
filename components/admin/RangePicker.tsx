import Link from "next/link";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

export function RangePicker({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-4">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={`/admin?range=${r}`}
          aria-current={r === active ? "page" : undefined}
          className={cn(
            "mono pb-0.5",
            r === active
              ? "border-b border-fg text-fg"
              : "border-b border-transparent text-fg-dim hover:text-fg",
          )}
        >
          {r}d
        </Link>
      ))}
    </div>
  );
}

export default RangePicker;
