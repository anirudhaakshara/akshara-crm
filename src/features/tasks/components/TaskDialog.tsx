"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client";
import { toDateInputValue } from "@/lib/formatters";
import { taskSchema, TASK_PRIORITIES, type TaskPriorityValue } from "@/features/tasks/schemas/task";
import type { TaskRecord } from "@/features/tasks/types";
import type { ContactOption, UserOption } from "@/hooks/useOptions";

interface TaskDialogProps {
  open: boolean;
  initialData?: TaskRecord | null;
  /** When creating from a contact or deal page these are fixed and the pickers are hidden. */
  contactId?: string;
  dealId?: string;
  contextLabel?: string;
  contacts?: ContactOption[];
  users?: UserOption[];
  isAdmin?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITY_LABELS: Record<TaskPriorityValue, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateInputValue(d);
}

export function TaskDialog({
  open,
  initialData,
  contactId,
  dealId,
  contextLabel,
  contacts = [],
  users = [],
  isAdmin = false,
  onClose,
  onSaved,
}: TaskDialogProps) {
  const toast = useToast();
  const isEditing = !!initialData?.id;
  const fixedContext = !!(contactId || dealId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(tomorrow());
  const [priority, setPriority] = useState<TaskPriorityValue>("MEDIUM");
  const [linkedContactId, setLinkedContactId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialData?.title ?? "");
    setDescription(initialData?.description ?? "");
    setDueDate(initialData ? toDateInputValue(initialData.dueDate) : tomorrow());
    setPriority(initialData?.priority ?? "MEDIUM");
    setLinkedContactId(initialData?.contactId ?? "");
    setAssigneeId(initialData?.assigneeId ?? "");
    setErrors({});
    setFormError(null);
    // Reset only when the dialog opens or switches record, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: title.trim(),
      description: description.trim(),
      // Store due dates at local midday so they don't shift a day across time zones.
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : "",
      priority,
      ...(isEditing
        ? {}
        : fixedContext
        ? { contactId: contactId ?? null, dealId: dealId ?? null }
        : { contactId: linkedContactId || null }),
      ...(isEditing && !fixedContext && !initialData?.dealId ? { contactId: linkedContactId || null } : {}),
      ...(isAdmin && assigneeId ? { assigneeId } : {}),
    };

    const parsed = taskSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (fieldErrors[i.path.join(".")] ??= i.message));
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await apiFetch(isEditing ? `/api/tasks/${initialData?.id}` : "/api/tasks", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(isEditing ? "Task updated" : "Task created");
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0]])));
      }
      setFormError(errorMessage(err, "Failed to save task"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={isEditing ? "Edit Task" : "New Follow-up Task"} onClose={onClose}>
      {contextLabel && !isEditing && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Linked to <span className="font-semibold text-foreground">{contextLabel}</span>
        </p>
      )}
      {formError && (
        <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5" noValidate>
        <Field label="Title" htmlFor="t-title" required error={errors.title}>
          <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send revised quotation" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Due date" htmlFor="t-due" required error={errors.dueDate}>
            <Input id="t-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Priority" htmlFor="t-priority">
            <Select id="t-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriorityValue)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {!fixedContext && !initialData?.dealId && contacts.length > 0 && (
          <Field label="Related contact" htmlFor="t-contact" error={errors.contactId}>
            <Select id="t-contact" value={linkedContactId} onChange={(e) => setLinkedContactId(e.target.value)}>
              <option value="">None</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {isAdmin && users.length > 0 && (
          <Field label="Assignee" htmlFor="t-assignee" error={errors.assigneeId}>
            <Select id="t-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">{isEditing ? "Keep current assignee" : "Assign to me"}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Notes" htmlFor="t-desc" error={errors.description}>
          <Textarea id="t-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" />
        </Field>
        <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
