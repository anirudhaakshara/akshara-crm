import { NextRequest, NextResponse } from "next/server";
import { DealStage } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  requireUser,
  checkLinkedAccess,
  checkUserExists,
} from "@/features/auth/server/permissions";
import { dealSchema } from "@/features/deals/schemas/deal";
import { buildDealWhere, dealListInclude, stageTransitionData } from "@/features/deals/server/queries";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";
import { parseListParams, paginationMeta } from "@/lib/pagination";
import { safeRescoreDeal } from "@/features/ml/server/inference";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["title", "value", "stage", "expectedCloseDate", "closedAt", "createdAt", "updatedAt", "winProbability"] as const;
const STAGE_ORDER = Object.values(DealStage);

/**
 * GET /api/deals
 *  - default (table): paginated list with search, filters (stage, status, ownerId, contactId, companyId) and sorting
 *  - ?view=board: deals grouped by stage with DB-aggregated count and ₹ total per column.
 *    Each column returns at most `perColumn` cards (default 50, max 200), most recently updated first.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = req.nextUrl.searchParams;
    const { page, limit, skip, q, sortBy, sortOrder } = parseListParams(
      searchParams,
      SORT_FIELDS,
      "createdAt",
      "desc"
    );
    const where = buildDealWhere(user, searchParams, q);

    if (searchParams.get("view") === "board") {
      const perColumn = Math.min(
        200,
        Math.max(1, parseInt(searchParams.get("perColumn") || "50", 10) || 50)
      );

      const [aggregates, ...columnDeals] = await Promise.all([
        prisma.deal.groupBy({
          by: ["stage"],
          where,
          _count: { _all: true },
          _sum: { value: true },
        }),
        ...STAGE_ORDER.map((stage) =>
          prisma.deal.findMany({
            where: { AND: [where, { stage }] },
            take: perColumn,
            orderBy: [{ updatedAt: "desc" }],
            include: dealListInclude,
          })
        ),
      ]);

      const columns = STAGE_ORDER.map((stage, idx) => {
        const agg = aggregates.find((a) => a.stage === stage);
        return {
          stage,
          count: agg?._count._all ?? 0,
          total: agg?._sum.value ? Number(agg._sum.value) : 0,
          deals: columnDeals[idx],
        };
      });

      return apiSuccess({ columns });
    }

    const [items, total, sum] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip,
        take: limit,
        // Unscored deals (closed / not enough data) always sort last when ordering by score.
        orderBy:
          sortBy === "winProbability"
            ? [{ winProbability: { sort: sortOrder, nulls: "last" } }, { id: "asc" }]
            : [{ [sortBy]: sortOrder }, { id: "asc" }],
        include: dealListInclude,
      }),
      prisma.deal.count({ where }),
      prisma.deal.aggregate({ where, _sum: { value: true } }),
    ]);

    return apiSuccess({
      data: items,
      meta: {
        ...paginationMeta(page, limit, total),
        totalValue: sum._sum.value ? Number(sum._sum.value) : 0,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const validated = dealSchema.parse(await req.json());

    const ownerId = user.role === "ADMIN" && validated.ownerId ? validated.ownerId : user.id;
    if (ownerId !== user.id) {
      const ownerError = await checkUserExists(ownerId, "ownerId");
      if (ownerError) return ownerError;
    }

    const linkError = await checkLinkedAccess(user, {
      contactId: validated.contactId,
      companyId: validated.companyId,
    });
    if (linkError) return linkError;

    if (validated.stage === DealStage.LOST && !validated.lostReason?.trim()) {
      return apiError("VALIDATION_ERROR", "A reason is required when marking a deal as lost", 400, {
        lostReason: ["Lost reason is required"],
      });
    }

    // Default the company to the contact's company when not provided.
    let companyId = validated.companyId ?? null;
    if (validated.companyId === undefined) {
      const contact = await prisma.contact.findUnique({
        where: { id: validated.contactId },
        select: { companyId: true },
      });
      companyId = contact?.companyId ?? null;
    }

    const deal = await prisma.deal.create({
      data: {
        title: validated.title,
        value: validated.value,
        expectedCloseDate: new Date(validated.expectedCloseDate),
        contactId: validated.contactId,
        companyId,
        ownerId,
        ...stageTransitionData(null, validated.stage, validated.lostReason, null),
      },
      include: dealListInclude,
    });

    const score = await safeRescoreDeal(deal.id);
    return apiSuccess({ ...deal, ...(score ?? {}) }, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
