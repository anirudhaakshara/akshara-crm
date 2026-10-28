import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, checkLinkedAccess } from "@/features/auth/server/permissions";
import { activitySchema } from "@/features/activities/schemas/activity";
import { apiSuccess, handleApiError, apiError } from "@/lib/api-response";
import { parseListParams, paginationMeta, enumParam } from "@/lib/pagination";
import { ActivityType, Prisma } from "@prisma/client";
import { safeRescoreDeal } from "@/features/ml/server/inference";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["occurredAt", "createdAt", "type", "subject"] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = req.nextUrl.searchParams;
    const { page, limit, skip, q, sortBy, sortOrder } = parseListParams(
      searchParams,
      SORT_FIELDS,
      "occurredAt",
      "desc"
    );

    const contactId = searchParams.get("contactId")?.trim();
    const dealId = searchParams.get("dealId")?.trim();
    const type = enumParam(searchParams.get("type"), Object.values(ActivityType));

    if (contactId || dealId) {
      const linkError = await checkLinkedAccess(user, { contactId, dealId });
      if (linkError) return linkError;
    }

    // A rep sees activities they logged, plus any on contacts/deals they own.
    const scope: Prisma.ActivityWhereInput =
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { userId: user.id },
              { contact: { ownerId: user.id } },
              { deal: { ownerId: user.id } },
            ],
          };

    const where: Prisma.ActivityWhereInput = {
      AND: [
        scope,
        contactId ? { contactId } : {},
        dealId ? { dealId } : {},
        type ? { type } : {},
        q
          ? {
              OR: [
                { subject: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    return apiSuccess({ data: items, meta: paginationMeta(page, limit, total) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const validated = activitySchema.parse(body);

    if (!validated.contactId && !validated.dealId) {
      return apiError("VALIDATION_ERROR", "Activity must be linked to either a contact or a deal", 400, {
        contactId: ["Link a contact or a deal"],
      });
    }

    const linkError = await checkLinkedAccess(user, {
      contactId: validated.contactId,
      dealId: validated.dealId,
    });
    if (linkError) return linkError;

    // Activities logged on a deal also appear on that deal's contact timeline.
    let contactId = validated.contactId || null;
    if (!contactId && validated.dealId) {
      const deal = await prisma.deal.findUnique({
        where: { id: validated.dealId },
        select: { contactId: true },
      });
      contactId = deal?.contactId ?? null;
    }

    const activity = await prisma.activity.create({
      data: {
        type: validated.type,
        subject: validated.subject.trim(),
        description: validated.description?.trim() || null,
        occurredAt: validated.occurredAt ? new Date(validated.occurredAt) : new Date(),
        contactId,
        dealId: validated.dealId || null,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    // A new meeting/call on a deal changes its win probability.
    await safeRescoreDeal(activity.dealId);
    return apiSuccess(activity, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
