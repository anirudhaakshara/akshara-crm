import * as React from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 px-4 text-center">
      {Icon && <Icon className="h-6 w-6 text-muted-foreground/60" />}
      <p className="text-xs font-semibold text-foreground">{title}</p>
      {description && <p className="text-[11px] text-muted-foreground max-w-xs">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
