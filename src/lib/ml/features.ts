/**
 * Feature engineering for the deal win-probability model.
 *
 * Every feature is measured "as of" a reference date so that training never peeks at the future:
 *  - closed deals (training rows): as of `closedAt`
 *  - open deals (inference):        as of now
 *
 * Stage ordinal: closed deals only ever carry WON/LOST (the label itself) and the schema keeps no
 * stage history, so the ordinal cannot be learned without leaking the outcome. It is computed for
 * display on open deals but deliberately excluded from the model vector (documented limitation).
 */

export const CONTACT_SOURCES = ["WEBSITE", "REFERRAL", "COLD_CALL", "SOCIAL", "EVENT", "OTHER"] as const;
export type ContactSourceKey = (typeof CONTACT_SOURCES)[number];

export const STAGE_ORDINAL: Record<string, number> = {
  NEW: 0,
  CONTACTED: 1,
  PROPOSAL: 2,
  NEGOTIATION: 3,
};

export const OTHER_INDUSTRY = "OTHER";
export const DEFAULT_TOP_INDUSTRIES = 5;
export const RECENT_WINDOW_DAYS = 14;
export const MAX_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActivityLite {
  type: string;
  occurredAt: Date;
}

export interface DealFeatureInput {
  value: number;
  stage: string;
  source: string;
  industry: string | null;
  createdAt: Date;
  activities: ActivityLite[];
}

export interface FeatureSpec {
  /** Industries that get their own one-hot column; everything else is OTHER. */
  industries: string[];
}

/** Human-meaningful raw values, used for explanations. */
export interface FeatureSnapshot {
  value: number;
  activitiesLast14Days: number;
  totalActivities: number;
  daysSinceLastActivity: number | null;
  dealAgeDays: number;
  meetingCount: number;
  source: ContactSourceKey;
  industry: string;
  stageOrdinal: number | null;
}

export type FeatureGroup =
  | "value"
  | "activitiesLast14Days"
  | "totalActivities"
  | "daysSinceLastActivity"
  | "dealAgeDays"
  | "meetingCount"
  | "source"
  | "industry";

export interface FeatureColumn {
  name: string;
  group: FeatureGroup;
}

export const NUMERIC_GROUPS: FeatureGroup[] = [
  "value",
  "activitiesLast14Days",
  "totalActivities",
  "daysSinceLastActivity",
  "dealAgeDays",
  "meetingCount",
];

export function normalizeSource(source: string): ContactSourceKey {
  return (CONTACT_SOURCES as readonly string[]).includes(source) ? (source as ContactSourceKey) : "OTHER";
}

export function bucketIndustry(industry: string | null | undefined, spec: FeatureSpec): string {
  if (!industry) return OTHER_INDUSTRY;
  return spec.industries.includes(industry) ? industry : OTHER_INDUSTRY;
}

/** Most frequent industries (ties broken alphabetically) — fixed at training time. */
export function selectTopIndustries(industries: (string | null)[], k: number = DEFAULT_TOP_INDUSTRIES): string[] {
  const counts = new Map<string, number>();
  for (const ind of industries) if (ind) counts.set(ind, (counts.get(ind) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k)
    .map(([name]) => name);
}

export function featureColumns(spec: FeatureSpec): FeatureColumn[] {
  return [
    { name: "logDealValue", group: "value" },
    { name: "activitiesLast14Days", group: "activitiesLast14Days" },
    { name: "totalActivities", group: "totalActivities" },
    { name: "daysSinceLastActivity", group: "daysSinceLastActivity" },
    { name: "dealAgeDays", group: "dealAgeDays" },
    { name: "meetingCount", group: "meetingCount" },
    ...CONTACT_SOURCES.map((s) => ({ name: `source_${s}`, group: "source" as const })),
    ...[...spec.industries, OTHER_INDUSTRY].map((i) => ({ name: `industry_${i}`, group: "industry" as const })),
  ];
}

export function snapshotFeatures(deal: DealFeatureInput, asOf: Date, spec: FeatureSpec): FeatureSnapshot {
  const asOfMs = asOf.getTime();
  const past = deal.activities.filter((a) => a.occurredAt.getTime() <= asOfMs);
  const windowStart = asOfMs - RECENT_WINDOW_DAYS * DAY_MS;
  const lastMs = past.reduce((m, a) => Math.max(m, a.occurredAt.getTime()), -Infinity);

  return {
    value: deal.value,
    activitiesLast14Days: past.filter((a) => a.occurredAt.getTime() > windowStart).length,
    totalActivities: past.length,
    daysSinceLastActivity: Number.isFinite(lastMs) ? Math.min(MAX_DAYS, Math.max(0, (asOfMs - lastMs) / DAY_MS)) : null,
    dealAgeDays: Math.min(MAX_DAYS, Math.max(0, (asOfMs - deal.createdAt.getTime()) / DAY_MS)),
    meetingCount: past.filter((a) => a.type === "MEETING").length,
    source: normalizeSource(deal.source),
    industry: bucketIndustry(deal.industry, spec),
    stageOrdinal: deal.stage in STAGE_ORDINAL ? STAGE_ORDINAL[deal.stage] : null,
  };
}

/** Converts a snapshot into the numeric model vector (column order = featureColumns(spec)). */
export function vectorize(s: FeatureSnapshot, spec: FeatureSpec): number[] {
  return [
    Math.log1p(Math.max(0, s.value)),
    s.activitiesLast14Days,
    s.totalActivities,
    // No activity at all counts as "silent since the deal was created".
    s.daysSinceLastActivity ?? s.dealAgeDays,
    s.dealAgeDays,
    s.meetingCount,
    ...CONTACT_SOURCES.map((src) => (s.source === src ? 1 : 0)),
    ...[...spec.industries, OTHER_INDUSTRY].map((ind) => (s.industry === ind ? 1 : 0)),
  ];
}

export function extractFeatures(deal: DealFeatureInput, asOf: Date, spec: FeatureSpec): number[] {
  return vectorize(snapshotFeatures(deal, asOf, spec), spec);
}
