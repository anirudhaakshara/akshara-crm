import { Badge } from "@/components/ui/badge";
import type { TaskPriorityValue } from "@/features/tasks/schemas/task";

const MAP: Record<TaskPriorityValue, { label: string; variant: "destructive" | "warning" | "secondary" }> = {
  HIGH: { label: "High", variant: "destructive" },
  MEDIUM: { label: "Medium", variant: "warning" },
  LOW: { label: "Low", variant: "secondary" },
};

export function PriorityBadge({ priority }: { priority: TaskPriorityValue }) {
  const { label, variant } = MAP[priority];
  return <Badge variant={variant}>{label}</Badge>;
}
