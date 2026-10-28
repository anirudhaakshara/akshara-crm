import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireUser,
  checkLinkedAccess,
  checkUserExists,
} from "@/features/auth/server/permissions";
import { contactSchema } from "@/features/contacts/schemas/contact";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { paginationMeta, parseListParams } from "@/lib/pagination";
import { buildContactWhere, CONTACT_SORT_FIELDS } from "@/features/contacts/server/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = req.nextUrl.searchParams;

    const { page, limit, skip, q, sortBy, sortOrder } = parseListParams(
      searchParams,
      CONTACT_SORT_FIELDS,
      "createdAt",
      "desc"
    );
    const where = buildContactWhere(user, searchParams, q);
    const orderByField = sortBy;

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ [orderByField]: sortOrder }, { id: "asc" }],
        include: {
          company: { select: { id: true, name: true, city: true } },
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { deals: true, activities: true, tasks: true } },
        },
      }),
      prisma.contact.count({ where }),
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
