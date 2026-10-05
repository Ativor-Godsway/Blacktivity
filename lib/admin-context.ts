import { cache } from "react";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import { getSession } from "@/lib/session";
import { LOGIN_EXPIRED_PATH } from "@/lib/auth";

/**
 * Everything the admin chrome needs on every page: who is signed in, and how
 * many submissions are waiting. Wrapped in React's `cache` so the count is one
 * query per request no matter how many components ask.
 *
 * Every admin page calls this, which makes it the server-side session check
 * the Edge proxy can't do: a token issued before the last password change is
 * rejected here and the page never renders.
 */
export const getAdminContext = cache(async () => {
  const session = await getSession();
  if (!session) redirect(LOGIN_EXPIRED_PATH);
  await dbConnect();
  const pendingCount = await Submission.countDocuments({ status: "pending" });

  return {
    name: session.name ?? "Admin",
    email: session.email ?? "",
    pendingCount,
  };
});
