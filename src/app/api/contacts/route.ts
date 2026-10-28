import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  getOwnershipFilter,
  checkLinkedAccess,
  checkUserExists,
} from "@/features/auth/server/permissions";
import { contactSchema } from "@/features/contacts/schemas/contact";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ContactStatus, ContactSource, Prisma } from "@prisma/client";
import { enumParam } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = req.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const q = searchParams.get("q")?.trim() || "";
    const status = enumParam(searchParams.get("status"), Object.values(ContactStatus));
    const source = enumParam(searchParams.get("source"), Object.values(ContactSource));
    const ownerIdParam = searchParams.get("ownerId")?.trim();
    const companyId = searchParams.get("companyId")?.trim();
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const ownerFilter = getOwnershipFilter(user);

    const where: Prisma.ContactWhereInput = {
      ...ownerFilter,
      ...(user.role === "ADMIN" && ownerIdParam ? { ownerId: ownerIdParam } : {}),
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(companyId ? { companyId } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { jobTitle: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const allowedSortFields = ["firstName", "lastName", "email", "status", "source", "createdAt"];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        include: {
          company: { select: { id: true, name: true, city: true } },
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { deals: true, activities: true, tasks: true } },
        },
      }),
      prisma.contact.count({ where }),
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
    const validated = contactSchema.parse(body);

    const ownerId = user.role === "ADMIN" && validated.ownerId ? validated.ownerId : user.id;

    const linkError = await checkLinkedAccess(user, { companyId: validated.companyId });
    if (linkError) return linkError;
    if (ownerId !== user.id) {
      const ownerError = await checkUserExists(ownerId, "ownerId");
      if (ownerError) return ownerError;
    }

    const contact = await prisma.contact.create({
      data: {
        firstName: validated.firstName.trim(),
        lastName: validated.lastName.trim(),
        email: validated.email.trim().toLowerCase(),
        phone: validated.phone?.trim() || null,
        jobTitle: validated.jobTitle?.trim() || null,
        companyId: validated.companyId || null,
        ownerId,
        status: validated.status,
        source: validated.source,
      },
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return apiSuccess(contact, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
