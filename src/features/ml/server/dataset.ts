import { Prisma } from "@prisma/client";
import type { DealFeatureInput } from "@/lib/ml/features";

/** Everything feature engineering needs about a deal, in one query shape. */
export const dealFeatureSelect = {
  id: true,
  value: true,
  stage: true,
  createdAt: true,
  closedAt: true,
  contact: { select: { source: true } },
  company: { select: { industry: true } },
  activities: { select: { type: true, occurredAt: true } },
} satisfies Prisma.DealSelect;

export type DealFeatureRow = Prisma.DealGetPayload<{ select: typeof dealFeatureSelect }>;

export function toFeatureInput(row: DealFeatureRow): DealFeatureInput {
  return {
    value: Number(row.value),
    stage: row.stage,
    source: row.contact.source,
    industry: row.company?.industry ?? null,
    createdAt: row.createdAt,
    activities: row.activities,
  };
}
