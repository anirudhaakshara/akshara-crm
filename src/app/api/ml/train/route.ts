import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/server/permissions";
import { InsufficientDataError, trainAndActivate } from "@/features/ml/server/training";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/ml/train — admin-only "Retrain model". */
export async function POST() {
  try {
    await requireAdmin();
    const outcome = await trainAndActivate();
    return apiSuccess(outcome, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    if (error instanceof InsufficientDataError) {
      return apiError("INSUFFICIENT_DATA", error.message, 409);
    }
    return handleApiError(error);
  }
}
