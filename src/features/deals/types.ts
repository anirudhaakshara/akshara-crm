import type { DealStageValue } from "@/features/deals/schemas/deal";

export interface DealRecord {
  id: string;
  title: string;
  value: string | number;
  stage: DealStageValue;
  expectedCloseDate: string;
  closedAt: string | null;
  lostReason: string | null;
  contactId: string;
  companyId: string | null;
  ownerId: string;
  winProbability: number | null;
  createdAt: string;
  updatedAt: string;
  contact: { id: string; firstName: string; lastName: string } | null;
  company: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
}

export interface BoardColumn {
  stage: DealStageValue;
  count: number;
  total: number;
  deals: DealRecord[];
}
