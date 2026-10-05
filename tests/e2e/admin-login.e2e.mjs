/**
 * THE SIGN-IN PAGE IS USABLE — Revision 25 §4. Run it against the DEPLOYED URL:
 *
 *   BASE=https://blacktivity.vercel.app npm run test:admin-login
 *   BASE=http://localhost:3111          npm run test:admin-login
 *
 * Revision 24 was written and never shipped, and nothing noticed, because every
 * check ran on localhost. This one needs no credentials, so it can run anywhere.
 * It makes exactly ONE failed sign-in attempt (to check the error state), with
 * an address that cannot exist.
 *
 * SHOTS=dir also saves screenshots: empty, typed with the password visible, error.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { contrast, over, parseRgb } from "./_contrast.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3111";
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });

for (const width of [1440, 402]) {
  console.log(`\n${BASE}/admin/login @ ${width}`);
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle0", timeout: 60000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/login-empty-${width}.png` });

  const styleOf = (sel) =>
    page.$eval(sel, (el) => {
      const cs = getComputedStyle(el);
      let ground = "rgba(0, 0, 0, 0)";
      for (let p = el.parentElement; p; p = p.parentElement) {
        const bg = getComputedStyle(p).backgroundColor;
        if (!/rgba\(.*,\s*0\)$/.test(bg) && bg !== "transparent") { ground = bg; break; }
      }
      return {
        color: cs.color,
        fill: cs.webkitTextFillColor,
        bg: cs.backgroundColor,
        border: cs.borderTopColor,
        borderW: parseFloat(cs.borderTopWidth),
        caret: cs.caretColor,
        ground,
        type: el.getAttribute("type"),
        invalid: el.getAttribute("aria-invalid"),
      };
    });

  const WHITE = { r: 255, g: 255, b: 255, a: 1 };

  for (const sel of ["#email", "#password"]) {
    const s = await styleOf(sel);
    const ground = over(parseRgb(s.ground), WHITE);
    const field = over(parseRgb(s.bg), ground);
    const text = over(parseRgb(s.fill || s.color), field);
    check(field.r > 250 && field.g > 250 && field.b > 250, `${sel} field is white (${s.bg})`);
    check(s.borderW >= 1 && contrast(over(parseRgb(s.border), field), field) >= 3, `${sel} has a visible border (${s.border}, ${contrast(over(parseRgb(s.border), field), field).toFixed(2)}:1)`);
    check(contrast(text, field) >= 4.5, `${sel} typed text ${contrast(text, field).toFixed(2)}:1 against the field (needs 4.5)`);
    check(s.caret !== "auto" && contrast(over(parseRgb(s.caret), field), field) >= 4.5, `${sel} caret is visible (${s.caret})`);
  }

  // Heading and mono lines.
  const heading = await page.$eval("h1", (el) => ({ c: getComputedStyle(el).color, t: el.textContent }));
  const plane = await page.$eval(".admin", (el) => getComputedStyle(el).backgroundColor);
  const planeRgb = over(parseRgb(plane), WHITE);
  check(heading.t?.includes("Sign in.") && contrast(parseRgb(heading.c), planeRgb) >= 12, `heading "Sign in." ${contrast(parseRgb(heading.c), planeRgb).toFixed(2)}:1`);
  const monos = await page.$$eval(".a-auth-mono", (els) => els.map((e) => getComputedStyle(e).color));
  for (const c of monos) check(contrast(parseRgb(c), planeRgb) >= 4.79, `mono line ${contrast(parseRgb(c), planeRgb).toFixed(2)}:1 (needs 4.79)`);

  // The button is filled.
  const btn = await page.$eval('button[type="submit"]', (el) => ({ bg: getComputedStyle(el).backgroundColor, c: getComputedStyle(el).color, h: el.getBoundingClientRect().height }));
  const btnBg = parseRgb(btn.bg);
  check(btnBg.a > 0.9 && contrast(btnBg, planeRgb) >= 3, `submit button is filled (${btn.bg})`);
  check(contrast(parseRgb(btn.c), btnBg) >= 4.5, `submit label ${contrast(parseRgb(btn.c), btnBg).toFixed(2)}:1 on the button`);
  check(btn.h >= 44, `submit button is ${btn.h}px tall`);

  // The eye toggle.
  const toggle = 'button[aria-controls="password"]';
  const t0 = await page.$eval(toggle, (el) => {
    const r = el.getBoundingClientRect();
    return { label: el.getAttribute("aria-label"), pressed: el.getAttribute("aria-pressed"), w: r.width, h: r.height, type: el.type };
  });
  check(t0.type === "button" && t0.label === "Show password" && t0.pressed === "false", `eye toggle present (${t0.label}, pressed=${t0.pressed})`);
  check(t0.w >= 44 && t0.h >= 44, `eye toggle hit area ${t0.w}×${t0.h}`);

  await page.type("#email", "nobody@blacktivity.invalid");
  await page.type("#password", "not-the-password-123");
  await page.click(toggle);
  await page.waitForFunction(() => document.querySelector("#password").type === "text");
  const t1 = await page.$eval(toggle, (el) => ({ label: el.getAttribute("aria-label"), pressed: el.getAttribute("aria-pressed") }));
  const focused = await page.evaluate(() => document.activeElement?.id);
  check(t1.label === "Hide password" && t1.pressed === "true", `toggle flips type to text and label to "${t1.label}"`);
  check(focused === "password", `focus stays in the password field (${focused})`);
  const visible = await styleOf("#password");
  check(contrast(over(parseRgb(visible.fill || visible.color), parseRgb(visible.bg)), parseRgb(visible.bg)) >= 4.5, "revealed password text has ≥4.5:1");
  // Text must not run under the icon.
  const pad = await page.$eval("#password", (el) => parseFloat(getComputedStyle(el).paddingRight));
  check(pad >= t0.w, `password field right padding ${pad}px clears the ${t0.w}px toggle`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/login-typed-${width}.png` });
  await page.click(toggle);
  await page.waitForFunction(() => document.querySelector("#password").type === "password");
  check(true, "toggle flips back to password");

  // Error state — one attempt, only at the first width.
  if (width === 1440) {
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="alert"]', { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 400)); // let the 120ms border transition finish
    const alert = await page.$eval('[role="alert"]', (el) => el.textContent);
    const e = await styleOf("#email");
    const p = await styleOf("#password");
    check(/incorrect|too many/i.test(alert ?? ""), `error message shown: "${alert}"`);
    check(e.invalid === "true" && p.invalid === "true", "both fields aria-invalid");
    for (const [id, st] of [["#email", e], ["#password", p]]) {
      const red = parseRgb(st.border);
      check(red.r > red.g + 60, `${id} error border is red (${st.border})`);
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/login-error-${width}.png` });
  }
  await page.close();
}

await browser.close();
console.log(failures.length ? `\nFAILED: ${failures.length}` : "\nadmin-login: PASS");
process.exit(failures.length ? 1 : 0);
