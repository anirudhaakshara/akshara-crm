import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  canAccessRecord,
  checkLinkedAccess,
  checkUserExists,
} from "@/features/auth/server/permissions";
import { contactSchema } from "@/features/contacts/schemas/contact";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true, city: true, industry: true } },
        owner: { select: { id: true, name: true, email: true } },
        deals: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            value: true,
            stage: true,
            expectedCloseDate: true,
            winProbability: true,
            scoreFactors: true,
          },
        },
        activities: {
          orderBy: { occurredAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
            deal: { select: { id: true, title: true } },
          },
        },
        tasks: {
          orderBy: { dueDate: "asc" },
          include: {
            assignee: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!contact) {
      return apiError("NOT_FOUND", "Contact not found", 404);
    }

    if (!canAccessRecord(user, contact.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to view this contact", 403);
    }

    return apiSuccess(contact);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const existing = await prisma.contact.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "Contact not found", 404);
    }

    if (!canAccessRecord(user, existing.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to modify this contact", 403);
    }

    const body = await req.json();
    const validated = contactSchema.partial().parse(body);

    if (validated.companyId) {
      const linkError = await checkLinkedAccess(user, { companyId: validated.companyId });
      if (linkError) return linkError;
    }
    if (user.role === "ADMIN" && validated.ownerId) {
      const ownerError = await checkUserExists(validated.ownerId, "ownerId");
      if (ownerError) return ownerError;
    }

    const updateData: Record<string, unknown> = {};
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName.trim();
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName.trim();
    if (validated.email !== undefined) updateData.email = validated.email.trim().toLowerCase();
    if (validated.phone !== undefined) updateData.phone = validated.phone?.trim() || null;
    if (validated.jobTitle !== undefined) updateData.jobTitle = validated.jobTitle?.trim() || null;
    if (validated.companyId !== undefined) updateData.companyId = validated.companyId || null;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.source !== undefined) updateData.source = validated.source;
    if (user.role === "ADMIN" && validated.ownerId) {
      updateData.ownerId = validated.ownerId;
    }

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const existing = await prisma.contact.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "Contact not found", 404);
    }

    if (!canAccessRecord(user, existing.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to delete this contact", 403);
    }

    await prisma.contact.delete({
      where: { id: params.id },
    });

    return apiSuccess({ deleted: true, id: params.id });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
