"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import AuthField from "@/components/admin/AuthField";
import PasswordInput, { type PasswordInputHandle } from "@/components/admin/PasswordInput";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const password = useRef<PasswordInputHandle>(null);

  const expired = searchParams.has("expired");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });

      if (res.ok) {
        password.current?.hide();
        const next = searchParams.get("next");
        // Only same-origin admin paths — never an open redirect.
        router.replace(next && next.startsWith("/admin") ? next : "/admin");
        router.refresh();
        return;
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Couldn't sign in.");
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  const invalid = error ? true : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {expired && !error ? (
        <p className="a-field-hint" role="status">
          Your session ended. Sign in again.
        </p>
      ) : null}

      <AuthField label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          className="a-field"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="off"
          spellCheck={false}
          required
          autoFocus
          aria-invalid={invalid}
          aria-describedby={error ? "login-error" : undefined}
        />
      </AuthField>

      <AuthField label="Password" htmlFor="password">
        <PasswordInput
          handle={password}
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={invalid}
          aria-describedby={error ? "login-error" : undefined}
        />
      </AuthField>

      {error ? (
        <p id="login-error" className="a-field-error -mt-2 uppercase tracking-[0.06em]" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="a-btn-submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in →"}
      </button>
    </form>
  );
}

export default LoginForm;
