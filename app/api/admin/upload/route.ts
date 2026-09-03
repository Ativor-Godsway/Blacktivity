import { withAuth } from "@/lib/guard";
import { isCloudinaryConfigured, signUpload, CLOUDINARY_FOLDER } from "@/lib/cloudinary";
import { ok, serverError } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Returns a signature the browser uses to upload straight to Cloudinary.
 * The file never passes through this lambda — Vercel has no persistent disk
 * and no reason to proxy the bytes.
 */
export async function POST() {
  return withAuth(async () => {
    if (!isCloudinaryConfigured()) {
      return serverError("Cloudinary isn't configured. Add the credentials to your environment.");
    }

    try {
      return ok(signUpload({ folder: CLOUDINARY_FOLDER }));
    } catch {
      return serverError("Couldn't sign the upload.");
    }
  });
}
