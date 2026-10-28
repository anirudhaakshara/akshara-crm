import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/features/auth/server/permissions";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const PER_TYPE = 5;

/**
 * GET /api/search?q= — global search across companies, contacts and deals (top 5 of each),
 * scoped to records the user may see. Queries shorter than 2 characters return nothing.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
    if (q.length < 2) return apiSuccess({ q, companies: [], contacts: [], deals: [] });

    const own = user.role === "ADMIN" ? {} : { ownerId: user.id };
    const contains = { contains: q, mode: Prisma.QueryMode.insensitive };
    // "Ananya Iyer" should match first + last name.
    const [first, ...rest] = q.split(/\s+/);
    const last = rest.join(" ");

    const [companies, contacts, deals] = await Promise.all([
      prisma.company.findMany({
        where: { ...own, OR: [{ name: contains }, { city: contains }, { industry: contains }] },
        take: PER_TYPE,
        orderBy: { name: "asc" },
        select: { id: true, name: true, city: true, industry: true },
      }),
      prisma.contact.findMany({
        where: {
          ...own,
          OR: [
            { firstName: contains },
            { lastName: contains },
            { email: contains },
            { phone: contains },
            ...(last
              ? [{ AND: [{ firstName: { contains: first, mode: Prisma.QueryMode.insensitive } }, { lastName: { contains: last, mode: Prisma.QueryMode.insensitive } }] }]
              : []),
          ],
        },
        take: PER_TYPE,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true, email: true, company: { select: { name: true } } },
      }),
      prisma.deal.findMany({
        where: { ...own, OR: [{ title: contains }, { company: { name: contains } }] },
        take: PER_TYPE,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, value: true, stage: true, company: { select: { name: true } } },
      }),
    ]);

    return apiSuccess({ q, companies, contacts, deals });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return handleApiError(error);
  }
}
