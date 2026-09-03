import { cache } from "react";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import { getSession } from "@/lib/session";

/**
 * Everything the admin chrome needs on every page: who is signed in, and how
 * many submissions are waiting. Wrapped in React's `cache` so the count is one
 * query per request no matter how many components ask.
 */
export const getAdminContext = cache(async () => {
  const session = await getSession();
  await dbConnect();
  const pendingCount = await Submission.countDocuments({ status: "pending" });

  return {
    name: session?.name ?? "Admin",
    email: session?.email ?? "",
    pendingCount,
  };
});
