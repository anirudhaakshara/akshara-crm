import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server/permissions";
import { getDashboardStats } from "@/features/dashboard/server/stats";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/dashboard/stats — KPIs, charts, forecast, my tasks and recent activity (role-scoped). */
export async function GET() {
  try {
    const user = await requireUser();
    return apiSuccess(await getDashboardStats(user));
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
