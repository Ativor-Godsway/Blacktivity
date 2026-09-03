import { cn } from "@/lib/utils";

/** A 1px hairline. The site's punctuation mark. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn("h-px w-full border-0 bg-fill-strong", className)} />;
}

export default Rule;
