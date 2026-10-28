"use client";

import React, { useState } from "react";
import { Phone, Mail, Calendar, FileText, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { formatDateTime } from "@/lib/formatters";

export interface ActivityItem {
  id: string;
  type: "CALL" | "EMAIL" | "MEETING" | "NOTE";
  subject: string;
  description: string | null;
  occurredAt: string;
  user: { id: string; name: string };
  contact?: { id: string; firstName: string; lastName: string } | null;
  deal?: { id: string; title: string } | null;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  onDeleted?: () => void;
  canDelete?: boolean;
  /** When provided, delete is only offered on the user's own activities (admins can delete any). */
  currentUserId?: string;
  isAdmin?: boolean;
}

export function ActivityTimeline({
  activities,
  onDeleted,
  canDelete = true,
  currentUserId,
  isAdmin = false,
}: ActivityTimelineProps) {
  const toast = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const iconMap = {
    CALL: { icon: Phone, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    EMAIL: { icon: Mail, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    MEETING: { icon: Calendar, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    NOTE: { icon: FileText, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  };

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/activities/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Activity deleted");
        setDeleteId(null);
        onDeleted?.();
      } else {
        toast.error(json.error?.message || "Failed to delete activity");
      }
    } catch {
      toast.error("Error deleting activity");
    } finally {
      setDeleting(false);
    }
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground border rounded-xl border-dashed">
        No activities logged yet. Click &quot;Log Activity&quot; to add a call, meeting, or note.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
      {activities.map((act) => {
        const style = iconMap[act.type] || iconMap.NOTE;
        const Icon = style.icon;

        return (
          <div key={act.id} className="relative group">
            {/* Timeline node */}
            <div
              className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full border ${style.color}`}
            >
              <Icon className="h-3 w-3" aria-hidden />
            </div>

            {/* Content card */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-border/80 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground leading-snug">
                    {act.subject}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                      <User className="h-3 w-3 text-primary" />
                      {act.user?.name || "User"}
                    </span>
                    <span>&bull;</span>
                    <span>{formatDateTime(act.occurredAt)}</span>
                    {act.deal && (
                      <>
                        <span>&bull;</span>
                        <span className="text-primary font-medium">Deal: {act.deal.title}</span>
                      </>
                    )}
                  </div>
                </div>

                {canDelete && (isAdmin || !currentUserId || act.user?.id === currentUserId) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity h-6 w-6"
                    onClick={() => setDeleteId(act.id)}
                    title="Delete activity"
                    aria-label="Delete activity"
                  >
                    <Trash2 className="h-3 w-3 text-red-700 dark:text-red-400" />
                  </Button>
                )}
              </div>

              {act.description && (
                <p className="mt-2.5 text-xs text-muted-foreground whitespace-pre-line leading-relaxed bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  {act.description}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Activity?"
        description="Are you sure you want to delete this activity log? This action cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
