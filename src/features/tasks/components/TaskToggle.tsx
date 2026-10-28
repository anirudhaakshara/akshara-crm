"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import type { TaskStatusValue } from "@/features/tasks/schemas/task";

interface TaskToggleProps {
  taskId: string;
  status: TaskStatusValue;
  onChanged: (status: TaskStatusValue) => void;
}

/**
 * Mark complete / reopen checkbox. Updates optimistically and rolls back on failure.
 */
export function TaskToggle({ taskId, status, onChanged }: TaskToggleProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const done = status === "DONE";

  async function toggle() {
    const next: TaskStatusValue = done ? "OPEN" : "DONE";
    setBusy(true);
    onChanged(next);
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success(next === "DONE" ? "Task completed" : "Task reopened");
    } catch (err) {
      onChanged(status);
      toast.error(errorMessage(err, "Failed to update task"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={done ? "Reopen task" : "Mark task complete"}
      title={done ? "Reopen task" : "Mark complete"}
      className="shrink-0 rounded-full text-muted-foreground hover:text-primary transition-colors disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
    </button>
  );
}
