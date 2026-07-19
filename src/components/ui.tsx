// Shared presentational primitives for the app pages (server-safe — no
// client hooks). Color rules: indigo = brand/action, red = the single most
// severe fact in a block, amber = warning, greyscale for everything else.
// All text colors chosen for WCAG AA (>= 4.5:1) on white / #fafafa.

import type { LucideIcon } from "lucide-react";

/**
 * The one surface treatment every card in the app shares: radius, hairline
 * border, white fill, and a whisper of elevation.
 */
export const card =
  "rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_0_rgba(24,24,27,0.04)]";

/** Page title bar: title + one-line description, actions on the right. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Headline metric. `alarm` tiles turn their number red only when non-zero —
 * a zero alarm is a healthy fact and reads grey like everything else.
 */
export function StatCard({
  value,
  label,
  sublabel,
  alarm = false,
  icon: Icon,
}: {
  value: number;
  label: string;
  sublabel?: string;
  alarm?: boolean;
  icon?: LucideIcon;
}) {
  const hot = alarm && value > 0;
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600">{label}</span>
        {Icon ? (
          <Icon
            size={15}
            className={hot ? "text-red-700" : "text-zinc-400"}
            aria-hidden
          />
        ) : null}
      </div>
      <div
        className={`mt-2 text-2xl font-semibold leading-none tracking-tight ${
          hot ? "text-red-700" : "text-zinc-900"
        }`}
      >
        {value}
      </div>
      {sublabel ? (
        <div className="mt-1.5 text-[11px] leading-4 text-zinc-600">
          {sublabel}
        </div>
      ) : null}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-zinc-100 text-zinc-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-800",
  indigo: "bg-indigo-50 text-indigo-700",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

/** Small status chip. Keep red/amber strictly for severity. */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Centered empty state for lists that have nothing to show. */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`${card} px-6 py-14 text-center`}>
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-zinc-50 ring-1 ring-zinc-200">
        <Icon size={20} className="text-zinc-500" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-zinc-900">{title}</p>
      {children ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-zinc-600">
          {children}
        </p>
      ) : null}
    </div>
  );
}

/** A check-in as the UI renders it — pre-formatted on the server. */
export type AuditEntryView = {
  id: string;
  mark: string; // "T−14" | "T+9"
  sentAtLabel: string;
  response: string | null; // EXTENDING | ENDING | null
  respondedAtLabel: string | null;
};

/**
 * The evidence timeline: every nudge, its date, and whether it was answered.
 * Greyscale and monospaced on purpose — it reads like a log, leaving red for
 * the consequence line of whichever block contains it. Hook-free, so it works
 * in both server and client components.
 */
export function AuditTrail({ entries }: { entries: AuditEntryView[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-zinc-600">No check-ins sent yet.</p>;
  }
  return (
    <ol className="relative ml-[3px] space-y-2.5 border-l border-zinc-200 pl-4">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span
            aria-hidden
            className={`absolute -left-[20.5px] top-1 size-[9px] rounded-full border-2 ${
              e.response
                ? "border-zinc-500 bg-zinc-500"
                : "border-zinc-400 bg-white"
            }`}
          />
          <span className="font-mono text-xs leading-5 text-zinc-600">
            <span className="text-zinc-800">{e.mark}</span> · asked{" "}
            {e.sentAtLabel} ·{" "}
            {e.response ? (
              <span className="text-zinc-800">
                answered: {e.response.toLowerCase()}
                {e.respondedAtLabel ? ` (${e.respondedAtLabel})` : ""}
              </span>
            ) : (
              "no response"
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Micro-viz: one dot per check-in — filled if answered, hollow if not. */
export function CheckInDots({ entries }: { entries: AuditEntryView[] }) {
  if (entries.length === 0) {
    return <span className="text-xs text-zinc-600">—</span>;
  }
  const answered = entries.filter((e) => e.response).length;
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`${answered} of ${entries.length} answered`}
    >
      {entries.slice(0, 5).map((e) => (
        <span
          key={e.id}
          aria-hidden
          className={`size-1.5 rounded-full ${
            e.response ? "bg-zinc-500" : "border border-zinc-400 bg-white"
          }`}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums text-zinc-600">
        {answered}/{entries.length}
      </span>
    </span>
  );
}

/** Shared button styles (used by forms and link-buttons). */
export const buttonPrimary =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-indigo-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:active:scale-100";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm transition-[background-color,transform,border-color] duration-150 hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:active:scale-100";

/** Compact variant for row-level actions. */
export const buttonSmall =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition-[background-color,transform,border-color] duration-150 hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:active:scale-100";
