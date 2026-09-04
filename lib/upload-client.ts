/**
 * Browser-side upload to Cloudinary using a signature minted by our server.
 *
 * The API secret never reaches the browser and the bytes never pass through a
 * lambda — the file goes straight to Cloudinary, which also does the resizing
 * and format conversion on delivery. We never upload a resized copy.
 */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");
export const MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_LABEL = "10MB";

export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  blurDataURL: string;
};

export type ValidationError = { message: string };

/** Checked before a byte is sent, so nobody waits on a 40MB file to be told no. */
export function validateFile(file: File): ValidationError | null {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return {
      message: `${file.name} is a ${file.type || "unknown"} file. Use JPEG, PNG, WebP or AVIF.`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      message: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_LABEL}.`,
    };
  }
  return null;
}

/**
 * A tiny blurred placeholder, built from a Cloudinary transformation of the
 * asset that was just uploaded. Without this the public page shifts as images
 * load, which breaks the zero-CLS criterion.
 */
async function buildBlurDataURL(cloudName: string, publicId: string): Promise<string> {
  try {
    const tiny = `https://res.cloudinary.com/${cloudName}/image/upload/w_16,q_30,f_jpg/${publicId}.jpg`;
    const res = await fetch(tiny);
    if (!res.ok) return "";
    const blob = await res.blob();
    if (blob.size > 4000) return ""; // never inline something large
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    // A missing placeholder is a cosmetic loss, never a failed upload.
    return "";
  }
}

/**
 * Uploads one file. `onProgress` receives 0-100 so the UI can show real
 * progress rather than an indeterminate spinner — XHR is used because fetch
 * still cannot report upload progress.
 */
export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedImage> {
  const invalid = validateFile(file);
  if (invalid) throw new Error(invalid.message);

  const sigRes = await fetch("/api/admin/upload", { method: "POST" });
  if (!sigRes.ok) {
    const body = (await sigRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Couldn't start the upload.");
  }
  const sig = (await sigRes.json()) as {
    data?: Record<string, unknown>;
    signature?: string;
  };
  const s = (sig.data ?? sig) as {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  };

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", s.apiKey);
  form.append("timestamp", String(s.timestamp));
  form.append("signature", s.signature);
  form.append("folder", s.folder);

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    error?: { message: string };
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error("The upload failed — check your connection and try again."));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 400 || body.error) {
          reject(new Error(body.error?.message ?? `Cloudinary rejected the upload (${xhr.status}).`));
          return;
        }
        resolve(body);
      } catch {
        reject(new Error("Cloudinary returned something unreadable."));
      }
    };
    xhr.send(form);
  });

  onProgress?.(100);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    blurDataURL: await buildBlurDataURL(s.cloudName, result.public_id),
  };
}
