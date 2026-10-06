"use client";

import { useEffect, useId, useState } from "react";
import { SITE } from "@/lib/constants";
import { SLUG_BASE, normaliseSlug, type SlugType } from "@/lib/slug";

/**
 * WEB ADDRESS — Revision 27 §2.5. Replaces the slug input.
 *
 * The owner never types an address. It is made from the title on the server
 * when the item is saved; until then this shows what the server WOULD produce
 * (asked of /api/admin/slug-preview, debounced) and says "(preview)".
 *
 * "Change web address" is tucked away and collapsed. Its input normalises as
 * you type, so it can't produce an invalid address, and it says whether the
 * address is free. After publishing it warns that the old address will
 * redirect — the server keeps it in previousSlugs and answers it with a 308.
 */

/** normaliseSlug, but keeps a trailing hyphen so typing "new-" isn't eaten mid-word. */
function whileTyping(input: string): string {
  const trailing = /[^a-z0-9]$/i.test(input) && input.length > 0;
  const n = normaliseSlug(input);
  return trailing && n ? `${n}-` : n;
}

export function WebAddress({
  type,
  id,
  title,
  slug,
  live,
  followsTitle,
  requested,
  onRequest,
}: {
  type: SlugType;
  /** The saved document's id, so it doesn't collide with itself. */
  id?: string;
  title: string;
  /** The saved address, or "" before the first save. */
  slug: string;
  /** Has been public: a change keeps the old address working. */
  live: boolean;
  /** Draft that still follows its title — show the server's preview. */
  followsTitle: boolean;
  /** The address the owner typed in "Change web address", if any. */
  requested?: string;
  onRequest: (slug: string | undefined) => void;
}) {
  const inputId = useId();
  const [preview, setPreview] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [check, setCheck] = useState<{ slug: string; free: boolean; valid: boolean } | null>(null);

  // The preview: what a save would produce from the current title.
  useEffect(() => {
    if (!followsTitle || requested) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ type, title });
        if (id) params.set("id", id);
        const res = await fetch(`/api/admin/slug-preview?${params}`, { signal: ctrl.signal });
        if (res.ok) setPreview(((await res.json()) as { slug: string }).slug);
      } catch {
        /* aborted, or offline — the save makes the real one anyway */
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [type, id, title, followsTitle, requested]);

  // Is the typed address free?
  useEffect(() => {
    const candidate = normaliseSlug(draft);
    if (!open || !candidate || candidate === slug) {
      setCheck(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ type, slug: candidate });
        if (id) params.set("id", id);
        const res = await fetch(`/api/admin/slug-preview?${params}`, { signal: ctrl.signal });
        if (res.ok) setCheck((await res.json()) as { slug: string; free: boolean; valid: boolean });
      } catch {
        /* ignore */
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [draft, open, type, id, slug]);

  const shown = requested ?? (followsTitle ? preview || slug : slug);
  const isPreview = !requested && followsTitle;
  const host = SITE.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const path = `${SLUG_BASE[type]}/${shown}`;
  const full = `${SITE.url.replace(/\/$/, "")}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard refused — the address is selectable text */
    }
  }

  function openChange() {
    setDraft(shown);
    setOpen(true);
  }

  function apply() {
    const next = normaliseSlug(draft);
    if (!next || (check && (!check.free || !check.valid))) return;
    onRequest(next === slug ? undefined : next);
    setOpen(false);
  }

  const candidate = normaliseSlug(draft);
  const unchanged = candidate === slug || candidate === shown;

  return (
    <div className="flex flex-col gap-2">
      <span className="a-field-label">Web address</span>
      <div className="a-webaddress">
        <span className="a-webaddress-url" data-testid="web-address">
          {shown ? (
            <>
              <span className="a-muted">{host}</span>
              {path}
            </>
          ) : (
            <span className="a-muted">Made when you add a title</span>
          )}
        </span>
        <button type="button" className="a-btn a-btn-ghost flex-none uppercase tracking-[0.06em]" onClick={copy} disabled={!shown}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="a-field-hint">
          {requested
            ? "You chose this address. It's saved when you save."
            : isPreview
              ? "Made from the title automatically (preview — it's set when you save)."
              : "Made from the title automatically."}
        </p>
        {!open ? (
          <button type="button" className="a-link-button" onClick={openChange} aria-expanded={false} aria-controls={inputId}>
            Change web address ▸
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="a-webaddress-panel" id={inputId}>
          <label className="a-field-label" htmlFor={`${inputId}-input`}>
            New address
          </label>
          <div className="flex items-center gap-2">
            <span className="a-muted flex-none text-[13px]">{SLUG_BASE[type]}/</span>
            <input
              id={`${inputId}-input`}
              className="a-field"
              value={draft}
              spellCheck={false}
              autoCapitalize="off"
              onChange={(e) => setDraft(whileTyping(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
              }}
              aria-describedby={`${inputId}-status`}
              aria-invalid={check && !check.free ? true : undefined}
            />
          </div>
          <p id={`${inputId}-status`} className={check && !check.free ? "a-field-error" : "a-field-hint"} role="status">
            {!candidate
              ? "Use letters and numbers."
              : unchanged
                ? "This is the current address."
                : !check
                  ? "Checking…"
                  : check.free
                    ? "This address is free."
                    : "That address is already used. Try another."}
          </p>
          {live ? (
            <p className="a-field-hint">
              This is already public. The old address will keep working and send people to the new one.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="a-btn a-btn-primary"
              onClick={apply}
              disabled={!candidate || unchanged || !check || !check.free}
            >
              Use this address
            </button>
            <button
              type="button"
              className="a-btn a-btn-ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </button>
            {requested ? (
              <button
                type="button"
                className="a-btn a-btn-ghost"
                onClick={() => {
                  onRequest(undefined);
                  setOpen(false);
                }}
              >
                Go back to the automatic one
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default WebAddress;
