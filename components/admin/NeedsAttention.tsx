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
          className="flex items-center gap-4 px-5"
          style={{
            height: 56,
            borderTop: i === 0 ? undefined : "1px solid var(--admin-rule)",
          }}
        >
          <span className="a-meta w-[86px] flex-none">{KIND_LABEL[item.kind]}</span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px]">{item.title}</span>
            <span className="a-muted block truncate text-[11.5px]">{item.meta}</span>
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
