import Link from "next/link";
import "./globals.css";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center px-(--gutter)">
      <p className="mono text-fg-dim">Error 404 — Page not found</p>
      <h1 className="display mt-8 text-[clamp(3rem,12vw,8rem)]">
        This page
        <br />
        isn&apos;t in
        <br />
        the room.
      </h1>
      <p className="mt-8 max-w-[42ch] text-fg-muted">
        The link may be old, or the piece may have moved. The archive is still here.
      </p>
      <Link
        href="/"
        className="mono mt-12 border-b border-fg pb-1 text-fg"
      >
        Back to the front page ↗
      </Link>
    </div>
  );
}
