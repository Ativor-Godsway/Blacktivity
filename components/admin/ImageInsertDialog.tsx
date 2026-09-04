"use client";

import { useEffect, useRef, useState } from "react";
import { ACCEPT_ATTR, MAX_LABEL, uploadImage, validateFile, type UploadedImage } from "@/lib/upload-client";
import { checkImageUrl } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";

export type InsertPayload = UploadedImage & {
  alt: string;
  caption: string;
  widthMode: "column" | "wide" | "full";
};

/**
 * Insert-image dialog for the editor.
 *
 * Upload is the primary path; pasting a URL is secondary and validated against
 * the host allowlist here, in front of the author, rather than 500-ing the
 * public route later.
 *
 * Alt text is required — an article of undescribed images fails the
 * accessibility bar the public site currently meets.
 */
export function ImageInsertDialog({
  open,
  initialFile,
  onClose,
  onInsert,
}: {
  open: boolean;
  initialFile?: File | null;
  onClose: () => void;
  onInsert: (payload: InsertPayload) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);

  const [uploaded, setUploaded] = useState<UploadedImage | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [widthMode, setWidthMode] = useState<InsertPayload["widthMode"]>("column");
  const [pastedUrl, setPastedUrl] = useState("");

  function reset() {
    setUploaded(null); setProgress(null); setError("");
    setAlt(""); setCaption(""); setWidthMode("column"); setPastedUrl("");
  }

  async function handleFile(file: File) {
    setError("");
    const invalid = validateFile(file);
    if (invalid) { setError(invalid.message); return; }

    setProgress(0);
    try {
      const result = await uploadImage(file, setProgress);
      setUploaded(result);
      // Column by default; wide and full-bleed are deliberate choices.
      setWidthMode("column");
      setProgress(null);
      // Alt is required, so put the cursor where the author must type.
      requestAnimationFrame(() => altRef.current?.focus());
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "The upload failed.");
    }
  }

  useEffect(() => {
    if (!open) { reset(); return; }
    if (initialFile) void handleFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile]);

  function useUrl() {
    const check = checkImageUrl(pastedUrl);
    if (!check.ok) { setError(check.reason); return; }
    setError("");
    // Dimensions are unknown for a pasted URL; the renderer falls back to a
    // default ratio rather than shifting.
    setUploaded({ url: check.url, publicId: "", width: 0, height: 0, blurDataURL: "" });
    requestAnimationFrame(() => altRef.current?.focus());
  }

  if (!open) return null;

  const busy = progress !== null;
  const canInsert = Boolean(uploaded && alt.trim());

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Insert image">
      <button type="button" aria-label="Cancel" className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="a-card relative z-10 w-full max-w-[520px] p-5">
        <h2 className="text-[15px] font-medium">Insert image</h2>
        <p className="a-muted mt-1 text-[12.5px]">
          JPEG, PNG, WebP or AVIF · up to {MAX_LABEL}
        </p>

        {!uploaded ? (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void handleFile(f);
              }}
              className="mt-4 grid place-items-center rounded-lg border border-dashed p-8 text-center a-border"
            >
              {busy ? (
                <div className="w-full">
                  <p className="text-[13px]">Uploading… {progress}%</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full a-bg-rule">
                    <div className="h-full rounded-full transition-[width]" style={{ width: `${progress}%`, background: "var(--series-1)" }} />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[13px]">Drop an image here, or</p>
                  <button type="button" className="a-btn a-btn-primary mt-3" onClick={() => fileRef.current?.click()}>
                    Choose a file
                  </button>
                  <p className="a-muted mt-2 text-[12px]">You can also paste one straight into the editor.</p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
            />

            <details className="mt-4">
              <summary className="a-muted cursor-pointer text-[12.5px]">
                Or use an image already hosted elsewhere
              </summary>
              <div className="mt-2 flex gap-2">
                <input
                  className="a-input"
                  placeholder="https://res.cloudinary.com/…"
                  value={pastedUrl}
                  onChange={(e) => setPastedUrl(e.target.value)}
                />
                <button type="button" className="a-btn a-btn-ghost" onClick={useUrl}>
                  Use
                </button>
              </div>
            </details>
          </>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uploaded.url}
              alt=""
              className="max-h-[220px] w-full rounded-lg object-contain a-bg-hover"
            />
            {uploaded.width ? (
              <p className="a-muted text-[12px]">
                {uploaded.width} × {uploaded.height}
                {uploaded.height > uploaded.width ? " · portrait" : " · landscape"}
              </p>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className="a-meta">Alt text — required</span>
              <input
                ref={altRef}
                className="a-input"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="What is in the picture?"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="a-meta">Caption — optional</span>
              <input className="a-input" value={caption} onChange={(e) => setCaption(e.target.value)} />
            </label>

            <div className="flex flex-col gap-1">
              <span className="a-meta">Width</span>
              <div className="flex gap-1.5">
                {(["column", "wide", "full"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="a-chip capitalize"
                    aria-pressed={widthMode === m}
                    onClick={() => setWidthMode(m)}
                  >
                    {m === "full" ? "Full bleed" : m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error ? (
          <p className="mt-3 text-[12.5px]" style={{ color: "var(--status-bad)" }} role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={cn("a-btn a-btn-primary")}
            disabled={!canInsert}
            onClick={() => uploaded && onInsert({ ...uploaded, alt: alt.trim(), caption: caption.trim(), widthMode })}
          >
            Insert
          </button>
        </div>
        {uploaded && !alt.trim() ? (
          <p className="a-muted mt-2 text-right text-[12px]">Alt text is required before inserting.</p>
        ) : null}
      </div>
    </div>
  );
}

export default ImageInsertDialog;
