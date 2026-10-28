import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  requireUser,
  checkLinkedAccess,
  checkUserExists,
} from "@/features/auth/server/permissions";
import { taskSchema } from "@/features/tasks/schemas/task";
import { buildTaskBaseWhere, startOfToday, taskInclude } from "@/features/tasks/server/queries";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { enumParam, paginationMeta, parseListParams } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["dueDate", "priority", "title", "status", "createdAt"] as const;

/**
 * GET /api/tasks — paginated, filterable (status, priority, assigneeId, contactId, dealId, overdue, q),
 * sortable. `meta.counts` gives OPEN / DONE / overdue totals for the current filters (used by the tabs).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = req.nextUrl.searchParams;
    const { page, limit, skip, q, sortBy, sortOrder } = parseListParams(
      searchParams,
      SORT_FIELDS,
      "dueDate",
      "asc"
    );

    const base = buildTaskBaseWhere(user, searchParams, q);
    const status = enumParam(searchParams.get("status"), Object.values(TaskStatus));
    const where = status ? { AND: [base, { status }] } : base;

    const [items, total, byStatus, overdueCount] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        // Secondary sort keeps ordering stable across pages.
        orderBy: [{ [sortBy]: sortOrder }, { id: "asc" }],
        include: taskInclude,
      }),
      prisma.task.count({ where }),
      prisma.task.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
      prisma.task.count({
        where: { AND: [base, { status: TaskStatus.OPEN, dueDate: { lt: startOfToday() } }] },
      }),
    ]);

    const counts = {
      OPEN: byStatus.find((s) => s.status === TaskStatus.OPEN)?._count._all ?? 0,
      DONE: byStatus.find((s) => s.status === TaskStatus.DONE)?._count._all ?? 0,
      overdue: overdueCount,
    };

    return apiSuccess({ data: items, meta: { ...paginationMeta(page, limit, total), counts } });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const validated = taskSchema.parse(await req.json());

    const assigneeId = user.role === "ADMIN" && validated.assigneeId ? validated.assigneeId : user.id;
    if (assigneeId !== user.id) {
      const assigneeError = await checkUserExists(assigneeId, "assigneeId");
      if (assigneeError) return assigneeError;
    }

    const linkError = await checkLinkedAccess(user, {
      contactId: validated.contactId,
      dealId: validated.dealId,
    });
    if (linkError) return linkError;

    // A task created on a deal is also linked to the deal's contact.
    let contactId = validated.contactId || null;
    if (!contactId && validated.dealId) {
      const deal = await prisma.deal.findUnique({
        where: { id: validated.dealId },
        select: { contactId: true },
      });
      contactId = deal?.contactId ?? null;
    }

    const task = await prisma.task.create({
      data: {
        title: validated.title,
        description: validated.description?.trim() || null,
        dueDate: new Date(validated.dueDate),
        priority: validated.priority,
        status: validated.status,
        contactId,
        dealId: validated.dealId || null,
        assigneeId,
      },
      include: taskInclude,
    });

    return apiSuccess(task, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
