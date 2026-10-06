import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Admin tokens only (`--a-*` in admin.css). This page used the public site's
 * MonoLabel / Field / Button, whose colours resolve to the dark-ground palette,
 * and so rendered cream on cream — Revision 25 §0.
 */
export default function LoginPage() {
  return (
    <main id="main" tabIndex={-1} className="flex min-h-dvh items-center justify-center px-4 py-10 outline-none">
      <div className="w-full max-w-[420px]">
        <p className="a-auth-mono">{SITE.name} — Admin</p>
        <h1 className="a-auth-heading mt-4 text-[40px] leading-none font-medium tracking-[-0.02em]">
          Sign in.
        </h1>
        <p className="a-auth-mono mt-3">{SITE.established}</p>

        <div className="a-auth-card mt-8 p-6 sm:p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
