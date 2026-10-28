import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, canAccessRecord, checkUserExists } from "@/features/auth/server/permissions";
import { companySchema } from "@/features/companies/schemas/company";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        contacts: {
          orderBy: { createdAt: "desc" },
        },
        deals: {
          orderBy: { createdAt: "desc" },
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!company) {
      return apiError("NOT_FOUND", "Company not found", 404);
    }

    if (!canAccessRecord(user, company.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to view this company", 403);
    }

    const totalPipelineValue = company.deals.reduce((sum, deal) => {
      return sum + Number(deal.value);
    }, 0);

    const openPipelineValue = company.deals
      .filter((deal) => deal.stage !== "WON" && deal.stage !== "LOST")
      .reduce((sum, deal) => sum + Number(deal.value), 0);

    return apiSuccess({
      ...company,
      totalPipelineValue,
      openPipelineValue,
    });
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
    const existing = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "Company not found", 404);
    }

    if (!canAccessRecord(user, existing.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to modify this company", 403);
    }

    const body = await req.json();
    const validated = companySchema.partial().parse(body);
    if (user.role === "ADMIN" && validated.ownerId) {
      const ownerError = await checkUserExists(validated.ownerId, "ownerId");
      if (ownerError) return ownerError;
    }

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name.trim();
    if (validated.industry !== undefined) updateData.industry = validated.industry.trim();
    if (validated.website !== undefined) updateData.website = validated.website?.trim() || null;
    if (validated.city !== undefined) updateData.city = validated.city.trim();
    if (validated.phone !== undefined) updateData.phone = validated.phone?.trim() || null;
    if (user.role === "ADMIN" && validated.ownerId) {
      updateData.ownerId = validated.ownerId;
    }

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: updateData,
      include: {
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
    const existing = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "Company not found", 404);
    }

    if (!canAccessRecord(user, existing.ownerId)) {
      return apiError("FORBIDDEN", "You do not have permission to delete this company", 403);
    }

    await prisma.company.delete({
      where: { id: params.id },
    });

    return apiSuccess({ deleted: true, id: params.id });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
