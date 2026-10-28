import { describe, expect, it } from "vitest";
import {
  bucketIndustry,
  extractFeatures,
  featureColumns,
  selectTopIndustries,
  snapshotFeatures,
  type DealFeatureInput,
} from "@/lib/ml/features";
import { explainScore, formatImpact, topFactors } from "@/lib/ml/explain";

const DAY = 24 * 60 * 60 * 1000;
const asOf = new Date("2026-10-28T12:00:00Z");
const daysAgo = (n: number) => new Date(asOf.getTime() - n * DAY);
const spec = { industries: ["FinTech", "IT Services"] };

const deal: DealFeatureInput = {
  value: 1_000_000,
  stage: "PROPOSAL",
  source: "REFERRAL",
  industry: "FinTech",
  createdAt: daysAgo(40),
  activities: [
    { type: "MEETING", occurredAt: daysAgo(2) },
    { type: "MEETING", occurredAt: daysAgo(10) },
    { type: "CALL", occurredAt: daysAgo(20) },
    { type: "EMAIL", occurredAt: daysAgo(30) },
    // Logged after the reference date: must be ignored (no peeking into the future).
    { type: "MEETING", occurredAt: new Date(asOf.getTime() + DAY) },
  ],
};

describe("snapshotFeatures", () => {
  const s = snapshotFeatures(deal, asOf, spec);

  it("counts activities as of the reference date", () => {
    expect(s.totalActivities).toBe(4);
    expect(s.activitiesLast14Days).toBe(2);
    expect(s.meetingCount).toBe(2);
    expect(s.daysSinceLastActivity).toBeCloseTo(2);
    expect(s.dealAgeDays).toBeCloseTo(40);
  });

  it("keeps the stage ordinal for open stages only", () => {
    expect(s.stageOrdinal).toBe(2);
    expect(snapshotFeatures({ ...deal, stage: "WON" }, asOf, spec).stageOrdinal).toBeNull();
  });

  it("handles a deal with no activity", () => {
    const empty = snapshotFeatures({ ...deal, activities: [] }, asOf, spec);
    expect(empty.daysSinceLastActivity).toBeNull();
    expect(empty.totalActivities).toBe(0);
  });

  it("measures a closed deal as of its close date", () => {
    const closed = snapshotFeatures(deal, daysAgo(15), spec);
    expect(closed.totalActivities).toBe(2);
    expect(closed.activitiesLast14Days).toBe(1);
    expect(closed.meetingCount).toBe(0);
  });
});

describe("vector layout", () => {
  it("matches featureColumns, with one-hot source and industry", () => {
    const cols = featureColumns(spec);
    const x = extractFeatures(deal, asOf, spec);
    expect(x.length).toBe(cols.length);
    expect(x[0]).toBeCloseTo(Math.log1p(1_000_000));
    expect(x[cols.findIndex((c) => c.name === "source_REFERRAL")]).toBe(1);
    expect(cols.filter((c) => c.group === "source").reduce((s, c) => s + x[cols.indexOf(c)], 0)).toBe(1);
    expect(x[cols.findIndex((c) => c.name === "industry_FinTech")]).toBe(1);
    expect(cols.filter((c) => c.group === "industry").reduce((s, c) => s + x[cols.indexOf(c)], 0)).toBe(1);
  });

  it("uses deal age for days-since-last-activity when there is none", () => {
    const x = extractFeatures({ ...deal, activities: [] }, asOf, spec);
    expect(x[3]).toBeCloseTo(40);
  });

  it("buckets unknown industries and sources into OTHER", () => {
    expect(bucketIndustry("Retail", spec)).toBe("OTHER");
    expect(bucketIndustry(null, spec)).toBe("OTHER");
    const cols = featureColumns(spec);
    const x = extractFeatures({ ...deal, source: "PODCAST", industry: "Retail" }, asOf, spec);
    expect(x[cols.findIndex((c) => c.name === "source_OTHER")]).toBe(1);
    expect(x[cols.findIndex((c) => c.name === "industry_OTHER")]).toBe(1);
  });
});

describe("selectTopIndustries", () => {
  it("ranks by frequency then name", () => {
    expect(selectTopIndustries(["B", "A", "B", "C", "A", null, "D"], 2)).toEqual(["A", "B"]);
  });
});

describe("explainScore", () => {
  const cols = featureColumns(spec);
  const weights = cols.map((c) => (c.group === "meetingCount" ? 1.5 : c.group === "dealAgeDays" ? -0.8 : 0));
  const z = cols.map((c) => (c.group === "meetingCount" ? 1 : c.group === "dealAgeDays" ? 0.5 : 0));
  const snapshot = snapshotFeatures(deal, asOf, spec);
  const result = explainScore({ weights, bias: 0 }, cols, z, snapshot);

  it("explains positive and negative drivers in plain English", () => {
    const { positive, negative } = topFactors(result.factors);
    expect(positive[0].label).toBe("2 meetings held");
    expect(positive[0].impact).toBeGreaterThan(0);
    expect(negative[0].label).toBe("Deal open for 40 days");
    expect(negative[0].impact).toBeLessThan(0);
    expect(result.probability).toBeCloseTo(1 / (1 + Math.exp(-(1.5 - 0.4))));
  });

  it("formats impact as signed percentage points", () => {
    expect(formatImpact(12.34)).toBe("+12%");
    expect(formatImpact(-3.21)).toBe("−3.2%");
    expect(formatImpact(0.01)).toBe("±0.0%");
  });
});

describe("factor labels", () => {
  it("describes a silent deal by how long it has been open", async () => {
    const { factorLabel } = await import("@/lib/ml/explain");
    const s = snapshotFeatures({ ...deal, activities: [] }, asOf, spec);
    expect(factorLabel("daysSinceLastActivity", s)).toBe("No activity since opening, 40 days ago");
    expect(factorLabel("activitiesLast14Days", snapshotFeatures(deal, asOf, spec))).toBe("2 activities in last 14 days");
    expect(factorLabel("source", s)).toBe("Lead source: Referral");
  });
});
