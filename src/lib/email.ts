// Builds the manager email body for a check-in. Nothing is sent — this is
// rendered to screen on /emails only.

import type { CheckIn, Contractor } from "@prisma/client";
import { formatDate } from "@/lib/display";

export type ManagerEmail = {
  fromAddress: string;
  toName: string;
  toAddress: string;
  subject: string;
  contractorName: string;
  endDate: string;
  daysBefore: number;
  question: string;
  extendUrl: string;
  endUrl: string;
  sentAt: Date;
  response: string | null;
  respondedAt: Date | null;
};

export function buildManagerEmail(
  contractor: Contractor,
  checkIn: CheckIn,
): ManagerEmail {
  const name = `${contractor.firstName} ${contractor.lastName}`;
  const endDate = formatDate(contractor.endDate);
  return {
    fromAddress: "watchtower@lapse.internal",
    toName: contractor.managerName,
    toAddress: contractor.managerEmail,
    subject: `Action needed: ${name}'s access ends ${endDate}`,
    contractorName: name,
    endDate,
    daysBefore: checkIn.daysBeforeExpiry,
    question: `Is ${name} continuing to work past ${endDate}?`,
    extendUrl: `/respond/${checkIn.token}?intent=extending`,
    endUrl: `/respond/${checkIn.token}?intent=ending`,
    sentAt: checkIn.sentAt,
    response: checkIn.response,
    respondedAt: checkIn.respondedAt,
  };
}
