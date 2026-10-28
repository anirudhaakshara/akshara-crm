import { z } from "zod";

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const TASK_STATUSES = ["OPEN", "DONE"] as const;

export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];
export type TaskStatusValue = (typeof TASK_STATUSES)[number];

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  status: z.enum(TASK_STATUSES).default("OPEN"),
  contactId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
  assigneeId: z.string().optional(),
});

export const taskUpdateSchema = taskSchema.partial();

export type TaskInput = z.infer<typeof taskSchema>;
