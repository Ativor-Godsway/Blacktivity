import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const base =
  "mono inline-flex items-center justify-center gap-3 border px-6 py-4 " +
  "transition-colors duration-300 ease-[var(--ease-expo)] disabled:opacity-40 disabled:pointer-events-none";

const variants = {
  solid: "border-fg bg-fg text-bg hover:bg-transparent hover:text-fg",
  outline: "border-rule-strong text-fg hover:border-fg hover:bg-fg hover:text-bg",
  ghost: "border-transparent text-fg-muted hover:text-fg",
} as const;

type Variant = keyof typeof variants;

export function Button({
  variant = "solid",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; children: ReactNode }) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "solid",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; children: ReactNode }) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props}>
      {children}
    </Link>
  );
}

export default Button;
