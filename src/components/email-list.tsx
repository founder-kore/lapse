"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Inbox } from "lucide-react";
import { Badge, EmptyState, buttonSecondary } from "@/components/ui";

export type EmailView = {
  id: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  subject: string;
  question: string;
  notice: string; // "14-day notice" | "Follow-up" | …
  sentAtLabel: string;
  response: string | null; // EXTENDING | ENDING | null
  respondedAtLabel: string | null;
  extendUrl: string;
  endUrl: string;
};

type StatusFilter = "all" | "awaiting" | "answered";

function StatusChip({ email }: { email: EmailView }) {
  if (!email.response) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] font-medium leading-4 text-zinc-700">
        <Clock size={11} aria-hidden />
        Awaiting reply
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium leading-4 text-zinc-800">
      <Check size={11} aria-hidden />
      {email.response === "EXTENDING" ? "Extending" : "Ending"}
    </span>
  );
}

function EmailCard({ email }: { email: EmailView }) {
  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-sm">
      <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <Badge>{email.notice}</Badge>
            <span className="truncate font-mono text-xs tabular-nums text-zinc-600">
              {email.sentAtLabel}
            </span>
          </span>
          <StatusChip email={email} />
        </div>
        <div className="mt-1.5 truncate text-xs text-zinc-600">
          To{" "}
          <span className="font-medium text-zinc-700">{email.toName}</span>{" "}
          <span className="font-mono">&lt;{email.toAddress}&gt;</span>
          <span className="mx-1.5 text-zinc-400" aria-hidden>
            ·
          </span>
          From <span className="font-mono">{email.fromAddress}</span>
        </div>
      </div>

      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">{email.subject}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-700">
          Hi {email.toName},
        </p>
        <p className="mt-1.5 text-sm font-medium leading-6 text-zinc-900">
          {email.question}
        </p>
        <p className="mt-1.5 text-xs leading-5 text-zinc-600">
          One click records your answer with a timestamp. No login needed.
        </p>

        {email.response ? (
          <p className="mt-4 text-xs text-zinc-600">
            Recorded{" "}
            <span className="font-semibold text-zinc-900">
              {email.response === "EXTENDING" ? "Yes, extending" : "No, ending"}
            </span>
            {email.respondedAtLabel ? ` on ${email.respondedAtLabel}` : ""}.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2.5">
            <a href={email.extendUrl} className={buttonSecondary}>
              Yes, extending
            </a>
            <a href={email.endUrl} className={buttonSecondary}>
              No, ending
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

export function EmailList({ emails }: { emails: EmailView[] }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [notice, setNotice] = useState("all");

  const noticeOptions = useMemo(
    () => [...new Set(emails.map((e) => e.notice))],
    [emails],
  );

  const counts = useMemo(
    () => ({
      all: emails.length,
      awaiting: emails.filter((e) => !e.response).length,
      answered: emails.filter((e) => e.response).length,
    }),
    [emails],
  );

  const filtered = emails.filter((e) => {
    if (status === "awaiting" && e.response) return false;
    if (status === "answered" && !e.response) return false;
    if (notice !== "all" && e.notice !== notice) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="inline-flex gap-1 rounded-lg bg-zinc-100 p-1">
          {(
            [
              ["all", "All"],
              ["awaiting", "Awaiting"],
              ["answered", "Answered"],
            ] as [StatusFilter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id)}
              aria-pressed={status === id}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {label}
              <span className="tabular-nums text-zinc-600">{counts[id]}</span>
            </button>
          ))}
        </div>
        <select
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          aria-label="Filter by notice type"
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">All notices</option>
          {noticeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Inbox} title="Nothing matches these filters">
            Try a different status or notice type.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {filtered.map((e) => (
            <EmailCard key={e.id} email={e} />
          ))}
        </div>
      )}
    </div>
  );
}
