/**
 * Turns a model + one deal into plain-English factors.
 *
 * - `contribution` = weight × standardised value, summed per feature group (what the SRS stores).
 * - `impact` = how many percentage points that group moves the probability compared with the same
 *   deal at the training average for that group: p(x) − p(x with the group's contribution removed).
 */
import { formatINR } from "@/lib/formatters";
import { sigmoid, type LogisticModel } from "@/lib/ml/logisticRegression";
import type { FeatureColumn, FeatureGroup, FeatureSnapshot } from "@/lib/ml/features";

export interface ScoreFactor {
  group: FeatureGroup;
  label: string;
  contribution: number;
  /** Percentage points, e.g. 12.3 means +12.3%. */
  impact: number;
}

export interface ScoreExplanation {
  probability: number;
  factors: ScoreFactor[];
}

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  COLD_CALL: "Cold call",
  SOCIAL: "Social",
  EVENT: "Event",
  OTHER: "Other",
};

function plural(n: number, singular: string, pluralForm: string = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function factorLabel(group: FeatureGroup, s: FeatureSnapshot): string {
  switch (group) {
    case "value":
      return `Deal value ${formatINR(s.value)}`;
    case "activitiesLast14Days":
      return s.activitiesLast14Days === 0
        ? "No activity in last 14 days"
        : `${plural(s.activitiesLast14Days, "activity", "activities")} in last 14 days`;
    case "totalActivities":
      return `${plural(s.totalActivities, "activity", "activities")} logged in total`;
    case "daysSinceLastActivity":
      // With no activity the model treats the deal as silent since it was opened.
      return s.daysSinceLastActivity === null
        ? Math.round(s.dealAgeDays) < 1
          ? "No activity yet (opened today)"
          : `No activity since opening, ${plural(Math.round(s.dealAgeDays), "day")} ago`
        : s.daysSinceLastActivity < 1
        ? "Last activity today"
        : `Last activity ${plural(Math.round(s.daysSinceLastActivity), "day")} ago`;
    case "dealAgeDays":
      return `Deal open for ${plural(Math.round(s.dealAgeDays), "day")}`;
    case "meetingCount":
      return s.meetingCount === 0 ? "No meetings yet" : `${plural(s.meetingCount, "meeting")} held`;
    case "source":
      return `Lead source: ${SOURCE_LABELS[s.source] ?? s.source}`;
    case "industry":
      return s.industry === "OTHER" ? "Industry: other" : `Industry: ${s.industry}`;
  }
}

export function explainScore(
  model: LogisticModel,
  columns: FeatureColumn[],
  standardized: number[],
  snapshot: FeatureSnapshot
): ScoreExplanation {
  let z = model.bias;
  const byGroup = new Map<FeatureGroup, number>();
  columns.forEach((col, j) => {
    const c = model.weights[j] * standardized[j];
    z += c;
    byGroup.set(col.group, (byGroup.get(col.group) ?? 0) + c);
  });
  const probability = sigmoid(z);

  const factors: ScoreFactor[] = Array.from(byGroup.entries()).map(([group, contribution]) => ({
    group,
    label: factorLabel(group, snapshot),
    contribution: round(contribution, 4),
    impact: round((probability - sigmoid(z - contribution)) * 100, 1),
  }));
  factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return { probability, factors };
}

export function topFactors(factors: ScoreFactor[], n: number = 3) {
  return {
    positive: factors.filter((f) => f.impact > 0).sort((a, b) => b.impact - a.impact).slice(0, n),
    negative: factors.filter((f) => f.impact < 0).sort((a, b) => a.impact - b.impact).slice(0, n),
  };
}

export function formatImpact(impact: number): string {
  const v = Math.abs(impact) < 0.05 ? 0 : impact;
  return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0)}%`;
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
