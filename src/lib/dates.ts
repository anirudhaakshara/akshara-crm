/**
 * Business-day helpers in India Standard Time (UTC+05:30, no DST), so "today", "overdue" and
 * "this month" mean the same thing on the server (UTC on Vercel) as they do for the sales team.
 */
export const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC instant at which the current IST calendar day began. */
export function startOfTodayIST(now: Date = new Date()): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
}

export function startOfTomorrowIST(now: Date = new Date()): Date {
  return new Date(startOfTodayIST(now).getTime() + DAY_MS);
}
