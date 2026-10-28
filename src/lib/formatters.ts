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
