import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/features/auth/server/permissions";
import { createUserSchema } from "@/features/users/schemas/user";
import { handleApiError, apiSuccess } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/users — team list for owner/assignee pickers (any signed-in user).
 * Admins also get creation dates and record counts for the user-management page.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const isAdmin = user.role === "ADMIN";

    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ...(isAdmin
          ? {
              createdAt: true,
              _count: { select: { deals: true, contacts: true, companies: true, tasks: true } },
            }
          : {}),
      },
    });

    return apiSuccess({ users });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

/** POST /api/users — admin creates a user (password hashed with bcrypt). */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = createUserSchema.parse(await req.json());

    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: await bcrypt.hash(input.password, 10),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return apiSuccess(created, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
