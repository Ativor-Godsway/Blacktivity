import Link from "next/link";
import StatusPill from "./StatusPill";
import { Empty } from "./ui/Card";
import type { QueueItem } from "@/lib/admin-queries";

const KIND_LABEL: Record<QueueItem["kind"], string> = {
  submission: "Submission",
  article: "Article",
  event: "Event",
};

const ACTION: Record<QueueItem["kind"], string> = {
  submission: "Review",
  article: "Continue",
  event: "Open",
};

export function NeedsAttention({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return (
      <Empty
        title="Nothing needs you right now"
        body="No pending submissions, no drafts in progress, and no events in the next seven days."
      />
    );
  }

  return (
    <ul>
      {items.map((item, i) => (
        <li
          key={`${item.kind}-${item.id}`}
          // Wraps on a phone: kind and title on the first line, status and the
          // action on the second, instead of pushing the page sideways.
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:min-h-14 sm:flex-nowrap sm:px-5 sm:py-0"
          style={{ borderTop: i === 0 ? undefined : "1px solid var(--admin-rule)" }}
        >
          <span className="a-meta flex-none sm:w-[86px]">{KIND_LABEL[item.kind]}</span>

          <span className="min-w-0 basis-full sm:basis-auto sm:flex-1">
            <span className="block truncate text-[13.5px]">{item.title}</span>
            <span className="a-muted block truncate text-[12px]">{item.meta}</span>
          </span>

          <StatusPill status={item.status} className="flex-none" />

          <Link href={item.href} className="a-btn a-btn-ghost flex-none">
            {ACTION[item.kind]}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default NeedsAttention;
