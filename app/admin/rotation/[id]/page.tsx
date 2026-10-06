import { notFound, redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import ChartVolume from "@/models/ChartVolume";
import { getAdminContext } from "@/lib/admin-context";
import { currentVolume } from "@/lib/rotation-current";

export const dynamic = "force-dynamic";

/**
 * The old per-volume editor's address — Revision 27 §1.3. The editable volume
 * pages are gone; old links and bookmarks land somewhere sensible instead:
 * the current rotation goes to the editor, an archived one to its view-only page.
 */
export default async function OldVolumeAddress({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await getAdminContext(); // the session check, same as every admin page
  await dbConnect();

  const [doc, current] = await Promise.all([ChartVolume.exists({ _id: id }), currentVolume()]);
  if (!doc) notFound();
  redirect(current && String(current._id) === id ? "/admin/rotation" : `/admin/rotation/past/${id}`);
}
