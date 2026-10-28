import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/server/permissions";
import { updateUserRoleSchema } from "@/features/users/schemas/user";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/users/[id] — admin changes a user's role.
 * Guards: an admin cannot change their own role, and the last admin cannot be demoted.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const { role } = updateUserRoleSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, role: true } });
    if (!target) return apiError("NOT_FOUND", "User not found", 404);

    if (target.id === admin.id && role !== target.role) {
      return apiError("FORBIDDEN", "You can't change your own role. Ask another admin.", 403);
    }

    if (target.role === Role.ADMIN && role !== Role.ADMIN) {
      const admins = await prisma.user.count({ where: { role: Role.ADMIN } });
      if (admins <= 1) {
        return apiError("CONFLICT", "There must always be at least one admin.", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
