// The check-in engine. Pure DB logic, no Next.js runtime imports, so it can be
// unit-tested with tsx and reused by the Server Action in actions.ts.

import { db } from "@/lib/db";
import { daysUntil } from "@/lib/dates";

/** The three marks (days before end date) at which we nudge the manager. */
export const MARKS = [14, 7, 2] as const;

export type DailyCheckResult = { created: number; flipped: number };

/**
 * Run the daily check:
 *  1. For every ACTIVE contractor sitting exactly at a 14/7/2 mark that doesn't
 *     already have a check-in for that mark, create one (which is the manager
 *     email — nothing is actually sent).
 *  2. Any ACTIVE contractor whose end date has passed and still has an
 *     unanswered check-in flips to EXPIRED_NO_RESPONSE.
 */
export async function runCheckInEngine(): Promise<DailyCheckResult> {
  const active = await db.contractor.findMany({
    where: { status: "ACTIVE" },
    include: { checkIns: true },
  });

  let created = 0;
  let flipped = 0;

  for (const c of active) {
    const days = daysUntil(c.endDate);

    // 1. Due for a nudge at an exact mark, and not already nudged at it.
    if ((MARKS as readonly number[]).includes(days)) {
      const already = c.checkIns.some((ci) => ci.daysBeforeExpiry === days);
      if (!already) {
        await db.checkIn.create({
          data: { contractorId: c.id, daysBeforeExpiry: days },
        });
        created++;
      }
    }

    // 2. Past due with an unanswered nudge -> nobody responded in time.
    if (days < 0 && c.checkIns.some((ci) => !ci.response)) {
      await db.contractor.update({
        where: { id: c.id },
        data: { status: "EXPIRED_NO_RESPONSE" },
      });
      flipped++;
    }
  }

  return { created, flipped };
}
