// Records a manager's response to a check-in. Pure DB logic (no Next.js runtime
// imports) so it's testable and reused by the Server Actions in actions.ts.
// Authorized by the check-in token alone. Idempotent — a second answer is a no-op.

import { db } from "@/lib/db";
import { daysUntil } from "@/lib/dates";

export type RespondResult = {
  status: "ok" | "notfound" | "answered" | "baddate";
};

/** Parse a YYYY-MM-DD string as a local date, or null if malformed. */
function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || !parts.every((n) => Number.isFinite(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** "Yes, extending" — move the end date out and mark the contractor EXTENDED. */
export async function recordExtension(
  token: string,
  dateStr: string,
): Promise<RespondResult> {
  const checkIn = await db.checkIn.findUnique({ where: { token } });
  if (!checkIn) return { status: "notfound" };
  if (checkIn.response) return { status: "answered" };

  const newEnd = parseLocalDate(dateStr);
  if (!newEnd || daysUntil(newEnd) <= 0) return { status: "baddate" };

  await db.$transaction([
    db.checkIn.update({
      where: { token },
      data: { response: "EXTENDING", respondedAt: new Date(), newEndDate: newEnd },
    }),
    db.contractor.update({
      where: { id: checkIn.contractorId },
      data: { endDate: newEnd, status: "EXTENDED" },
    }),
  ]);
  return { status: "ok" };
}

/** "No, ending" — confirm the end date and mark the contractor ENDED. */
export async function recordEnding(token: string): Promise<RespondResult> {
  const checkIn = await db.checkIn.findUnique({ where: { token } });
  if (!checkIn) return { status: "notfound" };
  if (checkIn.response) return { status: "answered" };

  await db.$transaction([
    db.checkIn.update({
      where: { token },
      data: { response: "ENDING", respondedAt: new Date() },
    }),
    db.contractor.update({
      where: { id: checkIn.contractorId },
      data: { status: "ENDED" },
    }),
  ]);
  return { status: "ok" };
}
