"use client";

import { useCallback, useEffect, useRef } from "react";

type Spark = { x: number; y: number; angle: number; start: number };

/**
 * A small burst of lines on click.
 *
 * THE LOOP ONLY RUNS WHILE THERE ARE SPARKS. The stock component schedules
 * requestAnimationFrame unconditionally, so it burns a frame callback for the
 * entire life of the page; here the loop starts on click and stops itself the
 * moment the last spark expires, so it costs nothing at rest.
 *
 * Monochrome by contract — `sparkColor` takes ink on paper and paper on the
 * black sections, never a hue.
 */
export function ClickSpark({
  sparkColor = "#0B0B0B",
  sparkCount = 7,
  sparkRadius = 14,
  sparkLength = 8,
  duration = 400,
}: {
  sparkColor?: string;
  sparkCount?: number;
  sparkRadius?: number;
  sparkLength?: number;
  duration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const raf = useRef<number | null>(null);
  const reduced = useRef(false);

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      // The context is pre-scaled by dpr, so every unit below is a CSS pixel.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparks.current = sparks.current.filter((s) => now - s.start < duration);

      for (const s of sparks.current) {
        const t = (now - s.start) / duration;
        const eased = 1 - Math.pow(1 - t, 3);
        const dist = sparkRadius * eased;
        const len = sparkLength * (1 - t);

        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(s.angle) * dist, s.y + Math.sin(s.angle) * dist);
        ctx.lineTo(
          s.x + Math.cos(s.angle) * (dist + len),
          s.y + Math.sin(s.angle) * (dist + len),
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Stop entirely once the last spark has gone.
      if (sparks.current.length === 0) {
        raf.current = null;
        return;
      }
      raf.current = requestAnimationFrame(draw);
    },
    [duration, sparkColor, sparkLength, sparkRadius],
  );

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    /**
     * The canvas is a fixed, untransformed, viewport-sized overlay, so
     * `e.clientX/clientY` ARE its coordinates — there is deliberately no
     * getBoundingClientRect anywhere in this component. A rect is measured
     * after any ancestor transform while the backing store is not, which is
     * what makes sparks drift under a transformed wrapper.
     *
     * Scaling the context by dpr once means everything drawn below is in CSS
     * pixels and matches clientX/clientY directly.
     */
    let mq: MediaQueryList | null = null;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr); }

      // Zooming changes devicePixelRatio without firing `resize` on every
      // platform, so re-arm a listener bound to the current ratio.
      mq?.removeEventListener("change", resize);
      mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
      mq.addEventListener("change", resize);
    };
    resize();
    window.addEventListener("resize", resize);

    const onClick = (e: MouseEvent) => {
      const now = performance.now();
      for (let i = 0; i < sparkCount; i++) {
        sparks.current.push({
          x: e.clientX,
          y: e.clientY,
          angle: (Math.PI * 2 * i) / sparkCount,
          start: now,
        });
      }
      // Kick the loop only if it is not already running.
      if (raf.current === null) raf.current = requestAnimationFrame(draw);
    };
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("resize", resize);
      mq?.removeEventListener("change", resize);
      window.removeEventListener("click", onClick);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      sparks.current = [];
    };
  }, [draw, sparkCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // Fixed and pointer-events-none so it can never affect the page's own
      // height or intercept a click.
      className="pointer-events-none fixed inset-0 z-[70]"
    />
  );
}

export default ClickSpark;
