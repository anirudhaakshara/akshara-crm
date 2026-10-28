import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import type { AuthenticatedUser } from "@/features/auth/server/permissions";
import { enumParam } from "@/lib/pagination";

export const taskInclude = {
  assignee: { select: { id: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  deal: { select: { id: true, title: true } },
} satisfies Prisma.TaskInclude;

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Task where-clause. Tasks are owned by their assignee: a SALES_REP only sees tasks assigned to them.
 * The `status` filter is applied separately so the list endpoint can also return per-tab counts.
 */
export function buildTaskBaseWhere(
  user: AuthenticatedUser,
  searchParams: URLSearchParams,
  q: string
): Prisma.TaskWhereInput {
  const priority = enumParam(searchParams.get("priority"), Object.values(TaskPriority));
  const assigneeId = searchParams.get("assigneeId")?.trim();
  const contactId = searchParams.get("contactId")?.trim();
  const dealId = searchParams.get("dealId")?.trim();
  const overdue = searchParams.get("overdue") === "true";

  return {
    AND: [
      user.role === "ADMIN" ? (assigneeId ? { assigneeId } : {}) : { assigneeId: user.id },
      priority ? { priority } : {},
      contactId ? { contactId } : {},
      dealId ? { dealId } : {},
      overdue ? { status: TaskStatus.OPEN, dueDate: { lt: startOfToday() } } : {},
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };
}
