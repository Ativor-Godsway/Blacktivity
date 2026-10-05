import type { ReactNode } from "react";

/**
 * Label + control + hint/error for the admin's auth forms. Admin tokens only —
 * the public components/ui/Field paints in the public palette, which is what
 * made the sign-in page invisible (Revision 25 §0).
 *
 * The control itself carries `aria-invalid` and `aria-describedby`; pass
 * `describedBy(id, error, hint)` to it so the message is announced.
 */
export function AuthField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
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

/** The aria-describedby value matching what AuthField renders. */
export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export default AuthField;
