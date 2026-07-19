import Link from "next/link";
import {
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Hourglass,
  ListChecks,
} from "lucide-react";
import type { Contractor } from "@prisma/client";
import { ActionButton } from "@/components/action-button";
import { db } from "@/lib/db";
import { daysFromNow, daysUntil } from "@/lib/dates";
import { formatDate } from "@/lib/display";
import { submitEnding, submitExtension } from "@/lib/actions";

export const dynamic = "force-dynamic";

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Standalone shell for the manager-facing page — no app sidebar. This is
 * what an external manager sees from an email link: one centered card.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-5 flex items-center justify-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-indigo-600 shadow-sm">
          <Hourglass size={13} className="text-white" aria-hidden />
        </span>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          Lapse
        </span>
      </div>
      <div className="animate-rise rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_0_rgba(24,24,27,0.04)] sm:p-7">
        {children}
      </div>
      <p className="mt-5 text-center text-xs text-zinc-600">
        Contractor access review · your answer is recorded with a timestamp
      </p>
    </main>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
      {children}
    </p>
  );
}

const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-indigo-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:active:scale-100";
const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition-[background-color,transform,border-color] duration-150 hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

function OffboardingChecklist({ contractor }: { contractor: Contractor }) {
  const items = [
    "Revoke system & directory access",
    "Disable email and MFA enrollment",
    "Collect building badge / physical access",
  ];
  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
        <ListChecks size={15} className="text-zinc-600" aria-hidden />
        Offboarding checklist
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-zinc-700">
        <li className="flex gap-2">
          <span aria-hidden className="select-none text-zinc-400">
            •
          </span>
          {contractor.assetType ? (
            <span>
              Recover asset: {contractor.assetType} (
              <span className="font-mono text-[13px] text-zinc-600">
                {contractor.assetSerial}
              </span>
              ) —{" "}
              {contractor.assetReturned ? (
                <span className="text-zinc-600">already returned</span>
              ) : (
                <span className="font-semibold text-red-700">
                  not yet returned
                </span>
              )}
            </span>
          ) : (
            <span>No company asset on record</span>
          )}
        </li>
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span aria-hidden className="select-none text-zinc-400">
              •
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function RespondPage(props: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ intent?: string; error?: string }>;
}) {
  const { token } = await props.params;
  const { intent, error } = await props.searchParams;

  const checkIn = await db.checkIn.findUnique({
    where: { token },
    include: { contractor: true },
  });

  // --- Invalid token -----------------------------------------------------
  if (!checkIn) {
    return (
      <Shell>
        <Eyebrow>Link not recognized</Eyebrow>
        <h1 className="text-base font-semibold text-zinc-900">
          This link isn&apos;t valid
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          The response link may have expired, already been used, or been
          mistyped. No action has been taken. Please use the most recent email
          you received.
        </p>
      </Shell>
    );
  }

  const c = checkIn.contractor;
  const name = `${c.firstName} ${c.lastName}`;

  // --- Already answered --------------------------------------------------
  if (checkIn.response) {
    const extending = checkIn.response === "EXTENDING";
    return (
      <Shell>
        <Eyebrow>Already recorded</Eyebrow>
        <h1 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <CircleCheck size={17} className="text-indigo-600" aria-hidden />
          This was already answered
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          {extending ? (
            <>
              {name} is continuing — extended to{" "}
              {checkIn.newEndDate
                ? formatDate(checkIn.newEndDate)
                : "a new date"}
              .
            </>
          ) : (
            <>{name} is ending on {formatDate(c.endDate)}.</>
          )}
          {checkIn.respondedAt
            ? ` Recorded ${formatDate(checkIn.respondedAt)}.`
            : ""}
        </p>
        {!extending ? <OffboardingChecklist contractor={c} /> : null}
      </Shell>
    );
  }

  // --- Confirm ending ----------------------------------------------------
  if (intent === "ending") {
    return (
      <Shell>
        <Eyebrow>{c.managerName} · access review</Eyebrow>
        <h1 className="text-base font-semibold text-zinc-900">
          Confirm {name} is ending
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          This records that {name}&apos;s engagement ends on{" "}
          {formatDate(c.endDate)} and starts offboarding. Their access should
          be removed on that date.
        </p>
        <form action={submitEnding} className="mt-6 flex flex-wrap gap-2.5">
          <input type="hidden" name="token" value={token} />
          <ActionButton className={btnPrimary}>
            Confirm — {name} is ending
          </ActionButton>
          <Link href={`/respond/${token}`} className={btnSecondary}>
            Back
          </Link>
        </form>
      </Shell>
    );
  }

  // --- Extend: ask for a new end date ------------------------------------
  if (intent === "extending") {
    const defaultDate = toInputDate(
      daysUntil(c.endDate) > 0 ? c.endDate : daysFromNow(90),
    );
    const minDate = toInputDate(daysFromNow(1));
    return (
      <Shell>
        <Eyebrow>{c.managerName} · access review</Eyebrow>
        <h1 className="text-base font-semibold text-zinc-900">
          Extend {name}&apos;s access
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          {name} is currently set to end on {formatDate(c.endDate)}. Choose the
          new end date.
        </p>
        <form action={submitExtension} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <label
            htmlFor="newEndDate"
            className="block text-sm font-medium text-zinc-800"
          >
            New end date
          </label>
          <input
            id="newEndDate"
            type="date"
            name="newEndDate"
            defaultValue={defaultDate}
            min={minDate}
            required
            className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {error === "date" ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-red-700">
              <CircleAlert size={14} aria-hidden />
              Please choose a date in the future.
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <ActionButton className={btnPrimary}>
              Save new end date
            </ActionButton>
            <Link href={`/respond/${token}`} className={btnSecondary}>
              Back
            </Link>
          </div>
        </form>
      </Shell>
    );
  }

  // --- No intent: ask the one question -----------------------------------
  return (
    <Shell>
      <Eyebrow>{c.managerName} · access review</Eyebrow>
      <h1 className="text-lg font-semibold leading-7 tracking-tight text-zinc-900">
        Is {name} continuing past {formatDate(c.endDate)}?
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-700">
        {name}&apos;s contractor access is scheduled to end on{" "}
        {formatDate(c.endDate)}. One click records your answer with a
        timestamp — no login needed.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Link
          href={`/respond/${token}?intent=extending`}
          className={btnPrimary}
        >
          <CalendarClock size={15} aria-hidden />
          Yes, extending
        </Link>
        <Link href={`/respond/${token}?intent=ending`} className={btnSecondary}>
          No, ending
        </Link>
      </div>
    </Shell>
  );
}
