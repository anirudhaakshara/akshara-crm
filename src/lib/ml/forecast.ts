/**
 * Revenue forecast maths (pure functions).
 *
 * Months are calendar months in India Standard Time (UTC+05:30, no DST), so "this month" matches
 * what the sales team sees regardless of the server's time zone.
 */

import { IST_OFFSET_MS } from "@/lib/dates";

export { IST_OFFSET_MS };

export interface MonthKey {
  year: number;
  /** 0-11 */
  month: number;
}

export function monthOf(date: Date): MonthKey {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return { year: ist.getUTCFullYear(), month: ist.getUTCMonth() };
}

export function addMonths(m: MonthKey, delta: number): MonthKey {
  const idx = m.year * 12 + m.month + delta;
  return { year: Math.floor(idx / 12), month: ((idx % 12) + 12) % 12 };
}

/** UTC instant at which the IST calendar month starts. */
export function monthStart(m: MonthKey): Date {
  return new Date(Date.UTC(m.year, m.month, 1) - IST_OFFSET_MS);
}

export function monthLabel(m: MonthKey): string {
  return new Date(Date.UTC(m.year, m.month, 1)).toLocaleString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function monthKeyString(m: MonthKey): string {
  return `${m.year}-${String(m.month + 1).padStart(2, "0")}`;
}

export interface OpenDealForecastInput {
  value: number;
  winProbability: number | null;
  expectedCloseDate: Date;
}

/**
 * Expected revenue for a month = Σ(value × winProbability) of open deals expected to close in it.
 * Deals without a score contribute nothing (and are counted so the UI can say so).
 */
export function expectedRevenueForMonth(deals: readonly OpenDealForecastInput[], month: MonthKey) {
  const start = monthStart(month).getTime();
  const end = monthStart(addMonths(month, 1)).getTime();
  let expected = 0;
  let pipeline = 0;
  let scored = 0;
  let unscored = 0;
  for (const d of deals) {
    const t = d.expectedCloseDate.getTime();
    if (t < start || t >= end) continue;
    pipeline += d.value;
    if (d.winProbability === null) {
      unscored++;
      continue;
    }
    scored++;
    expected += d.value * d.winProbability;
  }
  return { expected, pipeline, scored, unscored };
}

export interface LinearFit {
  slope: number;
  intercept: number;
}

/** Ordinary least squares of y against x = 0..n-1. */
export function linearRegression(values: readonly number[]): LinearFit {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX };
}

export function predictLinear(fit: LinearFit, x: number): number {
  return fit.intercept + fit.slope * x;
}

/**
 * Fits a trend to the historical monthly values and projects `ahead` further months.
 * Revenue can't be negative, so projections are floored at 0.
 */
export function projectTrend(history: readonly number[], ahead: number = 3) {
  const fit = linearRegression(history);
  const fitted = history.map((_, x) => Math.max(0, predictLinear(fit, x)));
  const projected = Array.from({ length: ahead }, (_, k) => Math.max(0, predictLinear(fit, history.length + k)));
  return { fit, fitted, projected };
}
