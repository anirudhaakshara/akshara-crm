import { describe, expect, it } from "vitest";
import {
  addMonths,
  expectedRevenueForMonth,
  linearRegression,
  monthOf,
  monthStart,
  projectTrend,
} from "@/lib/ml/forecast";

describe("IST month helpers", () => {
  it("assigns late-evening UTC times to the next IST day/month", () => {
    // 31 Oct 2026 20:00 UTC is 1 Nov 2026 01:30 IST.
    expect(monthOf(new Date("2026-10-31T20:00:00Z"))).toEqual({ year: 2026, month: 10 });
    expect(monthOf(new Date("2026-10-31T18:00:00Z"))).toEqual({ year: 2026, month: 9 });
  });

  it("computes the UTC instant an IST month begins", () => {
    expect(monthStart({ year: 2026, month: 10 }).toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("adds months across year boundaries", () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe("expectedRevenueForMonth", () => {
  const nov = { year: 2026, month: 10 };
  const deals = [
    { value: 1_000_000, winProbability: 0.5, expectedCloseDate: new Date("2026-11-10T06:00:00Z") },
    { value: 400_000, winProbability: 0.25, expectedCloseDate: new Date("2026-11-30T06:00:00Z") },
    { value: 900_000, winProbability: null, expectedCloseDate: new Date("2026-11-15T06:00:00Z") },
    { value: 5_000_000, winProbability: 0.9, expectedCloseDate: new Date("2026-12-01T06:00:00Z") },
  ];

  it("sums value × probability for deals closing in the month", () => {
    const r = expectedRevenueForMonth(deals, nov);
    expect(r.expected).toBeCloseTo(600_000);
    expect(r.pipeline).toBe(2_300_000);
    expect(r.scored).toBe(2);
    expect(r.unscored).toBe(1);
  });

  it("is zero for a month with no deals", () => {
    expect(expectedRevenueForMonth(deals, { year: 2027, month: 5 }).expected).toBe(0);
  });
});

describe("linear trend", () => {
  it("recovers an exact line", () => {
    const fit = linearRegression([10, 12, 14, 16]);
    expect(fit.slope).toBeCloseTo(2);
    expect(fit.intercept).toBeCloseTo(10);
  });

  it("projects forward and floors at zero", () => {
    const up = projectTrend([100, 200, 300], 3);
    expect(up.projected).toEqual([400, 500, 600]);
    expect(up.fitted.map((v) => Math.round(v))).toEqual([100, 200, 300]);
    const down = projectTrend([300, 200, 100], 3);
    expect(down.projected).toEqual([0, 0, 0]);
  });

  it("handles short histories", () => {
    expect(linearRegression([])).toEqual({ slope: 0, intercept: 0 });
    expect(projectTrend([50], 2).projected).toEqual([50, 50]);
  });
});

import { startOfTodayIST } from "@/lib/dates";

describe("startOfTodayIST", () => {
  it("rolls to the IST date, not the UTC date", () => {
    // 20:00 UTC on 28 Oct = 01:30 IST on 29 Oct -> day starts 28 Oct 18:30 UTC
    expect(startOfTodayIST(new Date("2026-10-28T20:00:00Z")).toISOString()).toBe("2026-10-28T18:30:00.000Z");
    expect(startOfTodayIST(new Date("2026-10-28T10:00:00Z")).toISOString()).toBe("2026-10-27T18:30:00.000Z");
  });
});
