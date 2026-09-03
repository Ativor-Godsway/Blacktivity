import { cn } from "@/lib/utils";

/**
 * Slow horizontal marquee of mono labels. Pure CSS transform animation, so it
 * runs off the compositor and stops entirely under reduced-motion.
 */
export function Marquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  const doubled = [...items, ...items];
  return (
    <div
      className={cn("relative overflow-hidden border-y border-rule py-4", className)}
      aria-hidden="true"
    >
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="mono px-8 text-fg-muted whitespace-nowrap">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Marquee;
