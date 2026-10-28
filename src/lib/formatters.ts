import { format, parseISO } from "date-fns";

/**
 * Format a number or numeric string to INR with Indian grouping:
 * e.g. 1234567 -> "₹12,34,567"
 */
export function formatINR(
  amount: number | string | { toNumber?: () => number } | null | undefined,
  includeDecimals: boolean = false
): string {
  if (amount === null || amount === undefined) return "₹0";

  let num: number;
  if (typeof amount === "number") {
    num = amount;
  } else if (typeof amount === "object" && typeof amount.toNumber === "function") {
    num = amount.toNumber();
  } else {
    num = Number(amount);
  }

  if (isNaN(num)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  }).format(num);
}

/**
 * Format a Date or date string as "DD MMM YYYY"
 * e.g. "28 Oct 2026"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (isNaN(d.getTime())) return "-";
    return format(d, "dd MMM yyyy");
  } catch {
    return "-";
  }
}

/**
 * Format a Date or date string as "DD MMM YYYY, HH:mm" for timestamps
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (isNaN(d.getTime())) return "-";
    return format(d, "dd MMM yyyy, hh:mm a");
  } catch {
    return "-";
  }
}

/**
 * Value for an <input type="date"> (YYYY-MM-DD) in local time.
 */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

/**
 * True when an open item's due date is before the start of today (local time).
 */
export function isOverdue(dueDate: Date | string, status: string = "OPEN"): boolean {
  if (status !== "OPEN") return false;
  const d = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday.getTime();
}

/**
 * Compact INR for tight spaces, e.g. ₹12.4L, ₹1.2Cr (Indian units).
 */
export function formatINRCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `₹${(amount / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `₹${(amount / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  return formatINR(amount);
}
