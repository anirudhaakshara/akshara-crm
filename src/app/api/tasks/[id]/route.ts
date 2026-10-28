import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  requireUser,
  canAccessRecord,
  checkLinkedAccess,
  checkUserExists,
} from "@/features/auth/server/permissions";
import { taskUpdateSchema } from "@/features/tasks/schemas/task";
import { taskInclude } from "@/features/tasks/server/queries";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const task = await prisma.task.findUnique({ where: { id: params.id }, include: taskInclude });
    if (!task) return apiError("NOT_FOUND", "Task not found", 404);
    if (!canAccessRecord(user, task.assigneeId)) {
      return apiError("FORBIDDEN", "You do not have permission to view this task", 403);
    }
    return apiSuccess(task);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.task.findUnique({
      where: { id: params.id },
      select: { id: true, assigneeId: true },
    });
    if (!existing) return apiError("NOT_FOUND", "Task not found", 404);
    if (!canAccessRecord(user, existing.assigneeId)) {
      return apiError("FORBIDDEN", "You do not have permission to modify this task", 403);
    }

    const validated = taskUpdateSchema.parse(await req.json());

    const linkError = await checkLinkedAccess(user, {
      contactId: validated.contactId,
      dealId: validated.dealId,
    });
    if (linkError) return linkError;

    if (user.role === "ADMIN" && validated.assigneeId) {
      const assigneeError = await checkUserExists(validated.assigneeId, "assigneeId");
      if (assigneeError) return assigneeError;
    }

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (validated.title !== undefined) data.title = validated.title;
    if (validated.description !== undefined) data.description = validated.description?.trim() || null;
    if (validated.dueDate !== undefined) data.dueDate = new Date(validated.dueDate);
    if (validated.priority !== undefined) data.priority = validated.priority;
    if (validated.status !== undefined) data.status = validated.status;
    if (validated.contactId !== undefined) data.contactId = validated.contactId || null;
    if (validated.dealId !== undefined) data.dealId = validated.dealId || null;
    // Only admins can reassign tasks.
    if (user.role === "ADMIN" && validated.assigneeId) data.assigneeId = validated.assigneeId;

    const updated = await prisma.task.update({
      where: { id: params.id },
      data,
      include: taskInclude,
    });
    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.task.findUnique({
      where: { id: params.id },
      select: { id: true, assigneeId: true },
    });
    if (!existing) return apiError("NOT_FOUND", "Task not found", 404);
    if (!canAccessRecord(user, existing.assigneeId)) {
      return apiError("FORBIDDEN", "You do not have permission to delete this task", 403);
    }

    await prisma.task.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true, id: params.id });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
