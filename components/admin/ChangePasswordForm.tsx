"use client";

import { useRef, useState } from "react";
import AdminField, { describedBy } from "@/components/admin/ui/Field";
import PasswordInput, { type PasswordInputHandle } from "@/components/admin/PasswordInput";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password";

type Fields = "currentPassword" | "newPassword" | "confirmPassword";
type Errors = Partial<Record<Fields | "form", string>>;

const HINT = `At least ${PASSWORD_MIN} characters.`;

export function ChangePasswordForm({ email }: { email: string }) {
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const current = useRef<PasswordInputHandle>(null);
  const next = useRef<PasswordInputHandle>(null);
  const confirm = useRef<PasswordInputHandle>(null);

  function validate(v: Record<Fields, string>): Errors {
    const e: Errors = {};
    if (!v.currentPassword) e.currentPassword = "Enter your current password.";
    if (v.newPassword.length < PASSWORD_MIN) e.newPassword = `At least ${PASSWORD_MIN} characters.`;
    else if (v.newPassword.length > PASSWORD_MAX) e.newPassword = `At most ${PASSWORD_MAX} characters.`;
    else if (v.newPassword === v.currentPassword)
      e.newPassword = "Choose a password different from the current one.";
    if (!e.newPassword && v.confirmPassword !== v.newPassword)
      e.confirmPassword = "Doesn't match the new password.";
    return e;
  }

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setDone(false);
    const data = new FormData(ev.currentTarget);
    const values = {
      currentPassword: String(data.get("currentPassword") ?? ""),
      newPassword: String(data.get("newPassword") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    };

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = (["currentPassword", "newPassword", "confirmPassword"] as const).find((k) => found[k]);
      ({ currentPassword: current, newPassword: next, confirmPassword: confirm })[first!].current?.focus();
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      if (res.ok) {
        formRef.current?.reset();
        current.current?.hide();
        next.current?.hide();
        confirm.current?.hide();
        setErrors({});
        setDone(true);
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
      };
      if (body.fields?.currentPassword) {
        setErrors({ currentPassword: body.fields.currentPassword });
        current.current?.focus();
      } else if (body.fields?.newPassword) {
        setErrors({ newPassword: body.fields.newPassword });
      } else {
        setErrors({ form: body.error ?? "Couldn't update the password." });
      }
    } catch {
      setErrors({ form: "Network error. Check your connection." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {/* Lets a password manager file the new password against the right account. */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />

      <AdminField label="Current password" htmlFor="currentPassword" error={errors.currentPassword}>
        <PasswordInput
          handle={current}
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
          aria-invalid={errors.currentPassword ? true : undefined}
          aria-describedby={describedBy("currentPassword", errors.currentPassword)}
        />
      </AdminField>

      <AdminField label="New password" htmlFor="newPassword" error={errors.newPassword} hint={HINT}>
        <PasswordInput
          handle={next}
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          required
          aria-invalid={errors.newPassword ? true : undefined}
          aria-describedby={describedBy("newPassword", errors.newPassword, HINT)}
        />
      </AdminField>

      <AdminField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword}>
        <PasswordInput
          handle={confirm}
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          required
          aria-invalid={errors.confirmPassword ? true : undefined}
          aria-describedby={describedBy("confirmPassword", errors.confirmPassword)}
        />
      </AdminField>

      {errors.form ? (
        <p className="a-field-error uppercase tracking-[0.06em]" role="alert">
          {errors.form}
        </p>
      ) : null}

      <div role="status" aria-live="polite">
        {done ? <p className="a-status-ok">PASSWORD UPDATED.</p> : null}
      </div>

      <button type="submit" className="a-btn-submit" disabled={pending}>
        {pending ? "Updating…" : "Update password →"}
      </button>
    </form>
  );
}

export default ChangePasswordForm;
