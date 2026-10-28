import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/features/auth/server/permissions";
import { buildContactWhere, CONTACT_SORT_FIELDS } from "@/features/contacts/server/queries";
import { handleApiError } from "@/lib/api-response";
import { parseListParams } from "@/lib/pagination";
import { csvResponse, EXPORT_ROW_LIMIT, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/export — CSV of every contact matching the same filters as the list
 * (q, status, source, ownerId, companyId, sortBy, sortOrder), scoped to the user's permissions.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const params = req.nextUrl.searchParams;
    const { q, sortBy, sortOrder } = parseListParams(params, CONTACT_SORT_FIELDS, "createdAt", "desc");
    const where = buildContactWhere(user, params, q);

    const [rows, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        take: EXPORT_ROW_LIMIT,
        orderBy: [{ [sortBy]: sortOrder }, { id: "asc" }],
        include: {
          company: { select: { name: true } },
          owner: { select: { name: true } },
          _count: { select: { deals: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    const csv = toCsv(
      ["First name", "Last name", "Email", "Phone", "Job title", "Company", "Status", "Source", "Owner", "Deals", "Created"],
      rows.map((c) => [
        c.firstName,
        c.lastName,
        c.email,
        c.phone,
        c.jobTitle,
        c.company?.name,
        c.status,
        c.source,
        c.owner.name,
        c._count.deals,
        c.createdAt,
      ])
    );
    return csvResponse(csv, "contacts", total, rows.length);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
