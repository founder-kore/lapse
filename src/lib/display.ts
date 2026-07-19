// Presentational helpers. No date *math* here (that lives in dates.ts).

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

/** Chip label for a check-in's notice type. Negative/zero = sent past the end date. */
export function noticeLabel(daysBefore: number): string {
  return daysBefore > 0 ? `${daysBefore}-day notice` : "Follow-up";
}

/** Compact timeline mark: T−14 before expiry, T+9 after. */
export function tMark(daysBefore: number): string {
  return daysBefore >= 0 ? `T−${daysBefore}` : `T+${-daysBefore}`;
}

/** Human status label for a contractor status value. */
export function statusLabel(status: string): string {
  switch (status) {
    case "EXPIRED_NO_RESPONSE":
      return "No response";
    case "EXTENDED":
      return "Extended";
    case "ENDED":
      return "Ended";
    default:
      return "Active";
  }
}
