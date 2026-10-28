"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CheckSquare, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate, isOverdue } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/features/tasks/components/PriorityBadge";
import { TaskToggle } from "@/features/tasks/components/TaskToggle";
import type { TaskRecord } from "@/features/tasks/types";

interface TaskListProps {
  tasks: TaskRecord[];
  onChanged: () => void;
  onEdit?: (task: TaskRecord) => void;
}

/**
 * Compact task list used on contact and deal pages: open tasks first, overdue highlighted.
 */
export function TaskList({ tasks, onChanged, onEdit }: TaskListProps) {
  const toast = useToast();
  const [items, setItems] = useState(tasks);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setItems(tasks), [tasks]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/tasks/${deleteId}`, { method: "DELETE" });
      toast.success("Task deleted");
      setDeleteId(null);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete task"));
    } finally {
      setDeleting(false);
    }
  }

  if (items.length === 0) {
    return <EmptyState icon={CheckSquare} title="No tasks yet" description="Create a follow-up task so nothing slips." />;
  }

  const sorted = [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="divide-y divide-border">
      {sorted.map((task) => {
        const overdue = isOverdue(task.dueDate, task.status);
        return (
          <div key={task.id} className={cn("py-2.5 flex items-start gap-3 group", overdue && "bg-destructive/5 -mx-2 px-2 rounded-lg")}>
            <div className="pt-0.5">
              <TaskToggle
                taskId={task.id}
                status={task.status}
                onChanged={(status) => setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)))}
              />
            </div>
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onEdit?.(task)}
                className={cn(
                  "text-left text-xs font-semibold text-foreground hover:text-primary transition-colors",
                  task.status === "DONE" && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </button>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className={cn("inline-flex items-center gap-1", overdue && "text-red-700 dark:text-red-400 font-semibold")}>
                  {overdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                  {overdue ? "Overdue · " : "Due "}
                  {formatDate(task.dueDate)}
                </span>
                {task.assignee && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.assignee.name}
                  </span>
                )}
              </div>
            </div>
            <PriorityBadge priority={task.priority} />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
              onClick={() => setDeleteId(task.id)}
              aria-label="Delete task"
            >
              <Trash2 className="h-3 w-3 text-red-700 dark:text-red-400" />
            </Button>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Task?"
        description="This follow-up task will be permanently removed."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
