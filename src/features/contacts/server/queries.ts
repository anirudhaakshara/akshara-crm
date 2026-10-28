import { ContactSource, ContactStatus, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/features/auth/server/permissions";
import { enumParam } from "@/lib/pagination";

export const CONTACT_SORT_FIELDS = ["firstName", "lastName", "email", "status", "source", "createdAt"] as const;

/**
 * Contact list/export where-clause from URL params, always scoped to the user's ownership.
 */
export function buildContactWhere(
  user: AuthenticatedUser,
  searchParams: URLSearchParams,
  q: string
): Prisma.ContactWhereInput {
  const status = enumParam(searchParams.get("status"), Object.values(ContactStatus));
  const source = enumParam(searchParams.get("source"), Object.values(ContactSource));
  const ownerIdParam = searchParams.get("ownerId")?.trim();
  const companyId = searchParams.get("companyId")?.trim();

  return {
    AND: [
      user.role === "ADMIN" ? (ownerIdParam ? { ownerId: ownerIdParam } : {}) : { ownerId: user.id },
      status ? { status } : {},
      source ? { source } : {},
      companyId ? { companyId } : {},
      q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { jobTitle: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };
}
