/**
 * THE COMPUTED-CONTRAST CHECK axe doesn't do — Revision 26 §3.2.
 *
 * Runs IN THE PAGE (passed to page.evaluate). For every visible text node and
 * every form control currently inside the viewport it works out the colour
 * actually painted and the colour actually underneath, and returns the pair.
 *
 * WHAT IS UNDERNEATH is read from the paint stack (document.elementsFromPoint)
 * at the text's own position, not from DOM ancestors. The public header is an
 * absolutely-positioned overlay with a transparent ground, so its ancestors say
 * "black body" while the reader sees whatever section is scrolled beneath it —
 * walking ancestors would measure the wrong thing exactly where it matters.
 *
 * Every colour goes through a canvas to normalise it: computed styles can come
 * back as rgb(), color(srgb …) or oklab(…) depending on how they were written
 * (color-mix especially), and the canvas turns all of them into rgba().
 *
 * Returns rows; the runner decides pass/fail. Kept dependency-free because it
 * is serialised into the browser.
 */
export function measureViewport({ seenAttr = "data-audit-seen", step = 0 } = {}) {
  const norm = (c) => {
    // Computed colours arrive as rgb(), color(srgb …), oklab(…) or oklch(…) —
    // Tailwind 4's alpha utilities (text-white/60) compute to oklab. Parsed
    // here rather than through a canvas, which silently rejects some of them.
    if (!c || c === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    const num = (t, scale = 1) => (t === "none" ? 0 : t.endsWith("%") ? (parseFloat(t) / 100) * scale : parseFloat(t));
    const m = c.match(/^(\w+)\((.*)\)$/);
    if (!m) return { r: 0, g: 0, b: 0, a: 1 };
    const fn = m[1];
    let body = m[2].trim();
    let alpha = 1;
    const slash = body.split("/");
    if (slash.length === 2) {
      alpha = num(slash[1].trim(), 1);
      body = slash[0];
    }
    let parts = body.replace(/,/g, " ").trim().split(/\s+/);
    if ((fn === "rgb" || fn === "rgba") && parts.length === 4) alpha = num(parts.pop(), 1);
    const enc = (v) => {
      v = Math.max(0, Math.min(1, v));
      return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
    };
    const fromOklab = (L, A, B) => {
      const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
      const mm = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
      const s2 = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
      return {
        r: enc(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s2),
        g: enc(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s2),
        b: enc(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s2),
      };
    };
    if (fn === "rgb" || fn === "rgba") return { r: num(parts[0], 255), g: num(parts[1], 255), b: num(parts[2], 255), a: alpha };
    if (fn === "color") {
      const space = parts.shift();
      const [r, g, b] = parts.map((t) => num(t, 1));
      if (space === "srgb") return { r: r * 255, g: g * 255, b: b * 255, a: alpha };
      if (space === "srgb-linear") return { r: enc(r), g: enc(g), b: enc(b), a: alpha };
      return { r: r * 255, g: g * 255, b: b * 255, a: alpha };
    }
    if (fn === "oklab") return { ...fromOklab(num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4)), a: alpha };
    if (fn === "oklch") {
      const L = num(parts[0], 1), C = num(parts[1], 0.4), h = (num(parts[2]) * Math.PI) / 180;
      return { ...fromOklab(L, C * Math.cos(h), C * Math.sin(h)), a: alpha };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  };
  const over = (top, bottom) => {
    const a = top.a;
    return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (x, y) => {
    const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (a + 0.05) / (b + 0.05);
  };
  const hex = ({ r, g, b }) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

  const opacityOf = (el) => {
    let o = 1;
    for (let p = el; p && p.nodeType === 1; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity);
    return o;
  };
  const isImageLayer = (el) => {
    const tag = el.tagName;
    if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS" || tag === "PICTURE" || tag === "IFRAME") return true;
    if (tag === "image" || tag === "svg") return false;
    const bi = getComputedStyle(el).backgroundImage;
    return bi && bi !== "none" && /url\(/.test(bi);
  };
  const hasGradient = (el) => /gradient\(/.test(getComputedStyle(el).backgroundImage);

  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return `${s}#${el.id}`;
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter((c) => c && !c.includes(":") && !c.includes("[")).slice(0, 3);
    if (cls.length) s += "." + cls.join(".");
    const parent = el.parentElement;
    if (parent && parent !== document.body) {
      let ps = parent.tagName.toLowerCase();
      if (parent.id) ps += `#${parent.id}`;
      s = `${ps} > ${s}`;
    }
    return s;
  };

  /** The background under (x,y), below `el`. */
  function groundAt(el, x, y) {
    const stack = document.elementsFromPoint(x, y);
    let start = stack.findIndex((n) => n === el || el.contains(n));
    const layers = [];
    let overImage = false;
    let scrim = false;
    // Anything ABOVE the text that isn't related to it and is opaque covers it.
    // The text's own element isn't hit at its own position: something above
    // it, or a clipping ancestor, hides it here. (pointer-events:none text,
    // like the overlay header's, is legitimately absent and still measured.)
    if (start === -1 && getComputedStyle(el).pointerEvents !== "none") return { covered: true };
    for (let i = 0; i < (start === -1 ? 0 : start); i++) {
      const n = stack[i];
      if (n.contains(el) || el.contains(n)) continue;
      const bg = norm(getComputedStyle(n).backgroundColor);
      // Opaque: covered. Translucent: a modal backdrop — what is under it is
      // inert while the dialog is open, so it isn't something to read.
      if (bg.a * opacityOf(n) > 0.15) return { covered: true };
    }
    const from = start === -1 ? 0 : start;
    for (let i = from; i < stack.length; i++) {
      const n = stack[i];
      if (el.contains(n) && n !== el) continue;
      if (isImageLayer(n)) {
        overImage = true;
        break;
      }
      if (hasGradient(n)) scrim = true;
      const bg = norm(getComputedStyle(n).backgroundColor);
      const a = bg.a * opacityOf(n);
      if (a > 0) layers.push({ ...bg, a });
      if (a >= 0.999) break;
    }
    if (overImage) return { overImage: true, scrim: scrim || layers.some((l) => l.a > 0.2) };
    // The canvas under everything is the html element's ground (or white).
    let base = norm(getComputedStyle(document.documentElement).backgroundColor);
    if (base.a < 1) base = over(base, { r: 255, g: 255, b: 255, a: 1 });
    let ground = base;
    for (let i = layers.length - 1; i >= 0; i--) ground = over(layers[i], ground);
    return { ground };
  }

  const vw = innerWidth;
  const vh = innerHeight;
  const rows = [];
  const skipped = { decorative: 0, hidden: 0, offscreen: 0, covered: 0, disabled: 0 };

  const consider = (el, rect, kind, textSample, colorEl = el) => {
    const x = rect.left + Math.min(rect.width / 2, 6);
    const y = rect.top + rect.height / 2;
    if (x < 0 || y < 0 || x >= vw || y >= vh) {
      skipped.offscreen++;
      return;
    }
    const fixed = (() => {
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const pos = getComputedStyle(p).position;
        if (pos === "fixed" || pos === "sticky") return true;
      }
      return false;
    })();
    const seen = el.getAttribute(seenAttr);
    if (seen && !fixed) return;
    // Scrolled out of a scrolling or clipping ancestor (a wide table on a
    // phone): not painted here, so not measured here.
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const pc = getComputedStyle(p);
      if (pc.overflowX === "visible" && pc.overflowY === "visible") continue;
      const pr = p.getBoundingClientRect();
      if (x < pr.left || x > pr.right || y < pr.top || y > pr.bottom) {
        skipped.covered++;
        return;
      }
    }

    const g = groundAt(el, x, y);
    if (g.covered) {
      skipped.covered++;
      return;
    }
    el.setAttribute(seenAttr, "1");

    const cs = getComputedStyle(colorEl, kind === "placeholder" ? "::placeholder" : null);
    const fillRaw = cs.webkitTextFillColor;
    let fg = norm(fillRaw && fillRaw !== cs.color ? fillRaw : cs.color);
    fg = { ...fg, a: fg.a * opacityOf(el) };
    const size = parseFloat(getComputedStyle(el).fontSize);
    const weight = parseInt(getComputedStyle(el).fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;

    const row = { kind, selector: describe(el), text: textSample.slice(0, 60), size, required, fixed, step };
    if (g.overImage) {
      rows.push({ ...row, overImage: true, scrim: g.scrim });
      return;
    }
    const painted = over(fg, g.ground);
    row.ratio = Math.round(ratio(painted, g.ground) * 100) / 100;
    row.fg = hex(painted);
    row.bg = hex(g.ground);
    rows.push(row);
  };

  const hiddenByStyle = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible" || cs.display === "none") return true;
    if (opacityOf(el) < 0.1) return true;
    // Screen-reader-only text (Tailwind sr-only: a 1px clipped box) is not
    // painted for anyone who could read it.
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const pc = getComputedStyle(p);
      const r = p.getBoundingClientRect();
      if ((pc.clip && pc.clip !== "auto") || /inset\(50%\)/.test(pc.clipPath)) return true;
      if (pc.overflow === "hidden" && (r.width <= 1.5 || r.height <= 1.5)) return true;
    }
    return false;
  };
  const tiny = (r) => r.width <= 1.5 || r.height <= 1.5;

  // 1. Text nodes.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const done = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || done.has(el)) continue;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|TEXTAREA|TITLE|SELECT)$/.test(el.tagName)) continue;
    done.add(el);
    if (el.closest('[aria-hidden="true"]')) {
      skipped.decorative++;
      continue;
    }
    if (hiddenByStyle(el)) {
      skipped.hidden++;
      continue;
    }
    if (el.closest("button:disabled, [aria-disabled='true'], fieldset:disabled")) {
      skipped.disabled++;
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(n);
    const rect = [...range.getClientRects()].find((r) => !tiny(r));
    if (!rect) {
      skipped.hidden++;
      continue;
    }
    consider(el, rect, "text", n.textContent.trim());
  }

  // 2. Form controls — the VALUE, which is where Revision 26's screenshot failed.
  const controls = document.querySelectorAll(
    'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]):not([type=submit]):not([type=button]), textarea, select, [contenteditable="true"]',
  );
  for (const el of controls) {
    if (el.hidden || hiddenByStyle(el)) continue;
    if (el.disabled) {
      skipped.disabled++;
      continue;
    }
    const rect = el.getBoundingClientRect();
    if (tiny(rect)) continue;
    if (el.isContentEditable) {
      // The editor's paragraphs are text nodes and were measured above; this
      // row records the editing area's own ground so an invisible box shows up.
      continue;
    }
    const value = el.tagName === "SELECT" ? el.selectedOptions[0]?.textContent ?? "" : el.value;
    const inner = { left: rect.left + 8, top: rect.top + rect.height / 2 - 1, width: 2, height: 2 };
    if (value) {
      el.removeAttribute(seenAttr);
      consider(el, inner, "value", el.type === "password" ? "••••" : value);
    } else if (el.placeholder) {
      el.removeAttribute(seenAttr);
      consider(el, inner, "placeholder", el.placeholder);
    }
  }

  return { rows, skipped };
}

