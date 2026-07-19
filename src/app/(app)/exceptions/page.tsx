import { ExternalLink, PackageCheck, Send, ShieldCheck } from "lucide-react";
import type { CheckIn, Contractor } from "@prisma/client";
import { db } from "@/lib/db";
import { daysUntil } from "@/lib/dates";
import { formatDate, tMark } from "@/lib/display";
import { markAssetReturned, resendNudge } from "@/lib/actions";
import { ActionButton } from "@/components/action-button";
import { Tabs } from "@/components/tabs";
import {
  AuditTrail,
  EmptyState,
  PageHeader,
  buttonSmall,
  type AuditEntryView,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type Finding = Contractor & { checkIns: CheckIn[] };

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function initials(c: Contractor): string {
  return `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase();
}

function toEntries(checkIns: CheckIn[]): AuditEntryView[] {
  return checkIns.map((ci) => ({
    id: ci.id,
    mark: tMark(ci.daysBeforeExpiry),
    sentAtLabel: formatDate(ci.sentAt),
    response: ci.response,
    respondedAtLabel: ci.respondedAt ? formatDate(ci.respondedAt) : null,
  }));
}

function Evidence({ checkIns }: { checkIns: CheckIn[] }) {
  const answered = checkIns.filter((ci) => ci.response).length;
  return (
    <div className="mt-4 rounded-md border border-zinc-100 bg-zinc-50/60 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
          Audit trail
        </p>
        <p className="font-mono text-[11px] tabular-nums text-zinc-600">
          {checkIns.length} asked · {answered} answered
        </p>
      </div>
      <div className="mt-3">
        <AuditTrail entries={toEntries(checkIns)} />
      </div>
    </div>
  );
}

function FindingCard({
  c,
  overdueDays,
  sentence,
  actions,
  footer,
}: {
  c: Finding;
  overdueDays: number;
  sentence: React.ReactNode;
  actions: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-700"
        >
          {initials(c)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] leading-7 text-zinc-800">{sentence}</p>
            <span className="mt-0.5 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums leading-4 text-zinc-700">
              {overdueDays}d overdue
            </span>
          </div>
          <Evidence checkIns={c.checkIns} />
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {actions}
          </div>
          {footer}
        </div>
      </div>
    </article>
  );
}

function NoResponsePanel({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <EmptyState icon={ShieldCheck} title="No unanswered expirations">
        Every contractor past their end date has a recorded manager response.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-3">
      {findings.map((c) => {
        const daysAgo = Math.abs(daysUntil(c.endDate));
        const asked = c.checkIns.length;
        const openToken = [...c.checkIns]
          .reverse()
          .find((ci) => !ci.response)?.token;
        return (
          <FindingCard
            key={c.id}
            c={c}
            overdueDays={daysAgo}
            sentence={
              <>
                <strong className="font-semibold text-zinc-900">
                  {c.firstName} {c.lastName}
                </strong>
                &apos;s contract ended {plural(daysAgo, "day")} ago. Their
                manager ({c.managerName}) was asked {plural(asked, "time")} and
                never responded.{" "}
                <strong className="font-semibold text-red-700">
                  Their account is still active.
                </strong>
              </>
            }
            actions={
              <>
                <form action={resendNudge}>
                  <input type="hidden" name="contractorId" value={c.id} />
                  <ActionButton className={buttonSmall}>
                    <Send size={12} aria-hidden />
                    Send new nudge
                  </ActionButton>
                </form>
                {openToken ? (
                  <a
                    href={`/respond/${openToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonSmall}
                  >
                    <ExternalLink size={12} aria-hidden />
                    Open manager view
                  </a>
                ) : null}
              </>
            }
          />
        );
      })}
    </div>
  );
}

function AssetsPanel({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <EmptyState icon={ShieldCheck} title="No assets outstanding">
        Every departed contractor&apos;s company asset is back.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-3">
      {findings.map((c) => {
        const daysAgo = Math.abs(daysUntil(c.endDate));
        return (
          <FindingCard
            key={c.id}
            c={c}
            overdueDays={daysAgo}
            sentence={
              <>
                <strong className="font-semibold text-zinc-900">
                  {c.firstName} {c.lastName}
                </strong>{" "}
                left {plural(daysAgo, "day")} ago with a {c.assetType} (serial{" "}
                <span className="font-mono text-[13px]">{c.assetSerial}</span>
                ).{" "}
                <strong className="font-semibold text-red-700">
                  It has not been returned.
                </strong>
              </>
            }
            actions={
              <form action={markAssetReturned}>
                <input type="hidden" name="contractorId" value={c.id} />
                <ActionButton className={buttonSmall}>
                  <PackageCheck size={12} aria-hidden />
                  Mark asset returned
                </ActionButton>
              </form>
            }
            footer={
              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Follow up with {c.managerName} ·{" "}
                <span className="font-mono">{c.managerEmail}</span>
              </p>
            }
          />
        );
      })}
    </div>
  );
}

export default async function ExceptionsPage() {
  // Longest overdue first (earliest end date).
  const noResponse = await db.contractor.findMany({
    where: { status: "EXPIRED_NO_RESPONSE" },
    include: { checkIns: { orderBy: { sentAt: "asc" } } },
    orderBy: { endDate: "asc" },
  });

  const assetsOut = await db.contractor.findMany({
    where: { status: "ENDED", assetReturned: false },
    include: { checkIns: { orderBy: { sentAt: "asc" } } },
    orderBy: { endDate: "asc" },
  });

  const total = noResponse.length + assetsOut.length;

  return (
    <main className="mx-auto max-w-3xl px-8 py-8">
      <PageHeader
        title="Exceptions"
        description={
          total === 0
            ? "Open findings, with the timestamped evidence behind each one."
            : `${plural(total, "open finding")}, most overdue first. Every ask is timestamped — this page is the audit trail.`
        }
      />

      <div className="mt-6">
        {total === 0 ? (
          <EmptyState icon={ShieldCheck} title="No open exceptions">
            Every contractor past their end date has a recorded manager
            response, and every departed contractor&apos;s asset is back.
            Nothing to chase.
          </EmptyState>
        ) : (
          <Tabs
            items={[
              {
                id: "no-response",
                label: "No manager response",
                count: noResponse.length,
                dotClass: "bg-red-600",
                content: <NoResponsePanel findings={noResponse} />,
              },
              {
                id: "assets",
                label: "Assets outstanding",
                count: assetsOut.length,
                dotClass: "bg-amber-500",
                content: <AssetsPanel findings={assetsOut} />,
              },
            ]}
          />
        )}
      </div>
    </main>
  );
}
