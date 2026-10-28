import { DealStage, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/features/auth/server/permissions";
import { enumParam } from "@/lib/pagination";

export const dealListInclude = {
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.DealInclude;

/**
 * Builds the Prisma where clause for deal list/board queries from URL params,
 * always scoped to the user's ownership.
 */
export function buildDealWhere(
  user: AuthenticatedUser,
  searchParams: URLSearchParams,
  q: string
): Prisma.DealWhereInput {
  const stages = (searchParams.get("stage") || "")
    .split(",")
    .map((s) => enumParam(s.trim(), Object.values(DealStage)))
    .filter((s): s is DealStage => !!s);
  const ownerIdParam = searchParams.get("ownerId")?.trim();
  const contactId = searchParams.get("contactId")?.trim();
  const companyId = searchParams.get("companyId")?.trim();
  const status = searchParams.get("status"); // "open" | "closed"

  return {
    AND: [
      user.role === "ADMIN" ? (ownerIdParam ? { ownerId: ownerIdParam } : {}) : { ownerId: user.id },
      stages.length ? { stage: { in: stages } } : {},
      status === "open" ? { stage: { notIn: [DealStage.WON, DealStage.LOST] } } : {},
      status === "closed" ? { stage: { in: [DealStage.WON, DealStage.LOST] } } : {},
      contactId ? { contactId } : {},
      companyId ? { companyId } : {},
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { company: { name: { contains: q, mode: "insensitive" } } },
              { contact: { firstName: { contains: q, mode: "insensitive" } } },
              { contact: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };
}

/**
 * closedAt / lostReason bookkeeping when a deal's stage changes.
 * - Entering WON or LOST stamps closedAt (if it was not already closed).
 * - Moving back to an open stage clears closedAt and lostReason.
 * - WON clears any stale lostReason.
 */
export function stageTransitionData(
  previousStage: DealStage | null,
  nextStage: DealStage,
  lostReason: string | null | undefined,
  previousClosedAt: Date | null
): { stage: DealStage; closedAt: Date | null; lostReason: string | null } {
  const wasClosed = previousStage === DealStage.WON || previousStage === DealStage.LOST;
  if (nextStage === DealStage.WON) {
    return {
      stage: nextStage,
      closedAt: wasClosed && previousStage === nextStage && previousClosedAt ? previousClosedAt : new Date(),
      lostReason: null,
    };
  }
  if (nextStage === DealStage.LOST) {
    return {
      stage: nextStage,
      closedAt: wasClosed && previousStage === nextStage && previousClosedAt ? previousClosedAt : new Date(),
      lostReason: lostReason?.trim() || null,
    };
  }
  return { stage: nextStage, closedAt: null, lostReason: null };
}
