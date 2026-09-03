"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center px-(--gutter)">
      <p className="mono text-fg-dim">Error — Something broke</p>
      <h1 className="display mt-8 text-[clamp(3rem,10vw,7rem)]">
        A press
        <br />
        malfunction.
      </h1>
      <p className="mt-8 max-w-[42ch] text-fg-muted">
        Something went wrong on our side. Try again — and if it keeps happening,
        let us know on Instagram.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mono mt-12 border border-fg bg-fg px-6 py-4 text-bg transition-colors duration-300 hover:bg-transparent hover:text-fg"
      >
        Try again
      </button>
    </div>
  );
}
