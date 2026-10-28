import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, type DealStageValue } from "@/features/deals/schemas/deal";

const VARIANTS: Record<DealStageValue, "secondary" | "info" | "warning" | "success" | "destructive" | "outline"> = {
  NEW: "secondary",
  CONTACTED: "info",
  PROPOSAL: "outline",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "destructive",
};

export const STAGE_ACCENTS: Record<DealStageValue, string> = {
  NEW: "bg-slate-400",
  CONTACTED: "bg-sky-500",
  PROPOSAL: "bg-indigo-500",
  NEGOTIATION: "bg-amber-500",
  WON: "bg-emerald-500",
  LOST: "bg-rose-500",
};

export function StageBadge({ stage, className }: { stage: DealStageValue; className?: string }) {
  return (
    <Badge variant={VARIANTS[stage]} className={className}>
      {STAGE_LABELS[stage]}
    </Badge>
  );
}
