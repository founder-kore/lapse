import Link from "next/link";
import { ArrowRight, MailX, PackageX, RefreshCw, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { runDailyCheck } from "@/lib/actions";
import { daysUntil } from "@/lib/dates";
import { formatDate, statusLabel, tMark } from "@/lib/display";
import {
  ContractorList,
  type ContractorRowView,
} from "@/components/contractor-list";
import { ActionButton } from "@/components/action-button";
import { PageHeader, buttonPrimary, card } from "@/components/ui";
import type { CheckIn, Contractor } from "@prisma/client";

export const dynamic = "force-dynamic";

type Row = Contractor & { checkIns: CheckIn[] };

// ---------------------------------------------------------------------------
// Serialization: all date math and formatting happens here on the server;
// the client list only filters/sorts/renders plain strings and numbers.
// ---------------------------------------------------------------------------

function toView(c: Row): ContractorRowView {
  const sorted = [...c.checkIns].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
  const open = [...sorted].reverse().find((ci) => !ci.response);
  return {
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    managerName: c.managerName,
    managerEmail: c.managerEmail,
    assetType: c.assetType,
    assetSerial: c.assetSerial,
    assetReturned: c.assetReturned,
    status: c.status,
    statusLabel: statusLabel(c.status),
    endDateLabel: formatDate(c.endDate),
    days: daysUntil(c.endDate),
    checkIns: sorted.map((ci) => ({
      id: ci.id,
      mark: tMark(ci.daysBeforeExpiry),
      sentAtLabel: formatDate(ci.sentAt),
      response: ci.response,
      respondedAtLabel: ci.respondedAt ? formatDate(ci.respondedAt) : null,
    })),
    openToken: open?.token ?? null,
  };
}

// ---------------------------------------------------------------------------
// Overview: hand-built with CSS — no charting library.
// ---------------------------------------------------------------------------

const TONES = {
  expired: { label: "Overdue", bar: "bg-red-600" },
  week: { label: "≤ 7 days", bar: "bg-amber-500" },
  month: { label: "8–30 days", bar: "bg-amber-300" },
  healthy: { label: "> 30 days", bar: "bg-zinc-300" },
} as const;

type ToneKey = keyof typeof TONES;

function toneOf(days: number): ToneKey {
  if (days < 0) return "expired";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "healthy";
}

function AlarmMetric({
  value,
  label,
  sublabel,
  icon: Icon,
}: {
  value: number;
  label: string;
  sublabel: string;
  icon: typeof MailX;
}) {
  const hot = value > 0;
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon
          size={14}
          className={hot ? "text-red-700" : "text-zinc-400"}
          aria-hidden
        />
        <span className="text-xs font-medium text-zinc-600">{label}</span>
      </div>
      <div
        className={`mt-2 text-3xl font-semibold leading-none tracking-tight ${
          hot ? "text-red-700" : "text-zinc-900"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11px] leading-4 text-zinc-600">
        {sublabel}
      </div>
    </div>
  );
}

function NeedsAttentionCard({
  expiredNoResponse,
  assetsOutstanding,
}: {
  expiredNoResponse: number;
  assetsOutstanding: number;
}) {
  const total = expiredNoResponse + assetsOutstanding;
  return (
    <div className={`${card} flex flex-col p-5 lg:col-span-5`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
        Needs attention
      </p>
      <div className="mt-4 grid flex-1 grid-cols-2 gap-6">
        <AlarmMetric
          value={expiredNoResponse}
          label="Expired, no response"
          sublabel="Past end date, manager never answered"
          icon={MailX}
        />
        <AlarmMetric
          value={assetsOutstanding}
          label="Assets outstanding"
          sublabel="Ended, company asset not returned"
          icon={PackageX}
        />
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-3">
        {total > 0 ? (
          <Link
            href="/exceptions"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900"
          >
            Review {total} open finding{total === 1 ? "" : "s"}
            <ArrowRight size={12} aria-hidden />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
            <ShieldCheck size={13} className="text-zinc-500" aria-hidden />
            All clear — nothing to chase.
          </span>
        )}
      </div>
    </div>
  );
}

function PopulationCard({
  counts,
  total,
  inWindow,
  active,
}: {
  counts: Record<ToneKey, number>;
  total: number;
  inWindow: number;
  active: number;
}) {
  return (
    <div className={`${card} flex flex-col p-5 lg:col-span-7`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
          Population by urgency
        </p>
        <p className="text-xs tabular-nums text-zinc-600">{total} tracked</p>
      </div>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-zinc-100">
        {(Object.keys(TONES) as ToneKey[]).map((k) =>
          counts[k] > 0 ? (
            <div
              key={k}
              className={`${TONES[k].bar} transition-all duration-300`}
              style={{ width: `${(counts[k] / total) * 100}%` }}
              title={`${TONES[k].label}: ${counts[k]}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-3.5 grid flex-1 grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        {(Object.keys(TONES) as ToneKey[]).map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-2 rounded-sm ${TONES[k].bar}`} />
            <span className="text-xs text-zinc-600">{TONES[k].label}</span>
            <span className="ml-auto text-xs font-medium tabular-nums text-zinc-900">
              {counts[k]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-3 text-xs tabular-nums text-zinc-600">
        {inWindow} in the 0–14 day check-in window · {active} active or
        extended
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default async function Dashboard() {
  const contractors = await db.contractor.findMany({
    include: { checkIns: true },
    orderBy: { endDate: "asc" },
  });

  const rows = contractors.map((c) => ({ c, days: daysUntil(c.endDate) }));

  const counts: Record<ToneKey, number> = {
    expired: 0,
    week: 0,
    month: 0,
    healthy: 0,
  };
  for (const r of rows) counts[toneOf(r.days)]++;

  const expiredNoResponse = contractors.filter(
    (c) => c.status === "EXPIRED_NO_RESPONSE",
  ).length;
  const assetsOutstanding = contractors.filter(
    (c) => c.status === "ENDED" && !c.assetReturned,
  ).length;
  const active = contractors.filter(
    (c) => c.status === "ACTIVE" || c.status === "EXTENDED",
  ).length;
  const inWindow = rows.filter((r) => r.days >= 0 && r.days <= 14).length;

  const items = contractors.map(toView);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader title="Dashboard">
        <form action={runDailyCheck}>
          <ActionButton className={buttonPrimary}>
            <RefreshCw size={14} aria-hidden />
            Run daily check
          </ActionButton>
        </form>
      </PageHeader>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <NeedsAttentionCard
          expiredNoResponse={expiredNoResponse}
          assetsOutstanding={assetsOutstanding}
        />
        <PopulationCard
          counts={counts}
          total={contractors.length}
          inWindow={inWindow}
          active={active}
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-zinc-900">
        Contractors
      </h2>
      <ContractorList items={items} />
    </main>
  );
}
