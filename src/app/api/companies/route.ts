import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser, getOwnershipFilter, checkUserExists } from "@/features/auth/server/permissions";
import { companySchema } from "@/features/companies/schemas/company";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = req.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const q = searchParams.get("q")?.trim() || "";
    const industry = searchParams.get("industry")?.trim() || "";
    const ownerIdParam = searchParams.get("ownerId")?.trim();
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Ownership scoping
    const ownerFilter = getOwnershipFilter(user);

    const where: Prisma.CompanyWhereInput = {
      ...ownerFilter,
      ...(user.role === "ADMIN" && ownerIdParam ? { ownerId: ownerIdParam } : {}),
      ...(industry ? { industry: { equals: industry, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { industry: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const allowedSortFields = ["name", "industry", "city", "createdAt", "updatedAt"];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [items, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { contacts: true, deals: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    return apiSuccess({
      data: items,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
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
    const body = await req.json();
    const validated = companySchema.parse(body);

    // If SALES_REP, force ownerId to be currentUser.id
    const ownerId = user.role === "ADMIN" && validated.ownerId ? validated.ownerId : user.id;
    if (ownerId !== user.id) {
      const ownerError = await checkUserExists(ownerId, "ownerId");
      if (ownerError) return ownerError;
    }

    const company = await prisma.company.create({
      data: {
        name: validated.name.trim(),
        industry: validated.industry.trim(),
        website: validated.website?.trim() || null,
        city: validated.city.trim(),
        phone: validated.phone?.trim() || null,
        ownerId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return apiSuccess(company, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
