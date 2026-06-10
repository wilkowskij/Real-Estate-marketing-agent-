"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import type { FeedbackType, FeedbackStatus } from "@/lib/supabase/types";

export interface FeedbackRow {
  id: string;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  created_at: string;
}

const TYPE_LABEL: Record<FeedbackType, string> = {
  bug: "Problem",
  feedback: "Feedback",
  feature: "Feature request",
};

/** Customer-friendly status labels + colors (read-only; set by the team). */
const STATUS: Record<FeedbackStatus, { label: string; className: string }> = {
  new: { label: "Received", className: "bg-paper text-ink-soft border-paper-line" },
  triaged: { label: "Under review", className: "bg-blue-50 text-blue-700 border-blue-200" },
  planned: { label: "Planned", className: "bg-amber-50 text-amber-700 border-amber-200" },
  done: { label: "Shipped", className: "bg-green-50 text-green-700 border-green-200" },
  wont_do: { label: "Not planned", className: "bg-paper text-ink-muted border-paper-line" },
};

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const s = STATUS[status] ?? STATUS.new;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function FeedbackClient({ rows }: { rows: FeedbackRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <Card className="mt-8">
        <CardBody>
          <p className="text-sm text-ink-muted">
            No requests yet. Use the “Send support &amp; feedback” link at the bottom of any
            page to report a problem, share feedback, or request a feature.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      {rows.map((r) => {
        const open = expanded === r.id;
        return (
          <Card key={r.id}>
            <CardBody>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : r.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {TYPE_LABEL[r.type]} · {fmtDate(r.created_at)}
                  </p>
                  <p className="mt-1 font-medium text-ink">{r.subject}</p>
                  {!open && <p className="mt-1 truncate text-sm text-ink-muted">{r.message}</p>}
                </div>
                <StatusBadge status={r.status} />
              </button>
              {open && <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{r.message}</p>}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
