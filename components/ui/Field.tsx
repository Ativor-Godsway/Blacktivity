import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full border-0 border-b border-rule-strong bg-transparent px-0 py-3 text-[15px] " +
  "text-fg placeholder:text-fg-dim transition-colors duration-300 " +
  "ease-[var(--ease-expo)] focus:border-fg focus:outline-none";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="mono text-fg-muted" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mono text-fg-dim">{hint}</p> : null}
      {error ? (
        <p className="mono text-fg" role="alert">
          ↳ {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "resize-none", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "appearance-none rounded-none", className)} {...props}>
      {children}
    </select>
  );
}

export default Field;
