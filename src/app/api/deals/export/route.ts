import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/features/auth/server/permissions";
import { buildDealWhere } from "@/features/deals/server/queries";
import { handleApiError } from "@/lib/api-response";
import { parseListParams } from "@/lib/pagination";
import { csvResponse, EXPORT_ROW_LIMIT, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["title", "value", "stage", "expectedCloseDate", "closedAt", "createdAt", "updatedAt", "winProbability"] as const;

/**
 * GET /api/deals/export — CSV of every deal matching the list filters
 * (q, stage, status, ownerId, contactId, companyId, sortBy, sortOrder), scoped to the user's permissions.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const params = req.nextUrl.searchParams;
    const { q, sortBy, sortOrder } = parseListParams(params, SORT_FIELDS, "createdAt", "desc");
    const where = buildDealWhere(user, params, q);

    const [rows, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        take: EXPORT_ROW_LIMIT,
        orderBy:
          sortBy === "winProbability"
            ? [{ winProbability: { sort: sortOrder, nulls: "last" } }, { id: "asc" }]
            : [{ [sortBy]: sortOrder }, { id: "asc" }],
        include: {
          contact: { select: { firstName: true, lastName: true } },
          company: { select: { name: true } },
          owner: { select: { name: true } },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    const csv = toCsv(
      [
        "Title",
        "Value (INR)",
        "Stage",
        "Win probability (%)",
        "Expected close",
        "Closed",
        "Lost reason",
        "Contact",
        "Company",
        "Owner",
        "Created",
      ],
      rows.map((d) => [
        d.title,
        Number(d.value),
        d.stage,
        d.winProbability === null ? null : Math.round(d.winProbability * 1000) / 10,
        d.expectedCloseDate,
        d.closedAt,
        d.lostReason,
        `${d.contact.firstName} ${d.contact.lastName}`,
        d.company?.name,
        d.owner.name,
        d.createdAt,
      ])
    );
    return csvResponse(csv, "deals", total, rows.length);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
