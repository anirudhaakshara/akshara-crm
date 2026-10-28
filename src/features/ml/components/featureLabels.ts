const SOURCE: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  COLD_CALL: "Cold call",
  SOCIAL: "Social",
  EVENT: "Event",
  OTHER: "Other",
};

const NAMES: Record<string, string> = {
  logDealValue: "Deal value (log)",
  activitiesLast14Days: "Activities, last 14 days",
  totalActivities: "Total activities",
  daysSinceLastActivity: "Days since last activity",
  dealAgeDays: "Deal age (days)",
  meetingCount: "Meetings held",
};

/** Human label for a model column name, e.g. "source_REFERRAL" -> "Source: Referral". */
export function featureLabel(name: string): string {
  if (NAMES[name]) return NAMES[name];
  if (name.startsWith("source_")) return `Source: ${SOURCE[name.slice(7)] ?? name.slice(7)}`;
  if (name.startsWith("industry_")) {
    const ind = name.slice(9);
    return ind === "OTHER" ? "Industry: other" : `Industry: ${ind}`;
  }
  return name;
}