/** Field boxes: every control must have a visible edge or a ground distinct from its surroundings. */
export function measureFieldBoxes() {
  const norm = (c) => {
    // Computed colours arrive as rgb(), color(srgb …), oklab(…) or oklch(…) —
    // Tailwind 4's alpha utilities (text-white/60) compute to oklab. Parsed
    // here rather than through a canvas, which silently rejects some of them.
    if (!c || c === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    const num = (t, scale = 1) => (t === "none" ? 0 : t.endsWith("%") ? (parseFloat(t) / 100) * scale : parseFloat(t));
    const m = c.match(/^(\w+)\((.*)\)$/);
    if (!m) return { r: 0, g: 0, b: 0, a: 1 };
    const fn = m[1];
    let body = m[2].trim();
    let alpha = 1;
    const slash = body.split("/");
    if (slash.length === 2) {
      alpha = num(slash[1].trim(), 1);
      body = slash[0];
    }
    let parts = body.replace(/,/g, " ").trim().split(/\s+/);
    if ((fn === "rgb" || fn === "rgba") && parts.length === 4) alpha = num(parts.pop(), 1);
    const enc = (v) => {
      v = Math.max(0, Math.min(1, v));
      return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
    };
    const fromOklab = (L, A, B) => {
      const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
      const mm = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
      const s2 = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
      return {
        r: enc(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s2),
        g: enc(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s2),
        b: enc(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s2),
      };
    };
    if (fn === "rgb" || fn === "rgba") return { r: num(parts[0], 255), g: num(parts[1], 255), b: num(parts[2], 255), a: alpha };
    if (fn === "color") {
      const space = parts.shift();
      const [r, g, b] = parts.map((t) => num(t, 1));
      if (space === "srgb") return { r: r * 255, g: g * 255, b: b * 255, a: alpha };
      if (space === "srgb-linear") return { r: enc(r), g: enc(g), b: enc(b), a: alpha };
      return { r: r * 255, g: g * 255, b: b * 255, a: alpha };
    }
    if (fn === "oklab") return { ...fromOklab(num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4)), a: alpha };
    if (fn === "oklch") {
      const L = num(parts[0], 1), C = num(parts[1], 0.4), h = (num(parts[2]) * Math.PI) / 180;
      return { ...fromOklab(L, C * Math.cos(h), C * Math.sin(h)), a: alpha };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (x, y) => {
    const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (a + 0.05) / (b + 0.05);
  };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const groundOf = (el) => {
    const layers = [];
    for (let p = el; p; p = p.parentElement) {
      const bg = norm(getComputedStyle(p).backgroundColor);
      if (bg.a > 0) layers.push(bg);
      if (bg.a >= 0.999) break;
    }
    let g = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) g = over(layers[i], g);
    return g;
  };
  const out = [];
  const els = document.querySelectorAll(
    'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=submit]):not([type=button]), textarea, select, [contenteditable="true"]',
  );
  for (const input of els) {
    const r = input.getBoundingClientRect();
    if (input.hidden || r.width < 2 || r.height < 2 || getComputedStyle(input).visibility !== "visible") continue;
    // Honeypots and other controls nobody is meant to see.
    if (input.closest('[aria-hidden="true"]') || r.right < 0 || r.left > innerWidth + 1) continue;
    // A control without its own edge may sit in a bordered wrapper — the tag
    // input inside its chip box, the editor inside its frame. Judge the box
    // the reader actually sees: the nearest of up to three ancestors with a border.
    let el = input;
    const hasEdge = (n) => {
      const c = getComputedStyle(n);
      return Math.max(parseFloat(c.borderTopWidth), parseFloat(c.borderBottomWidth)) >= 1;
    };
    if (!hasEdge(input)) {
      for (let p = input.parentElement, i = 0; p && i < 3; p = p.parentElement, i++) {
        if (hasEdge(p)) {
          el = p;
          break;
        }
      }
    }
    const cs = getComputedStyle(el);
    const surround = groundOf(el.parentElement);
    const own = groundOf(el);
    const borderW = Math.max(parseFloat(cs.borderTopWidth), parseFloat(cs.borderBottomWidth));
    const edge = borderW >= 1 ? ratio(over(norm(cs.borderBottomColor), own), own) : 0;
    const groundStep = ratio(own, surround);
    // A box is visible if its border clears 3:1 against the field, or its own
    // ground clears 1.25:1 against what surrounds it (a white field on sand).
    const visible = edge >= 3 || (borderW >= 1 && edge >= 1.5 && groundStep >= 1.1) || groundStep >= 1.25;
    out.push({
      selector: input.id ? `${input.tagName.toLowerCase()}#${input.id}` : input.tagName.toLowerCase() + (input.getAttribute("class") ? "." + input.getAttribute("class").split(/\s+/)[0] : ""),
      edge: Math.round(edge * 100) / 100,
      groundStep: Math.round(groundStep * 100) / 100,
      visible,
    });
  }
  return out;
}
