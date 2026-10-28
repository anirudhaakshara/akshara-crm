import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/features/auth/server/permissions";
import { handleApiError, apiSuccess } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return apiSuccess({ users });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
