import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, AuthenticatedUser } from "@/features/auth/server/permissions";
import { activitySchema } from "@/features/activities/schemas/activity";
import { apiSuccess, handleApiError, apiError } from "@/lib/api-response";
import { safeRescoreDeal } from "@/features/ml/server/inference";

export const dynamic = "force-dynamic";

const include = {
  user: { select: { id: true, name: true, email: true } },
  contact: { select: { id: true, firstName: true, lastName: true, ownerId: true } },
  deal: { select: { id: true, title: true, ownerId: true } },
} as const;

async function loadActivity(id: string) {
  return prisma.activity.findUnique({ where: { id }, include });
}

type LoadedActivity = NonNullable<Awaited<ReturnType<typeof loadActivity>>>;

function canView(user: AuthenticatedUser, a: LoadedActivity) {
  if (user.role === "ADMIN") return true;
  return a.userId === user.id || a.contact?.ownerId === user.id || a.deal?.ownerId === user.id;
}

// Only the author (or an admin) may edit or delete an activity.
function canModify(user: AuthenticatedUser, a: LoadedActivity) {
  return user.role === "ADMIN" || a.userId === user.id;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const activity = await loadActivity(params.id);
    if (!activity) return apiError("NOT_FOUND", "Activity not found", 404);
    if (!canView(user, activity)) {
      return apiError("FORBIDDEN", "You do not have permission to view this activity", 403);
    }
    return apiSuccess(activity);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await loadActivity(params.id);
    if (!existing) return apiError("NOT_FOUND", "Activity not found", 404);
    if (!canModify(user, existing)) {
      return apiError("FORBIDDEN", "You do not have permission to modify this activity", 403);
    }

    const validated = activitySchema
      .pick({ type: true, subject: true, description: true, occurredAt: true })
      .partial()
      .parse(await req.json());

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: {
        ...(validated.type !== undefined ? { type: validated.type } : {}),
        ...(validated.subject !== undefined ? { subject: validated.subject.trim() } : {}),
        ...(validated.description !== undefined
          ? { description: validated.description?.trim() || null }
          : {}),
        ...(validated.occurredAt !== undefined ? { occurredAt: new Date(validated.occurredAt) } : {}),
      },
      include,
    });

    await safeRescoreDeal(updated.dealId);
    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await loadActivity(params.id);
    if (!existing) return apiError("NOT_FOUND", "Activity not found", 404);
    if (!canModify(user, existing)) {
      return apiError("FORBIDDEN", "You do not have permission to delete this activity", 403);
    }

    await prisma.activity.delete({ where: { id: params.id } });
    await safeRescoreDeal(existing.dealId);
    return apiSuccess({ deleted: true, id: params.id });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
