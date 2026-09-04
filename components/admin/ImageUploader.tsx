"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ACCEPT_ATTR, MAX_LABEL, uploadImage, validateFile } from "@/lib/upload-client";
import { checkImageUrl } from "@/lib/image-hosts";
import type { ImageRef } from "@/lib/types";

/**
 * Cover image panel. Upload is the primary action; pasting a URL is secondary
 * and validated against the host allowlist here rather than failing on the
 * public route.
 *
 * The focal point is stored with the image: covers are cropped to 4:5 in three
 * places, and without a focal point faces get cut off. Clicking the preview
 * sets the point that must stay visible.
 */
export function ImageUploader({
  value,
  onChange,
  label = "Cover image",
}: {
  value: ImageRef | null;
  onChange: (image: ImageRef | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");

  async function handleFile(file: File) {
    setError("");
    const invalid = validateFile(file);
    if (invalid) { setError(invalid.message); return; }

    setProgress(0);
    try {
      const result = await uploadImage(file, setProgress);
      onChange({
        url: result.url,
        publicId: result.publicId,
        alt: value?.alt ?? "",
        width: result.width,
        height: result.height,
        blurDataURL: result.blurDataURL,
        focalX: 50,
        focalY: 50,
      });
      setProgress(null);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "The upload failed.");
    }
  }

  function useUrl() {
    const check = checkImageUrl(url);
    if (!check.ok) { setError(check.reason); return; }
    setError("");
    onChange({
      url: check.url, publicId: "", alt: value?.alt ?? "",
      width: 0, height: 0, blurDataURL: "", focalX: 50, focalY: 50,
    });
    setUrl("");
  }

  /** Click the preview to say which part of the cover must survive the crop. */
  function setFocal(e: React.MouseEvent<HTMLButtonElement>) {
    if (!value) return;
    // layout-read-ok: one-shot on click, not on a scroll or per-frame path
    const r = e.currentTarget.getBoundingClientRect();
    onChange({
      ...value,
      focalX: Math.round(((e.clientX - r.left) / r.width) * 100),
      focalY: Math.round(((e.clientY - r.top) / r.height) * 100),
    });
  }

  const busy = progress !== null;

  return (
    <div className="flex flex-col gap-3">
      <span className="a-meta">{label}</span>

      {value?.url ? (
        <>
          <button
            type="button"
            onClick={setFocal}
            title="Click the point that must stay visible when cropped"
            className="relative block aspect-4/5 w-full max-w-[220px] overflow-hidden rounded-lg a-bg-hover"
          >
            <Image
              src={value.url}
              alt=""
              fill
              sizes="220px"
              className="object-cover"
              style={{ objectPosition: `${value.focalX ?? 50}% ${value.focalY ?? 50}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{
                left: `${value.focalX ?? 50}%`,
                top: `${value.focalY ?? 50}%`,
                background: "rgba(0,0,0,0.35)",
              }}
            />
          </button>

          <p className="a-muted text-[12px]">
            {value.width ? `${value.width} × ${value.height} · ` : ""}
            Click the image to set the focal point ({value.focalX ?? 50}%, {value.focalY ?? 50}%)
          </p>

          <label className="flex flex-col gap-1">
            <span className="a-meta">Alt text</span>
            <input
              className="a-input"
              value={value.alt ?? ""}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder="What is in the picture?"
            />
          </label>

          <div className="flex gap-2">
            <button type="button" className="a-btn a-btn-ghost" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="a-btn a-btn-danger" onClick={() => onChange(null)}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f); }}
          className="grid place-items-center rounded-lg border border-dashed p-6 text-center a-border"
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
              <button type="button" className="a-btn a-btn-primary" onClick={() => inputRef.current?.click()}>
                Upload a cover
              </button>
              <p className="a-muted mt-2 text-[12px]">
                or drop it here · JPEG, PNG, WebP, AVIF · up to {MAX_LABEL}
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
      />

      <details>
        <summary className="a-muted cursor-pointer text-[12.5px]">
          Or use an image already hosted elsewhere
        </summary>
        <div className="mt-2 flex gap-2">
          <input
            className="a-input"
            placeholder="https://res.cloudinary.com/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="button" className="a-btn a-btn-ghost" onClick={useUrl}>Use</button>
        </div>
      </details>

      {error ? (
        <p className="text-[12.5px]" role="alert" style={{ color: "var(--status-bad)" }}>{error}</p>
      ) : null}
    </div>
  );
}

export default ImageUploader;
