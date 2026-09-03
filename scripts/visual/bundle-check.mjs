/**
 * Confirms admin-only dependencies never reach a public route. A single shared
 * import can drag the whole Tiptap editor into the public bundle, and it is
 * invisible in the route listing.
 */
import puppeteer from "puppeteer-core";

const MARKERS = {
  tiptap: /@tiptap|ProseMirror|prosemirror/i,
  editorChrome: /toggleBlockquote|setHorizontalRule|autosave/i,
  // Must match the SDK, not Next's built-in image-loader enum, which lists
  // "cloudinary" as a string on every route and is not a leak.
  cloudinarySdk: /cloudinary\.v2|new Cloudinary\(|cloudinary-core/i,
  mongoose: /mongoose/i,
};

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});

for (const path of ["/", "/articles", "/articles/tailors-of-makola", "/submit"]) {
  const p = await b.newPage();
  const scripts = new Map();
  p.on("response", async (res) => {
    if (res.request().resourceType() !== "script") return;
    try { scripts.set(res.url(), await res.text()); } catch {}
  });
  await p.goto("http://localhost:3111" + path, { waitUntil: "networkidle0", timeout: 90000 });

  const bytes = [...scripts.values()].reduce((a, s) => a + s.length, 0);
  const hits = [];
  for (const [name, re] of Object.entries(MARKERS)) {
    const files = [...scripts.entries()].filter(([, s]) => re.test(s)).map(([u]) => u.split("/").pop());
    if (files.length) hits.push(`${name} in ${files.join(", ")}`);
  }
  console.log(`${path.padEnd(32)} ${scripts.size} scripts, ${(bytes / 1024).toFixed(0)} KB uncompressed`);
  if (hits.length) for (const h of hits) console.log(`    LEAK: ${h}`);
  else console.log("    no admin code ✓");
  await p.close();
}
await b.close();
process.exit(0);
