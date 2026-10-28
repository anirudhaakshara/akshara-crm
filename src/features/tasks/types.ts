import type { TaskPriorityValue, TaskStatusValue } from "@/features/tasks/schemas/task";

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  contactId: string | null;
  dealId: string | null;
  assigneeId: string;
  createdAt: string;
  assignee: { id: string; name: string } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  deal?: { id: string; title: string } | null;
}
