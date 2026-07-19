"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runCheckInEngine } from "@/lib/engine";
import { recordEnding, recordExtension } from "@/lib/respond";
import { db } from "@/lib/db";
import { daysFromNow, daysUntil } from "@/lib/dates";

/** "Run daily check" button on the dashboard. */
export async function runDailyCheck() {
  const { created, flipped } = await runCheckInEngine();

  revalidatePath("/");
  revalidatePath("/emails");
  // redirect throws a control-flow signal — must be outside any try/catch.
  redirect(`/emails?created=${created}&flipped=${flipped}`);
}

function revalidateViews() {
  revalidatePath("/");
  revalidatePath("/emails");
  revalidatePath("/exceptions");
}

/** Manager clicked "Yes, extending" and picked a new end date. */
export async function submitExtension(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const dateStr = String(formData.get("newEndDate") ?? "");

  const result = await recordExtension(token, dateStr);
  if (result.status === "baddate") {
    redirect(`/respond/${token}?intent=extending&error=date`);
  }

  revalidateViews();
  // notfound / answered / ok all resolve on the respond page itself.
  redirect(`/respond/${token}`);
}

/**
 * "Mark asset returned" row action. Idempotent — setting the flag twice is a
 * no-op, and a missing id updates zero rows rather than throwing.
 */
export async function markAssetReturned(formData: FormData) {
  const contractorId = String(formData.get("contractorId") ?? "");
  if (!contractorId) return;

  await db.contractor.updateMany({
    where: { id: contractorId },
    data: { assetReturned: true },
  });

  revalidateViews();
}

/**
 * "Send new nudge" row action: creates a fresh CheckIn (new token), which
 * surfaces a fresh manager email in the outbox. Guarded so repeated clicks
 * on the same day don't pile up duplicate unanswered check-ins.
 */
export async function resendNudge(formData: FormData) {
  const contractorId = String(formData.get("contractorId") ?? "");
  if (!contractorId) return;

  const contractor = await db.contractor.findUnique({
    where: { id: contractorId },
  });
  if (!contractor) return;

  const alreadySentToday = await db.checkIn.findFirst({
    where: {
      contractorId,
      response: null,
      sentAt: { gte: daysFromNow(0) },
    },
  });

  if (!alreadySentToday) {
    await db.checkIn.create({
      data: {
        contractorId,
        // Days-before-expiry at send time; negative means the nudge went out
        // after the end date (rendered as a follow-up, not an N-day notice).
        daysBeforeExpiry: daysUntil(contractor.endDate),
      },
    });
  }

  revalidateViews();
}

/** Manager clicked "No, ending" and confirmed. */
export async function submitEnding(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  await recordEnding(token);

  revalidateViews();
  redirect(`/respond/${token}`);
}
