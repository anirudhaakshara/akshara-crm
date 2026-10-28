export const CONTACT_STATUSES = ["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"] as const;
export const CONTACT_SOURCES = ["WEBSITE", "REFERRAL", "COLD_CALL", "SOCIAL", "EVENT", "OTHER"] as const;

export type ContactStatusValue = (typeof CONTACT_STATUSES)[number];
export type ContactSourceValue = (typeof CONTACT_SOURCES)[number];

export const STATUS_LABELS: Record<ContactStatusValue, string> = {
  LEAD: "Lead",
  PROSPECT: "Prospect",
  CUSTOMER: "Customer",
  CHURNED: "Churned",
};

export const SOURCE_LABELS: Record<ContactSourceValue, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  COLD_CALL: "Cold call",
  SOCIAL: "Social",
  EVENT: "Event",
  OTHER: "Other",
};

export const STATUS_VARIANTS: Record<ContactStatusValue, "info" | "warning" | "success" | "destructive"> = {
  LEAD: "info",
  PROSPECT: "warning",
  CUSTOMER: "success",
  CHURNED: "destructive",
};
