import { NextResponse } from "next/server";
import { DealStage } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/server/permissions";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { MIN_CLOSED_DEALS } from "@/features/ml/types";

export const dynamic = "force-dynamic";

/** GET /api/ml/model — active model, recent versions and data readiness (admin). */
export async function GET() {
  try {
    await requireAdmin();

    const closedStages = [DealStage.WON, DealStage.LOST];
    const [active, history, won, lost, open, scoredOpen] = await Promise.all([
      prisma.modelVersion.findFirst({ where: { name: "deal-win", isActive: true }, orderBy: { trainedAt: "desc" } }),
      prisma.modelVersion.findMany({
        where: { name: "deal-win" },
        orderBy: { trainedAt: "desc" },
        take: 5,
        select: { id: true, trainedAt: true, isActive: true, metrics: true },
      }),
      prisma.deal.count({ where: { stage: DealStage.WON } }),
      prisma.deal.count({ where: { stage: DealStage.LOST } }),
      prisma.deal.count({ where: { stage: { notIn: closedStages } } }),
      prisma.deal.count({ where: { stage: { notIn: closedStages }, winProbability: { not: null } } }),
    ]);

    return apiSuccess({
      active,
      history,
      data: {
        closedDeals: won + lost,
        wonDeals: won,
        lostDeals: lost,
        openDeals: open,
        scoredOpenDeals: scoredOpen,
        minClosedDeals: MIN_CLOSED_DEALS,
        enoughData: won + lost >= MIN_CLOSED_DEALS,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
