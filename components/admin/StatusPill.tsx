import { cn } from "@/lib/utils";

/**
 * Status is never conveyed by hue alone: every pill is a tinted ground, a solid
 * dot, and a text label in ink. `#fab219` sits well under 3:1 on white, so it
 * can never be text or the only signal.
 */
export type PillState = "ok" | "wait" | "bad" | "idle";

const LABELS: Record<string, { state: PillState; label: string }> = {
  published: { state: "ok", label: "Published" },
  approved: { state: "ok", label: "Approved" },
  draft: { state: "wait", label: "Draft" },
  pending: { state: "wait", label: "Pending" },
  rejected: { state: "bad", label: "Rejected" },
  past: { state: "idle", label: "Past" },
  upcoming: { state: "ok", label: "Upcoming" },
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const meta = LABELS[status] ?? { state: "idle" as PillState, label: status };
  return (
    <span className={cn("a-pill", className)} data-state={meta.state}>
      {label ?? meta.label}
    </span>
  );
}

export default StatusPill;
