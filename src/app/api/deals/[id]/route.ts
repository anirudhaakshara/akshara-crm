import { NextRequest, NextResponse } from "next/server";
import { DealStage, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  requireUser,
  canAccessRecord,
  checkLinkedAccess,
  checkUserExists,
} from "@/features/auth/server/permissions";
import { dealUpdateSchema } from "@/features/deals/schemas/deal";
import { dealListInclude, stageTransitionData } from "@/features/deals/server/queries";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { safeRescoreDeal } from "@/features/ml/server/inference";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true },
        },
        company: { select: { id: true, name: true, industry: true, city: true } },
        owner: { select: { id: true, name: true, email: true } },
        activities: {
          orderBy: { occurredAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            deal: { select: { id: true, title: true } },
          },
        },
        tasks: {
          orderBy: [{ status: "asc" }, { dueDate: "asc" }],
          include: {
            assignee: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            deal: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!deal) return apiError("NOT_FOUND", "Deal not found", 404);
    if (!canAccessRecord(user, deal.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to view this deal", 403);
    }

    return apiSuccess(deal);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.deal.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true, stage: true, closedAt: true, lostReason: true },
    });

    if (!existing) return apiError("NOT_FOUND", "Deal not found", 404);
    if (!canAccessRecord(user, existing.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to modify this deal", 403);
    }

    const validated = dealUpdateSchema.parse(await req.json());

    const linkError = await checkLinkedAccess(user, {
      contactId: validated.contactId,
      companyId: validated.companyId,
    });
    if (linkError) return linkError;

    if (user.role === "ADMIN" && validated.ownerId) {
      const ownerError = await checkUserExists(validated.ownerId, "ownerId");
      if (ownerError) return ownerError;
    }

    const data: Prisma.DealUncheckedUpdateInput = {};
    if (validated.title !== undefined) data.title = validated.title;
    if (validated.value !== undefined) data.value = validated.value;
    if (validated.expectedCloseDate !== undefined) {
      data.expectedCloseDate = new Date(validated.expectedCloseDate);
    }
    if (validated.contactId !== undefined) data.contactId = validated.contactId;
    if (validated.companyId !== undefined) data.companyId = validated.companyId || null;
    if (user.role === "ADMIN" && validated.ownerId) data.ownerId = validated.ownerId;

    const nextStage = validated.stage ?? existing.stage;
    if (nextStage === DealStage.LOST) {
      const reason = validated.lostReason !== undefined ? validated.lostReason : existing.lostReason;
      if (!reason?.trim()) {
        return apiError("VALIDATION_ERROR", "A reason is required when marking a deal as lost", 400, {
          lostReason: ["Lost reason is required"],
        });
      }
      Object.assign(
        data,
        stageTransitionData(existing.stage, nextStage, reason, existing.closedAt)
      );
    } else if (validated.stage !== undefined) {
      Object.assign(
        data,
        stageTransitionData(existing.stage, nextStage, null, existing.closedAt)
      );
    }

    const updated = await prisma.deal.update({
      where: { id: params.id },
      data,
      include: dealListInclude,
    });

    // Value, stage, contact or company can all change the score.
    const score = await safeRescoreDeal(updated.id);
    return apiSuccess({ ...updated, ...(score ?? {}) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.deal.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true },
    });

    if (!existing) return apiError("NOT_FOUND", "Deal not found", 404);
    if (!canAccessRecord(user, existing.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to delete this deal", 403);
    }

    await prisma.deal.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true, id: params.id });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
