import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(
  code: string,
  message: string,
  status: number = 400,
  fields?: Record<string, string[]>
) {
  const payload: ApiErrorPayload = {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  };
  return NextResponse.json(payload, { status });
}

export function handleApiError(error: unknown) {
  console.error("API Error caught:", error);

  if (error instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".");
      if (!fields[path]) {
        fields[path] = [];
      }
      fields[path].push(issue.message);
    }
    return apiError("VALIDATION_ERROR", "Validation failed for one or more fields", 400, fields);
  }

  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; meta?: Record<string, unknown> };
    if (prismaError.code === "P2002") {
      return apiError("CONFLICT", "A record with this unique field already exists", 409);
    }
    if (prismaError.code === "P2025") {
      return apiError("NOT_FOUND", "The requested record was not found", 404);
    }
  }

  const message = error instanceof Error ? error.message : "An unexpected server error occurred";
  return apiError("INTERNAL_SERVER_ERROR", message, 500);
}
