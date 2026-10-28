import { DealStage, Prisma, TaskStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { AuthenticatedUser } from "@/features/auth/server/permissions";
import {
  addMonths,
  monthKeyString,
  monthLabel,
  monthOf,
  monthStart,
  projectTrend,
} from "@/lib/ml/forecast";
import { startOfTodayIST, startOfTomorrowIST } from "@/lib/dates";
import type { DashboardStats } from "@/features/dashboard/types";

const OPEN_STAGES = [DealStage.NEW, DealStage.CONTACTED, DealStage.PROPOSAL, DealStage.NEGOTIATION];
const HISTORY_MONTHS = 12;
const PROJECT_MONTHS = 3;

/**
 * All dashboard numbers, computed with DB aggregates. ADMIN sees the whole team; a SALES_REP sees only
 * their own deals, contacts, tasks and activities. "My tasks" is always the signed-in user's.
 */
export async function getDashboardStats(user: AuthenticatedUser, now: Date = new Date()): Promise<DashboardStats> {
  const own = user.role !== "ADMIN";
  const dealScope: Prisma.DealWhereInput = own ? { ownerId: user.id } : {};
  // Bound as a parameter (NULL = no filter) so the raw SQL stays a single static statement.
  const ownerId: string | null = own ? user.id : null;

  const thisMonth = monthOf(now);
  const nextMonth = addMonths(thisMonth, 1);
  const thisMonthStart = monthStart(thisMonth);
  const nextMonthStart = monthStart(nextMonth);
  const monthAfterStart = monthStart(addMonths(thisMonth, 2));
  const historyStart = monthStart(addMonths(thisMonth, -HISTORY_MONTHS));
  const todayStart = startOfTodayIST(now);
  const tomorrowStart = startOfTomorrowIST(now);

  const [
    openAgg,
    weightedRows,
    wonThisMonth,
    closedByStage,
    openTasks,
    overdueTasks,
    byStage,
    wonByMonthRows,
    expectedRows,
    bySource,
    myTasks,
    recentActivities,
  ] = await Promise.all([
    prisma.deal.aggregate({ where: { ...dealScope, stage: { in: OPEN_STAGES } }, _sum: { value: true }, _count: { _all: true } }),
    prisma.$queryRaw<{ weighted: number; scored: number }[]>`
      SELECT COALESCE(SUM("value" * "winProbability"), 0)::float AS weighted,
             COUNT(*) FILTER (WHERE "winProbability" IS NOT NULL)::int AS scored
      FROM "deals"
      WHERE "stage" NOT IN ('WON', 'LOST') AND (${ownerId}::text IS NULL OR "ownerId" = ${ownerId})`,
    prisma.deal.aggregate({
      where: { ...dealScope, stage: DealStage.WON, closedAt: { gte: thisMonthStart, lt: nextMonthStart } },
      _sum: { value: true },
      _count: { _all: true },
    }),
    prisma.deal.groupBy({
      by: ["stage"],
      where: { ...dealScope, stage: { in: [DealStage.WON, DealStage.LOST] }, closedAt: { gte: historyStart } },
      _count: { _all: true },
    }),
    prisma.task.count({ where: { ...(own ? { assigneeId: user.id } : {}), status: TaskStatus.OPEN } }),
    prisma.task.count({ where: { ...(own ? { assigneeId: user.id } : {}), status: TaskStatus.OPEN, dueDate: { lt: todayStart } } }),
    prisma.deal.groupBy({
      by: ["stage"],
      where: { ...dealScope, stage: { in: OPEN_STAGES } },
      _sum: { value: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT to_char(date_trunc('month', ("closedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM') AS month,
             SUM("value")::float AS total
      FROM "deals"
      WHERE "stage" = 'WON' AND "closedAt" >= ${historyStart} AND "closedAt" < ${nextMonthStart} AND (${ownerId}::text IS NULL OR "ownerId" = ${ownerId})
      GROUP BY 1`,
    prisma.$queryRaw<{ bucket: string; expected: number; pipeline: number; unscored: number }[]>`
      SELECT CASE WHEN "expectedCloseDate" < ${nextMonthStart} THEN 'current' ELSE 'next' END AS bucket,
             COALESCE(SUM("value" * "winProbability"), 0)::float AS expected,
             COALESCE(SUM("value"), 0)::float AS pipeline,
             COUNT(*) FILTER (WHERE "winProbability" IS NULL)::int AS unscored
      FROM "deals"
      WHERE "stage" NOT IN ('WON', 'LOST')
        AND "expectedCloseDate" >= ${thisMonthStart} AND "expectedCloseDate" < ${monthAfterStart} AND (${ownerId}::text IS NULL OR "ownerId" = ${ownerId})
      GROUP BY 1`,
    prisma.contact.groupBy({ by: ["source"], where: own ? { ownerId: user.id } : {}, _count: { _all: true } }),
    prisma.task.findMany({
      where: { assigneeId: user.id, status: TaskStatus.OPEN, dueDate: { lt: tomorrowStart } },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.activity.findMany({
      where: own
        ? { OR: [{ userId: user.id }, { contact: { ownerId: user.id } }, { deal: { ownerId: user.id } }] }
        : {},
      orderBy: { occurredAt: "desc" },
      take: 8,
      select: {
        id: true,
        type: true,
        subject: true,
        occurredAt: true,
        user: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  // ---- Forecast: 12 complete months of history, trend projected 3 months ahead ----
  const wonByMonth = new Map(wonByMonthRows.map((r) => [r.month, Number(r.total)]));
  const historyKeys = Array.from({ length: HISTORY_MONTHS }, (_, i) => addMonths(thisMonth, i - HISTORY_MONTHS));
  const history = historyKeys.map((m) => wonByMonth.get(monthKeyString(m)) ?? 0);
  const { fit, fitted, projected } = projectTrend(history, PROJECT_MONTHS);
  const expected = {
    current: expectedRows.find((r) => r.bucket === "current"),
    next: expectedRows.find((r) => r.bucket === "next"),
  };

  const months: DashboardStats["forecast"]["months"] = [
    ...historyKeys.map((m, i) => ({
      key: monthKeyString(m),
      label: monthLabel(m),
      actual: history[i],
      trend: fitted[i],
      // The projection line starts from the last fitted point so it joins the trend.
      projected: i === HISTORY_MONTHS - 1 ? fitted[i] : null,
      expected: null,
      isCurrent: false,
    })),
    ...Array.from({ length: PROJECT_MONTHS }, (_, k) => {
      const m = addMonths(thisMonth, k);
      return {
        key: monthKeyString(m),
        label: monthLabel(m),
        actual: k === 0 ? wonByMonth.get(monthKeyString(m)) ?? 0 : null,
        trend: null,
        projected: projected[k],
        expected: k === 0 ? expected.current?.expected ?? 0 : k === 1 ? expected.next?.expected ?? 0 : null,
        isCurrent: k === 0,
      };
    }),
  ];

  const won12 = closedByStage.find((r) => r.stage === DealStage.WON)?._count._all ?? 0;
  const lost12 = closedByStage.find((r) => r.stage === DealStage.LOST)?._count._all ?? 0;
  const weighted = weightedRows[0] ?? { weighted: 0, scored: 0 };

  return {
    generatedAt: now.toISOString(),
    scope: own ? "OWN" : "ALL",
    kpis: {
      openPipelineValue: Number(openAgg._sum.value ?? 0),
      openDeals: openAgg._count._all,
      weightedPipeline: Number(weighted.weighted),
      scoredOpenDeals: Number(weighted.scored),
      wonThisMonthValue: Number(wonThisMonth._sum.value ?? 0),
      wonThisMonthCount: wonThisMonth._count._all,
      winRate: won12 + lost12 > 0 ? won12 / (won12 + lost12) : null,
      closedLast12Months: won12 + lost12,
      openTasks,
      overdueTasks,
    },
    pipelineByStage: OPEN_STAGES.map((stage) => {
      const row = byStage.find((r) => r.stage === stage);
      return { stage, value: Number(row?._sum.value ?? 0), count: row?._count._all ?? 0 };
    }),
    leadsBySource: bySource
      .map((r) => ({ source: r.source, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
    forecast: {
      months,
      currentMonth: {
        label: monthLabel(thisMonth),
        expected: expected.current?.expected ?? 0,
        pipeline: expected.current?.pipeline ?? 0,
        unscored: expected.current?.unscored ?? 0,
      },
      nextMonth: {
        label: monthLabel(nextMonth),
        expected: expected.next?.expected ?? 0,
        pipeline: expected.next?.pipeline ?? 0,
        unscored: expected.next?.unscored ?? 0,
      },
      trendSlopePerMonth: fit.slope,
    },
    myTasks: myTasks.map((t) => ({
      ...t,
      dueDate: t.dueDate.toISOString(),
      overdue: t.dueDate.getTime() < todayStart.getTime(),
    })),
    recentActivities: recentActivities.map((a) => ({ ...a, occurredAt: a.occurredAt.toISOString() })),
  };
}
