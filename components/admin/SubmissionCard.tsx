"use client";

import RevealImage from "@/components/ui/RevealImage";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MonoLabel from "@/components/ui/MonoLabel";
import { formatDateMono, cn } from "@/lib/utils";
import type { SubmissionStatus } from "@/lib/constants";

export type SubmissionCardData = {
  id: string;
  name: string;
  email: string;
  igHandle: string;
  discipline: string;
  workUrl: string;
  imageUrl: string;
  note: string;
  status: SubmissionStatus;
  createdAt: string;
};

export function SubmissionCard({ submission }: { submission: SubmissionCardData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>(submission.status);

  async function setStatusTo(next: SubmissionStatus) {
    setBusy(true);

    const res = await fetch(`/api/admin/submissions/${submission.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    setBusy(false);

    if (res.ok) {
      setStatus(next);
      router.refresh();
    } else {
      window.alert("Couldn't update that submission.");
    }
  }

  return (
    <article className="flex flex-col border border-rule">
      {submission.imageUrl ? (
        <RevealImage
          src={submission.imageUrl}
          alt={`Work submitted by ${submission.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          colorOnView={false}
          className="aspect-4/3 w-full border-b border-rule"
        />
      ) : null}

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base">{submission.name}</p>
            <MonoLabel dim className="mt-1 block">
              {submission.discipline}
            </MonoLabel>
          </div>
          <MonoLabel
            className={cn(
              status === "approved" && "text-fg",
              status === "pending" && "text-fg-muted",
              status === "rejected" && "text-fg-faint",
            )}
          >
            {status}
          </MonoLabel>
        </div>

        {submission.note ? (
          <p className="text-sm leading-relaxed text-fg-muted">{submission.note}</p>
        ) : null}

        <dl className="mt-auto flex flex-col gap-1.5 border-t border-rule pt-4">
          <div className="flex justify-between gap-4">
            <dt className="mono text-fg-faint">Email</dt>
            <dd className="mono truncate text-fg-muted">{submission.email}</dd>
          </div>
          {submission.igHandle ? (
            <div className="flex justify-between gap-4">
              <dt className="mono text-fg-faint">Instagram</dt>
              <dd className="mono text-fg-muted">@{submission.igHandle}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="mono text-fg-faint">Received</dt>
            <dd className="mono text-fg-muted">{formatDateMono(submission.createdAt)}</dd>
          </div>
        </dl>

        {submission.workUrl ? (
          <a
            href={submission.workUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mono text-fg-muted hover:text-fg"
          >
            View work ↗
          </a>
        ) : null}

        <div className="flex gap-2 border-t border-rule pt-4">
          <button
            type="button"
            disabled={busy || status === "approved"}
            onClick={() => setStatusTo("approved")}
            className="mono flex-1 border border-rule-strong py-3 transition-colors duration-200 hover:border-fg hover:bg-fg hover:text-bg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy || status === "rejected"}
            onClick={() => setStatusTo("rejected")}
            className="mono flex-1 border border-rule py-3 text-fg-muted transition-colors duration-200 hover:border-rule-strong hover:text-fg disabled:opacity-30"
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}

export default SubmissionCard;
