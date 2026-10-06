/**
 * EVERY ROUTE, IN EVERY STATE IT CAN BE IN — Revision 26 §2.
 *
 * Keyed by the route pattern discoverRoutes() returns. A route found in app/
 * with no entry here FAILS the audit, so a new page can't slip past it.
 *
 * Each state is { name, run?, localOnly?, phase? }:
 *   run(page, ctx)  drives the page into the state after navigation
 *   localOnly       the state writes data (a real submission, a password
 *                   change) — it never runs against a deployed URL
 *   phase: "empty"  runs only in the empty-database pass of audit/local.mjs
 *   last            runs after every other state (it signs other sessions out)
 *
 * Nothing that runs against a deployed URL saves, publishes or deletes.
 * Validation-error states are triggered client-side, before any request.
 */

const SAMPLE = {
  email: "sample@example.com",
  url: "https://example.com/sample",
  number: "12",
  tel: "0201234567",
  text: "Sample typed text 123",
};

/** Type into every empty, enabled text control on the page — §3.3. */
export async function typeEverywhere(page) {
  const handles = await page.$$(
    'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]):not([type=submit]):not([type=button]):not([type=date]):not([type=datetime-local]):not([type=time]), textarea',
  );
  for (const h of handles) {
    const ok = await h.evaluate((el) => !el.disabled && !el.readOnly && !el.hidden && el.offsetParent !== null && !el.value);
    if (!ok) continue;
    const type = await h.evaluate((el) => el.type);
    await h.fill(type === "password" ? "Sample-password-123" : SAMPLE[type] ?? SAMPLE.text).catch(() => {});
  }
  const editor = await page.$('[contenteditable="true"]');
  if (editor) {
    const empty = await editor.evaluate((el) => !el.textContent.trim());
    if (empty) {
      await editor.click();
      await page.keyboard.type("Sample body text typed into the editor.");
    }
  }
}

/** A 1×1 PNG — enough to start an upload. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/**
 * Drive the cover uploader into a state without touching Cloudinary: the
 * signature request is answered locally, and the upload itself either hangs
 * (progress stays on screen) or fails (the error message shows).
 */
const upload = (outcome) => async (page) => {
  await page.route("**/api/admin/upload", (route) =>
    outcome === "error"
      ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Cloudinary isn't configured." }) })
      : route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ signature: "x", timestamp: 1, apiKey: "x", cloudName: "audit", folder: "audit" }),
        }),
  );
  await page.route("https://api.cloudinary.com/**", () => {}); // never answers
  await page.locator('input[type="file"]').first().setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
  await page.waitForTimeout(800);
};

const click = (sel) => async (page) => {
  await page.locator(sel).first().click();
  await page.waitForTimeout(400);
};

const clickText = (text, role = "button") => async (page) => {
  await page.getByRole(role, { name: text }).first().click();
  await page.waitForTimeout(500);
};

