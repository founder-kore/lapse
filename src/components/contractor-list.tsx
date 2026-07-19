"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  PackageCheck,
  Search,
  Send,
} from "lucide-react";
import { markAssetReturned, resendNudge } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import {
  AuditTrail,
  Badge,
  CheckInDots,
  buttonSmall,
  card,
  type AuditEntryView,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// View model — fully serialized on the server (dates pre-formatted, day math
// done via lib/dates there). The client only filters, sorts, and renders.
// ---------------------------------------------------------------------------

export type ContractorRowView = {
  id: string;
  name: string;
  managerName: string;
  managerEmail: string;
  assetType: string | null;
  assetSerial: string | null;
  assetReturned: boolean;
  status: string; // ACTIVE | EXTENDED | ENDED | EXPIRED_NO_RESPONSE
  statusLabel: string;
  endDateLabel: string;
  days: number; // days until end date; negative = overdue
  checkIns: AuditEntryView[]; // oldest first
  openToken: string | null; // latest unanswered check-in token, if any
};

type Urgency = "all" | "expired" | "week" | "month" | "healthy";
type Sort = "urgent" | "name" | "manager";

function urgencyOf(days: number): Exclude<Urgency, "all"> {
  if (days < 0) return "expired";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "healthy";
}

function daysTone(days: number): string {
  if (days < 0) return "text-red-700";
  if (days <= 7) return "text-amber-700";
  return "text-zinc-600";
}

// Mobile: chevron · days · name block · status. md+: the full seven columns.
const COLS_MD =
  "md:grid-cols-[1rem_3rem_minmax(0,1fr)_minmax(0,9.5rem)_6.25rem_6rem_5rem]";
const GRID = `grid grid-cols-[1.125rem_2.75rem_minmax(0,1fr)_auto] ${COLS_MD} items-center gap-x-3 px-3 sm:px-4`;

const URGENCY_CHIPS: { id: Urgency; label: string }[] = [
  { id: "all", label: "All" },
  { id: "expired", label: "Overdue" },
  { id: "week", label: "≤ 7 days" },
  { id: "month", label: "8–30 days" },
  { id: "healthy", label: "> 30 days" },
];

const GROUPS: { id: Exclude<Urgency, "all">; label: string }[] = [
  { id: "expired", label: "Expired — action required" },
  { id: "week", label: "Expiring this week" },
  { id: "month", label: "Expiring this month" },
  { id: "healthy", label: "Healthy — beyond 30 days" },
];

// ---------------------------------------------------------------------------

function ColumnHeader() {
  return (
    <div
      className={`hidden border-b border-zinc-200 py-2 md:grid ${COLS_MD} items-center gap-x-3 px-3 sm:px-4`}
    >
      <span />
      {["Days", "Contractor", "Asset", "End date", "Status", "Check-ins"].map(
        (h, i) => (
          <span
            key={h}
            className={`text-[11px] font-medium uppercase tracking-wider text-zinc-600 ${
              i === 0 ? "text-right" : ""
            } ${i === 5 ? "text-right" : ""}`}
          >
            {h}
          </span>
        ),
      )}
    </div>
  );
}

function ExpandedPanel({ c }: { c: ContractorRowView }) {
  const assetState = c.assetReturned
    ? { label: "Returned", cls: "text-zinc-600" }
    : c.status === "ENDED" || c.status === "EXPIRED_NO_RESPONSE"
      ? { label: "Not returned", cls: "font-semibold text-red-700" }
      : { label: "In use", cls: "text-zinc-600" };

  return (
    <div className="animate-rise border-t border-zinc-100 bg-zinc-50/60 px-4 py-4 sm:px-5 md:pl-[4.75rem]">
      <div className="grid gap-5 md:gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
            Manager
          </p>
          <p className="mt-1.5 text-sm font-medium text-zinc-900">
            {c.managerName}
          </p>
          <p className="mt-0.5 break-all font-mono text-xs text-zinc-600">
            {c.managerEmail}
          </p>
          {c.openToken ? (
            <a
              href={`/respond/${c.openToken}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900"
            >
              <ExternalLink size={12} aria-hidden />
              Open manager view
            </a>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
            Asset
          </p>
          {c.assetType ? (
            <>
              <p className="mt-1.5 text-sm font-medium text-zinc-900">
                {c.assetType}
              </p>
              <p className="mt-0.5 font-mono text-xs text-zinc-600">
                {c.assetSerial}
              </p>
              <p className={`mt-2 text-xs ${assetState.cls}`}>
                {assetState.label}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-zinc-600">
              No company asset on record
            </p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
            Audit trail
          </p>
          <div className="mt-2.5">
            <AuditTrail entries={c.checkIns} />
          </div>
        </div>
      </div>

      {(c.status !== "ENDED" || (c.assetType && !c.assetReturned)) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200/70 pt-3.5">
          {c.status !== "ENDED" ? (
            <ActionForm
              action={resendNudge}
              fields={{ contractorId: c.id }}
              success={`Nudge sent — a fresh email for ${c.managerName} is in the outbox.`}
              buttonClassName={buttonSmall}
            >
              <Send size={12} aria-hidden />
              Send new nudge
            </ActionForm>
          ) : null}
          {c.assetType && !c.assetReturned ? (
            <ActionForm
              action={markAssetReturned}
              fields={{ contractorId: c.id }}
              success={`${c.assetType} marked as returned for ${c.name}.`}
              buttonClassName={buttonSmall}
            >
              <PackageCheck size={12} aria-hidden />
              Mark asset returned
            </ActionForm>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Row({
  c,
  open,
  onToggle,
}: {
  c: ContractorRowView;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`${GRID} w-full py-2.5 text-left transition-colors hover:bg-zinc-50`}
      >
        <ChevronRight
          size={14}
          className={`text-zinc-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span
          className={`text-right text-sm font-semibold tabular-nums ${daysTone(c.days)}`}
        >
          {c.days}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-zinc-900">
            {c.name}
          </span>
          {/* Mobile: fold manager + end date into the meta line. */}
          <span className="block truncate text-xs text-zinc-600 md:hidden">
            {c.managerName} · ends {c.endDateLabel}
          </span>
          <span className="hidden truncate text-xs text-zinc-600 md:block">
            {c.managerName}
          </span>
        </span>
        <span className="hidden min-w-0 md:block">
          {c.assetType ? (
            <>
              <span className="block truncate text-xs text-zinc-700">
                {c.assetType}
              </span>
              <span className="block truncate font-mono text-[11px] leading-4 text-zinc-600">
                {c.assetSerial}
              </span>
            </>
          ) : (
            <span className="text-xs text-zinc-600">—</span>
          )}
        </span>
        <span className="hidden text-xs tabular-nums text-zinc-600 md:block">
          {c.endDateLabel}
        </span>
        <span className="text-right md:text-left">
          <Badge>{c.statusLabel}</Badge>
        </span>
        <span className="hidden text-right md:block">
          <CheckInDots entries={c.checkIns} />
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">{open ? <ExpandedPanel c={c} /> : null}</div>
      </div>
    </div>
  );
}

function GroupStrip({
  label,
  count,
  toggle,
}: {
  label: string;
  count: number;
  toggle?: { open: boolean; onClick: () => void };
}) {
  const inner = (
    <>
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">
        {label}
      </span>
      <span className="text-xs tabular-nums text-zinc-600">{count}</span>
    </>
  );
  if (toggle) {
    return (
      <button
        type="button"
        onClick={toggle.onClick}
        aria-expanded={toggle.open}
        className="flex w-full items-center gap-2 bg-zinc-50 px-3 py-2 text-left transition-colors hover:bg-zinc-100 sm:px-4"
      >
        <ChevronRight
          size={14}
          className={`text-zinc-500 transition-transform duration-200 ${toggle.open ? "rotate-90" : ""}`}
          aria-hidden
        />
        {inner}
        <span className="ml-auto text-xs text-zinc-600">
          {toggle.open ? "Hide" : "Show"}
        </span>
      </button>
    );
  }
  return (
    <div className="flex items-baseline gap-2 bg-zinc-50 px-3 py-2 sm:px-4">
      {inner}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ContractorList({ items }: { items: ContractorRowView[] }) {
  const [query, setQuery] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<Sort>("urgent");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [healthyOpen, setHealthyOpen] = useState(false);

  const urgencyCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const c of items) {
      const u = urgencyOf(c.days);
      counts[u] = (counts[u] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = items.filter((c) => {
      if (q && !`${c.name} ${c.managerName}`.toLowerCase().includes(q))
        return false;
      if (urgency !== "all" && urgencyOf(c.days) !== urgency) return false;
      if (status !== "all" && c.status !== status) return false;
      return true;
    });
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "manager")
      out.sort((a, b) => a.managerName.localeCompare(b.managerName));
    else out.sort((a, b) => a.days - b.days);
    return out;
  }, [items, query, urgency, status, sort]);

  // Grouped view only in the default state; any search/filter/sort flattens.
  const grouped =
    query.trim() === "" &&
    urgency === "all" &&
    status === "all" &&
    sort === "urgent";

  const toggle = (id: string) =>
    setExpandedId((cur) => (cur === id ? null : id));

  const inputCls =
    "rounded-md border border-zinc-300 bg-white text-sm text-zinc-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contractor or manager…"
            aria-label="Search contractors"
            className={`${inputCls} w-full py-1.5 pl-8 pr-3 placeholder:text-zinc-500`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className={`${inputCls} flex-1 px-2.5 py-1.5 sm:flex-none`}
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXTENDED">Extended</option>
          <option value="ENDED">Ended</option>
          <option value="EXPIRED_NO_RESPONSE">No response</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort"
          className={`${inputCls} flex-1 px-2.5 py-1.5 sm:flex-none`}
        >
          <option value="urgent">Most urgent first</option>
          <option value="name">Contractor A–Z</option>
          <option value="manager">Manager A–Z</option>
        </select>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {URGENCY_CHIPS.map((chip) => {
          const selected = urgency === chip.id;
          const count = urgencyCounts[chip.id] ?? 0;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setUrgency(chip.id)}
              aria-pressed={selected}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                selected
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {chip.label}
              <span className="tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <div className={`mt-3 overflow-hidden ${card}`}>
        <ColumnHeader />
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-600">
            No contractors match — try clearing the search or filters.
          </p>
        ) : grouped ? (
          <div className="divide-y divide-zinc-200">
            {GROUPS.map((g) => {
              const rows = filtered.filter((c) => urgencyOf(c.days) === g.id);
              if (rows.length === 0) return null;
              const collapsed = g.id === "healthy" && !healthyOpen;
              return (
                <div key={g.id}>
                  <GroupStrip
                    label={g.label}
                    count={rows.length}
                    toggle={
                      g.id === "healthy"
                        ? {
                            open: healthyOpen,
                            onClick: () => setHealthyOpen((o) => !o),
                          }
                        : undefined
                    }
                  />
                  {!collapsed && (
                    <div className="divide-y divide-zinc-100">
                      {rows.map((c) => (
                        <Row
                          key={c.id}
                          c={c}
                          open={expandedId === c.id}
                          onToggle={() => toggle(c.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filtered.map((c) => (
              <Row
                key={c.id}
                c={c}
                open={expandedId === c.id}
                onToggle={() => toggle(c.id)}
              />
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs tabular-nums text-zinc-600">
        Showing {filtered.length} of {items.length} contractors
      </p>
    </section>
  );
}
