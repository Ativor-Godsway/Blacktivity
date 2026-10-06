import { globSync } from "node:fs";

/**
 * Every route, read from app/ — Revision 26 §2: "don't sweep from memory".
 * Route groups like (site) are dropped; dynamic segments stay as [param].
 */
export function discoverRoutes(root = "app") {
  return globSync(`${root}/**/page.tsx`)
    .map((f) =>
      ("/" + f.slice(root.length + 1).replace(/(^|\/)page\.tsx$/, ""))
        .replace(/\/\([^)]+\)/g, "")
        .replace(/\/$/, "") || "/",
    )
    .sort();
}