export const STATES = {
  /* ------------------------------------------------------------- admin */
  "/admin/login": [
    { name: "empty", auth: false },
    { name: "typed", auth: false, run: typeEverywhere },
    {
      name: "password shown",
      auth: false,
      run: async (page) => {
        await typeEverywhere(page);
        await page.click('button[aria-controls="password"]');
      },
    },
    {
      name: "error",
      auth: false,
      once: true, // one failed attempt per run, not per width — the login is rate-limited
      run: async (page) => {
        await page.fill("#email", "nobody@blacktivity.invalid");
        await page.fill("#password", "not-the-password-123");
        await page.click('button[type="submit"]');
        await page.waitForSelector('[role="alert"]', { timeout: 20000 });
        await page.waitForTimeout(300);
      },
    },
  ],
  "/admin/account": [
    { name: "empty" },
    {
      name: "errors",
      run: async (page) => {
        await page.fill("#currentPassword", "x");
        await page.fill("#newPassword", "short");
        await page.click('button[type="submit"]');
        await page.waitForTimeout(300);
        await page.fill("#newPassword", "long-enough-password");
        await page.fill("#confirmPassword", "does-not-match-it");
        await page.click('button[type="submit"]');
        await page.waitForTimeout(300);
      },
    },
    {
      name: "success",
      localOnly: true,
      last: true, // signs out every other session, so it runs after the sweep
      run: async (page, ctx) => {
        // Changes the password and changes it straight back.
        const temp = "audit-temporary-password-1";
        await page.fill("#currentPassword", ctx.password);
        await page.fill("#newPassword", temp);
        await page.fill("#confirmPassword", temp);
        await page.click('button[type="submit"]');
        await page.waitForSelector('[role="status"] .a-status-ok', { timeout: 20000 });
        const res = await page.request.post("/api/admin/password", {
          data: { currentPassword: temp, newPassword: ctx.password },
        });
        if (!res.ok()) throw new Error(`could not restore the audit password (${res.status()})`);
      },
    },
  ],
  "/admin": [
    { name: "dashboard" },
    { name: "range 7 days", path: "/admin?range=7" },
    { name: "empty state", phase: "empty" },
  ],
  "/admin/analytics": [{ name: "default" }, { name: "empty state", phase: "empty" }],
  "/admin/articles": [
    { name: "list" },
    { name: "filter: drafts", run: clickText(/^Drafts?/) },
    { name: "row detail open", run: click('button[aria-label^="Open "]') },
    { name: "rows selected (bulk bar)", run: click('input[aria-label^="Select "]:not([aria-label="Select all rows"])') },
    { name: "empty", phase: "empty" },
  ],
  "/admin/articles/new": [
    { name: "empty" },
    { name: "typed", run: typeEverywhere },
    { name: "validation errors", run: clickText(/^Publish/) },
    { name: "image dialog", run: clickText(/^Image$/) },
    { name: "upload in progress", run: upload("hang") },
    { name: "upload error", run: upload("error") },
  ],
  "/admin/articles/[id]": [
    { name: "filled (Makola)" },
    { name: "preview open", run: clickText(/^Preview/) },
    {
      name: "validation errors",
      run: async (page) => {
        await page.fill("#title", "");
        await page.fill("#excerpt", "");
        await page.getByRole("button", { name: /^Save as draft/ }).click();
        await page.waitForTimeout(400);
      },
    },
  ],
  "/admin/events": [
    { name: "list" },
    { name: "row detail open", run: click('button[aria-label^="Open "]') },
    { name: "empty", phase: "empty" },
  ],
  "/admin/events/new": [
    { name: "empty" },
    { name: "typed", run: typeEverywhere },
    { name: "validation errors", run: clickText(/^(Create event|Update event)/) },
  ],
  "/admin/events/[id]": [{ name: "filled" }],
  "/admin/submissions": [
    { name: "all" },
    { name: "filter: pending", run: clickText(/^Pending/) },
    { name: "filter: approved", run: clickText(/^Approved/) },
    { name: "filter: rejected", run: clickText(/^Rejected/) },
    { name: "table view", run: clickText(/^table$/i) },
    { name: "empty queue", phase: "empty" },
  ],
  "/admin/rotation": [{ name: "list" }, { name: "empty", phase: "empty" }],
  "/admin/rotation/new": [
    { name: "editor" },
    { name: "start from last volume", run: clickText(/^Start from Vol/) },
    { name: "track picker open", run: clickText(/^Add track$/) },
    {
      name: "track picker: existing track",
      run: async (page) => {
        await clickText(/^Add track$/)(page);
        await clickText(/^Existing track$/)(page);
      },
    },
  ],
  "/admin/rotation/[id]": [{ name: "editor" }],
  "/admin/rotation/tracks": [
    { name: "library" },
    {
      name: "search, no results",
      run: async (page) => {
        await page.fill('input[aria-label="Search tracks"]', "zzzz-no-such-track");
        await page.waitForTimeout(300);
      },
    },
    { name: "edit panel open", run: clickText(/^Edit$/) },
  ],
  "/admin/settings": [{ name: "default" }],

  /* ------------------------------------------------------------ public */
  "/": [
    { name: "top" },
    { name: "mobile menu open", widths: [390], run: click('button[aria-controls="mobile-nav"]') },
  ],
  "/about": [{ name: "default" }],
  "/articles": [{ name: "default" }],
  "/articles/[slug]": [{ name: "default" }],
  "/events": [{ name: "default" }],
  "/events/[slug]": [{ name: "default" }],
  "/rotation": [{ name: "default" }],
  "/rotation/[slug]": [{ name: "default" }],
  "/rotation/archive": [{ name: "default" }],
  "/creatives": [{ name: "default (hidden from nav)" }],
  "/submit": [
    { name: "empty" },
    { name: "typed", run: typeEverywhere },
    { name: "errors", run: click('button[type="submit"]') },
    {
      name: "success",
      localOnly: true,
      run: async (page) => {
        await typeEverywhere(page);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2500);
      },
    },
  ],
};

/** Routes that aren't pages in app/ but still need a look. */
export const EXTRA = [
  { route: "404", path: "/this-page-does-not-exist", states: [{ name: "not found" }] },
];
