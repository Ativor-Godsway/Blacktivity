"use client";

import { useState } from "react";
import MonoLabel from "@/components/ui/MonoLabel";

/** WhatsApp matters most for this audience — it leads. */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const link = "mono text-fg-muted transition-colors duration-300 hover:text-fg";

  return (
    <div className="flex flex-wrap items-center gap-6 border-y border-rule py-5">
      <MonoLabel dim>Share</MonoLabel>
      <a
        className={link}
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noreferrer noopener"
        data-track="share-whatsapp"
      >
        WhatsApp ↗
      </a>
      <a
        className={link}
        href={`https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noreferrer noopener"
        data-track="share-x"
      >
        X ↗
      </a>
      <button type="button" onClick={copy} className={link} data-track="share-copy">
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}

export default ShareRow;
