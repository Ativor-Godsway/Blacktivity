import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Configured server-side only. CLOUDINARY_API_SECRET must never reach the
 * client bundle — the browser gets a short-lived signature instead.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const CLOUDINARY_FOLDER = "blacktivity";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/** Signs an unsigned-form upload so the secret stays here. */
export function signUpload(params: Record<string, string | number>) {
  const timestamp = Math.round(Date.now() / 1000);
  const toSign = { ...params, timestamp };

  const signature = cloudinary.utils.api_sign_request(
    toSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder: CLOUDINARY_FOLDER,
  };
}

/**
 * Deletes one asset. Used when artwork is replaced or a track is deleted —
 * without it the account fills with orphans whose only handle, the public id,
 * was just overwritten in the database.
 *
 * Never throws: losing an old file is not a reason to fail the edit that
 * replaced it, and the caller has already committed.
 */
export async function destroyAsset(publicId: string): Promise<boolean> {
  if (!publicId || !isCloudinaryConfigured()) return false;
  // Only ever our own folder — a stray id must not reach the destroy API.
  if (!publicId.startsWith(`${CLOUDINARY_FOLDER}/`)) return false;

  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res?.result === "ok";
  } catch {
    return false;
  }
}

export default cloudinary;
