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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dpr = window.devicePixelRatio || 1;
      sparks.current = sparks.current.filter((s) => now - s.start < duration);

      for (const s of sparks.current) {
        const t = (now - s.start) / duration;
        const eased = 1 - Math.pow(1 - t, 3);
        const dist = sparkRadius * eased;
        const len = sparkLength * (1 - t);

        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(
          (s.x + Math.cos(s.angle) * dist) * dpr,
          (s.y + Math.sin(s.angle) * dist) * dpr,
        );
        ctx.lineTo(
          (s.x + Math.cos(s.angle) * (dist + len)) * dpr,
          (s.y + Math.sin(s.angle) * (dist + len)) * dpr,
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

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
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
      className="pointer-events-none fixed inset-0 z-[70] h-screen w-screen"
    />
  );
}

export default ClickSpark;
