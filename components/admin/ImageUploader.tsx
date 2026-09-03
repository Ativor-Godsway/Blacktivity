"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import MonoLabel from "@/components/ui/MonoLabel";
import { Input } from "@/components/ui/Field";
import type { ImageRef } from "@/lib/types";

/**
 * Uploads direct to Cloudinary using a signature fetched from our server, so
 * the API secret never reaches the browser and the bytes never touch a lambda.
 * Falls back to pasting a URL when Cloudinary isn't configured yet.
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    setUploading(true);

    try {
      const sigRes = await fetch("/api/admin/upload", { method: "POST" });
      if (!sigRes.ok) {
        const body = (await sigRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Couldn't start the upload.");
      }

      const { signature, timestamp, apiKey, cloudName, folder } = (await sigRes.json()) as {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
      };

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append("folder", folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Cloudinary rejected the upload.");

      const data = (await res.json()) as {
        secure_url: string;
        public_id: string;
        width: number;
        height: number;
      };

      onChange({
        url: data.secure_url,
        publicId: data.public_id,
        alt: value?.alt ?? "",
        width: data.width,
        height: data.height,
        blurDataURL: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <MonoLabel dim>{label}</MonoLabel>

      {value?.url ? (
        <div className="flex flex-wrap items-start gap-5">
          <div className="relative h-40 w-32 shrink-0 overflow-hidden border a-border">
            <Image
              src={value.url}
              alt={value.alt || "Selected image"}
              fill
              sizes="128px"
              className="object-cover grayscale"
            />
          </div>

          <div className="flex min-w-56 flex-1 flex-col gap-3">
            <Input
              placeholder="Alt text — describe the image"
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
            />
            <MonoLabel dim>
              {value.width} × {value.height}
            </MonoLabel>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="a-meta self-start a-muted hover:a-ink"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="a-meta border a-border px-5 py-3 a-ink transition-colors duration-200 hover:a-border-ink disabled:opacity-40"
        >
          {uploading ? "Uploading…" : value?.url ? "Replace image" : "Upload image"}
        </button>

        <Input
          className="max-w-xs"
          placeholder="…or paste an image URL"
          defaultValue=""
          onBlur={(e) => {
            const url = e.target.value.trim();
            if (!url) return;
            onChange({
              url,
              publicId: "",
              alt: value?.alt ?? "",
              width: 1200,
              height: 1600,
              blurDataURL: "",
            });
            e.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="a-meta a-ink" role="alert">
          ↳ {error}
        </p>
      ) : null}
    </div>
  );
}

export default ImageUploader;
