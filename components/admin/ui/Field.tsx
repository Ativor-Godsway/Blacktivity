"use client";

import { useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * THE ADMIN'S FORM CONTROLS — Revisions 25–26.
 *
 * Every field in the admin is built from these, and every colour they use is an
 * --a-* token from admin.css. The public components/ui/Field must never be used
 * in the admin: it paints in --color-fg (#ede7db), which is exactly the admin's
 * ground, so a field built from it shows its value in the page colour.
 * `npm run audit:admin-colour` fails if anything under components/admin or
 * app/admin imports from components/ui.
 */

/** Label + control + hint/error. Pass `describedBy(id, error, hint)` to the control. */
export function AdminField({
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
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="a-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="a-field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="a-field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The aria-describedby value matching what AdminField renders. */
export function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type Invalid = { invalid?: boolean; hint?: ReactNode };

export function TextInput({ className, invalid, hint, ...props }: ComponentProps<"input"> & Invalid) {
  return (
    <input
      className={cn("a-field", className)}
      aria-invalid={invalid || undefined}
      aria-describedby={props.id ? describedBy(props.id, invalid ? "x" : undefined, hint) : undefined}
      {...props}
    />
  );
}

export function TextArea({ className, invalid, hint, ...props }: ComponentProps<"textarea"> & Invalid) {
  return (
    <textarea
      className={cn("a-field a-textarea", className)}
      aria-invalid={invalid || undefined}
      aria-describedby={props.id ? describedBy(props.id, invalid ? "x" : undefined, hint) : undefined}
      {...props}
    />
  );
}

/**
 * A textarea that grows with its content — the article title. A one-line input
 * clipped long headlines at the start; this always shows the whole thing.
 * CSS only (the .a-autogrow ghost), no measuring per keystroke.
 */
export function AutoGrowTextarea({
  className,
  invalid,
  hint,
  value,
  ...props
}: ComponentProps<"textarea"> & Invalid & { value: string }) {
  return (
    <div className={cn("a-autogrow a-autogrow-field", className)} data-value={value}>
      <textarea
        rows={1}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={props.id ? describedBy(props.id, invalid ? "x" : undefined, hint) : undefined}
        {...props}
      />
    </div>
  );
}

export function SelectInput({ className, invalid, hint, children, ...props }: ComponentProps<"select"> & Invalid) {
  return (
    <select
      className={cn("a-field a-select", className)}
      aria-invalid={invalid || undefined}
      aria-describedby={props.id ? describedBy(props.id, invalid ? "x" : undefined, hint) : undefined}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Tags as chips. The value stays a comma-separated string so the form's save
 * code doesn't change; Enter or comma commits a chip, Backspace on an empty
 * input removes the last one.
 */
export function TagInput({
  id,
  value,
  onChange,
  hint,
  max = 12,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  max?: number;
}) {
  const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
  const [draft, setDraft] = useState("");

  const commit = (...raw: string[]) => {
    const next = [...tags];
    for (const r of raw) {
      const t = r.trim();
      if (t && !next.includes(t) && next.length < max) next.push(t);
    }
    if (next.length !== tags.length) onChange(next.join(", "));
  };
  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag).join(", "));

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && tags.length) {
      remove(tags[tags.length - 1]!);
    }
  }

  return (
    <div className="a-tags">
      {tags.map((t) => (
        <span key={t} className="a-tag">
          {t}
          <button type="button" className="a-tag-remove" onClick={() => remove(t)} aria-label={`Remove tag ${t}`}>
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        className="a-tags-input"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) {
            commit(...v.split(",").slice(0, -1));
            setDraft(v.split(",").pop() ?? "");
          } else setDraft(v);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim()) {
            commit(draft);
            setDraft("");
          }
        }}
        placeholder={tags.length ? "" : "Add a tag"}
        aria-describedby={describedBy(id, undefined, hint)}
        disabled={tags.length >= max}
      />
    </div>
  );
}

export default AdminField;
