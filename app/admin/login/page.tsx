import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import MonoLabel from "@/components/ui/MonoLabel";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <MonoLabel dim>
          {SITE.name} — Admin
        </MonoLabel>
        <h1 className="display mt-6 text-5xl">Sign in.</h1>
        <p className="mono mt-4 text-fg-dim">{SITE.established}</p>

        <div className="mt-12">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
