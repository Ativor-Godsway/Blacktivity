"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={busy} className="a-btn a-btn-ghost">
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

export default LogoutButton;
