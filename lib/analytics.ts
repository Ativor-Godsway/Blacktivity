/**
 * Client analytics — small, batched, and deliberately quiet.
 *
 * Design notes:
 *  - Events are queued and flushed with sendBeacon, which is fire-and-forget
 *    and never blocks render or unload. fetch() on unload is unreliable.
 *  - Heartbeats fire only while the tab is visible, so a backgrounded tab
 *    cannot inflate time-on-page.
 *  - Exactly ONE delegated click listener, recording only [data-track] elements.
 */
type QueuedEvent = {
  type: "pageview" | "heartbeat" | "click" | "vital";
  sessionId: string;
  path: string;
  referrer: string;
  meta: { label?: string; seconds?: number; name?: string; value?: number; rating?: string };
  ts: number;
};

const ENDPOINT = "/api/track";
const HEARTBEAT_MS = 15_000;
const FLUSH_MS = 30_000;
const SESSION_KEY = "blacktivity:sid";
const MAX_QUEUE = 50;

let queue: QueuedEvent[] = [];
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
let currentPath = "";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private mode or storage disabled — a per-load id still gives useful data.
    return "ephemeral-" + Math.random().toString(36).slice(2);
  }
}

function enqueue(
  type: QueuedEvent["type"],
  meta: QueuedEvent["meta"] = {},
  path = currentPath,
) {
  queue.push({
    type,
    sessionId: getSessionId(),
    path,
    referrer: type === "pageview" ? document.referrer : "",
    meta,
    ts: Date.now(),
  });

  if (queue.length >= MAX_QUEUE) flush();
}

function flush() {
  if (queue.length === 0) return;

  const payload = JSON.stringify({ events: queue });
  queue = [];

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }

    // Older browsers only. keepalive keeps it alive past unload.
    void fetch(ENDPOINT, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never throw into the app */
  }
}

/** Called on mount and on every App Router navigation. */
export function trackPageview(path: string) {
  currentPath = path;
  enqueue("pageview", {}, path);
}

export function trackClick(label: string) {
  enqueue("click", { label });
}

export function startAnalytics(path: string) {
  if (started || typeof window === "undefined") return;
  started = true;
  currentPath = path;

  // Time on page — only while the tab is actually visible.
  heartbeatTimer = setInterval(() => {
    if (document.visibilityState === "visible") {
      enqueue("heartbeat", { seconds: HEARTBEAT_MS / 1000 });
    }
  }, HEARTBEAT_MS);

  flushTimer = setInterval(flush, FLUSH_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  window.addEventListener("pagehide", flush);

  // One delegated listener for the whole document.
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as Element | null;
      const tracked = target?.closest?.("[data-track]");
      if (!tracked) return;

      const label = tracked.getAttribute("data-track");
      if (label) trackClick(label.slice(0, 80));
    },
    { capture: true, passive: true },
  );
}

export function stopAnalytics() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (flushTimer) clearInterval(flushTimer);
  heartbeatTimer = null;
  flushTimer = null;
  started = false;
  flush();
}

/**
 * Records one Core Web Vital. Rides the same queue, the same sendBeacon flush
 * and the same bot filtering as everything else — no second pipeline.
 *
 * Field data from real readers on real Ghanaian networks is worth more than any
 * lab number, and unlike a local run it keeps measuring after launch.
 */
export function trackVital(name: string, value: number, rating: string) {
  // A vital can fire before the first pageview has set currentPath — notably
  // TTFB, which resolves almost immediately. Falling back to the live location
  // keeps the event valid instead of shipping an empty path.
  const path = currentPath || (typeof location !== "undefined" ? location.pathname : "/");

  enqueue(
    "vital",
    {
      name,
    // CLS is unitless and small; everything else is milliseconds. Rounding to
    // 4dp keeps CLS meaningful without storing float noise.
      value: name === "CLS" ? Math.round(value * 10_000) / 10_000 : Math.round(value),
      rating,
    },
    path,
  );
}
