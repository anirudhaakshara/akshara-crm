import { z } from "zod";

export const DEAL_STAGES = ["NEW", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export type DealStageValue = (typeof DEAL_STAGES)[number];

export const CLOSED_STAGES: readonly DealStageValue[] = ["WON", "LOST"];

export function isClosedStage(stage: string): boolean {
  return stage === "WON" || stage === "LOST";
}

export const STAGE_LABELS: Record<DealStageValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

const dateString = z
  .string()
  .min(1, "Date is required")
  .refine((v) => !isNaN(Date.parse(v)), "Invalid date");

export const dealSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(120),
  value: z.coerce
    .number({ invalid_type_error: "Value must be a number" })
    .nonnegative("Value cannot be negative")
    .max(9_999_999_999, "Value is too large"),
  stage: z.enum(DEAL_STAGES).default("NEW"),
  expectedCloseDate: dateString,
  contactId: z.string().min(1, "Contact is required"),
  companyId: z.string().nullable().optional(),
  ownerId: z.string().optional(),
  lostReason: z.string().trim().max(500).nullable().optional(),
});

export const dealUpdateSchema = dealSchema.partial();

export type DealInput = z.infer<typeof dealSchema>;
export type DealUpdateInput = z.infer<typeof dealUpdateSchema>;
